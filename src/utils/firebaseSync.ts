import {
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, ensureAnonymousAuth, handleFirestoreError, OperationType } from '../firebase';
import { DayState, PreparedByInfo } from '../types/nightCount';
import { INITIAL_PREPARED_BY } from '../data/initialData';

const DAYS_COLLECTION = 'night_count_days';
const META_COLLECTION = 'night_count_meta';
const SETTINGS_DOC_ID = 'settings';
const INDEX_DOC_ID = 'index';

export interface CloudSettings {
  preparedBy: PreparedByInfo;
  savedCustomDisposals: string[];
  hiddenQuickEditDisposals: string[];
}

export interface CloudBootResult {
  dayState: DayState | null;
  priorCloudDayState: DayState | null;
  settings: CloudSettings | null;
  cloudDates: string[];
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
      if (v !== undefined) {
        out[k] = stripUndefined(v);
      }
    });
    return out as T;
  }
  return value;
}

function clampStr(val: unknown, maxLen: number): string {
  const str = typeof val === 'string' ? val : val == null ? '' : String(val);
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

export function sanitizePreparedBy(info?: Partial<PreparedByInfo> | null): PreparedByInfo {
  const src = info || INITIAL_PREPARED_BY;
  return {
    name: clampStr(src.name, 100),
    rank: clampStr(src.rank, 40),
    trade: clampStr(src.trade, 80),
    bdNo: clampStr(src.bdNo, 20),
    appointment: clampStr(src.appointment, 100),
    signatureDate: clampStr(src.signatureDate, 40),
  };
}

function sanitizeStringArray(arr: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(arr)) return [];
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const item of arr) {
    if (typeof item !== 'string') continue;
    const trimmed = clampStr(item.trim(), maxLen);
    if (trimmed && !seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      unique.push(trimmed);
      if (unique.length >= maxItems) break;
    }
  }
  return unique;
}

export function computeDayFingerprint(state: DayState): string {
  const normalized = {
    date: state.date,
    formattedDisplayDate: state.formattedDisplayDate,
    preparedBy: sanitizePreparedBy(state.preparedBy),
    airmen155: state.airmen155 || [],
    unitAirmen: state.unitAirmen || {},
    disposals: state.disposals || [],
    consolidatedUnits: state.consolidatedUnits || [],
    customRemarks: state.customRemarks || '',
    unitRemarks: state.unitRemarks || {},
    savedCustomDisposals: state.savedCustomDisposals || [],
  };
  return JSON.stringify(stripUndefined(normalized));
}

export function computeSettingsFingerprint(settings: CloudSettings): string {
  return JSON.stringify({
    preparedBy: sanitizePreparedBy(settings.preparedBy),
    savedCustomDisposals: sanitizeStringArray(settings.savedCustomDisposals, 200, 100),
    hiddenQuickEditDisposals: sanitizeStringArray(settings.hiddenQuickEditDisposals, 200, 100),
  });
}

async function getDocPreferServer(pathCollection: string, docId: string) {
  const ref = doc(db, pathCollection, docId);
  try {
    return await getDocFromServer(ref);
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    if (msg.includes('offline') || msg.includes('unavailable') || msg.includes('network')) {
      return await getDoc(ref);
    }
    throw err;
  }
}

export async function downloadDayFromCloud(dateIso: string): Promise<DayState | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return null;
  const path = `${DAYS_COLLECTION}/${dateIso}`;
  try {
    const snap = await getDocPreferServer(DAYS_COLLECTION, dateIso);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      date: data.date,
      formattedDisplayDate: data.formattedDisplayDate,
      preparedBy: sanitizePreparedBy(data.preparedBy),
      airmen155: Array.isArray(data.airmen155) ? data.airmen155 : [],
      unitAirmen: data.unitAirmen && typeof data.unitAirmen === 'object' ? data.unitAirmen : {},
      disposals: Array.isArray(data.disposals) ? data.disposals : [],
      consolidatedUnits: Array.isArray(data.consolidatedUnits) ? data.consolidatedUnits : [],
      customRemarks: typeof data.customRemarks === 'string' ? data.customRemarks : '',
      unitRemarks: data.unitRemarks && typeof data.unitRemarks === 'object' ? data.unitRemarks : {},
      savedCustomDisposals: Array.isArray(data.savedCustomDisposals) ? data.savedCustomDisposals : [],
      rosterVersion: typeof data.rosterVersion === 'number' ? data.rosterVersion : 7,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    if (msg.includes('offline') || msg.includes('unavailable')) {
      return null;
    }
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function downloadFromCloudOnEnter(dateIso: string): Promise<CloudBootResult> {
  let settings: CloudSettings | null = null;
  let cloudDates: string[] = [];
  let dayState: DayState | null = null;
  let priorCloudDayState: DayState | null = null;

  try {
    const [settingsSnap, indexSnap, daySnap] = await Promise.all([
      getDocPreferServer(META_COLLECTION, SETTINGS_DOC_ID),
      getDocPreferServer(META_COLLECTION, INDEX_DOC_ID),
      getDocPreferServer(DAYS_COLLECTION, dateIso),
    ]);

    if (settingsSnap.exists()) {
      const s = settingsSnap.data();
      settings = {
        preparedBy: sanitizePreparedBy(s.preparedBy),
        savedCustomDisposals: sanitizeStringArray(s.savedCustomDisposals, 200, 100),
        hiddenQuickEditDisposals: sanitizeStringArray(s.hiddenQuickEditDisposals, 200, 100),
      };
    }

    if (indexSnap.exists()) {
      const idxData = indexSnap.data();
      if (Array.isArray(idxData.dates)) {
        cloudDates = idxData.dates
          .filter((d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
          .sort();
      }
    }

    if (daySnap.exists()) {
      const data = daySnap.data();
      dayState = {
        date: data.date,
        formattedDisplayDate: data.formattedDisplayDate,
        preparedBy: sanitizePreparedBy(data.preparedBy),
        airmen155: Array.isArray(data.airmen155) ? data.airmen155 : [],
        unitAirmen: data.unitAirmen && typeof data.unitAirmen === 'object' ? data.unitAirmen : {},
        disposals: Array.isArray(data.disposals) ? data.disposals : [],
        consolidatedUnits: Array.isArray(data.consolidatedUnits) ? data.consolidatedUnits : [],
        customRemarks: typeof data.customRemarks === 'string' ? data.customRemarks : '',
        unitRemarks: data.unitRemarks && typeof data.unitRemarks === 'object' ? data.unitRemarks : {},
        savedCustomDisposals: Array.isArray(data.savedCustomDisposals) ? data.savedCustomDisposals : [],
        rosterVersion: typeof data.rosterVersion === 'number' ? data.rosterVersion : 7,
      };
    } else if (cloudDates.length > 0) {
      const priorDates = cloudDates.filter((d) => d < dateIso);
      if (priorDates.length > 0) {
        const latestPrior = priorDates[priorDates.length - 1];
        priorCloudDayState = await downloadDayFromCloud(latestPrior);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    if (msg.includes('offline') || msg.includes('unavailable')) {
      return { dayState: null, priorCloudDayState: null, settings: null, cloudDates: [] };
    }
    handleFirestoreError(err, OperationType.GET, `${DAYS_COLLECTION}/${dateIso}`);
  }

  return { dayState, priorCloudDayState, settings, cloudDates };
}

export async function uploadDayToCloud(dayState: DayState): Promise<void> {
  const user = auth.currentUser ?? (await ensureAnonymousAuth());
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayState.date)) return;

  const dayPath = `${DAYS_COLLECTION}/${dayState.date}`;
  const dayRef = doc(db, DAYS_COLLECTION, dayState.date);

  const sanitizedPayload = stripUndefined({
    date: dayState.date,
    formattedDisplayDate: clampStr(dayState.formattedDisplayDate, 40),
    preparedBy: sanitizePreparedBy(dayState.preparedBy),
    airmen155: (dayState.airmen155 || []).slice(0, 1000),
    unitAirmen: dayState.unitAirmen || {},
    disposals: (dayState.disposals || []).slice(0, 1000),
    consolidatedUnits: (dayState.consolidatedUnits || []).slice(0, 50),
    customRemarks: clampStr(dayState.customRemarks || '', 2000),
    unitRemarks: dayState.unitRemarks || {},
    savedCustomDisposals: sanitizeStringArray(dayState.savedCustomDisposals, 200, 100),
    rosterVersion: 7,
  });

  try {
    const existingSnap = await getDocPreferServer(DAYS_COLLECTION, dayState.date);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data();
      await setDoc(dayRef, {
        ...sanitizedPayload,
        createdAt: existingData.createdAt ?? serverTimestamp(),
        createdBy: existingData.createdBy ?? user.uid,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
    } else {
      await setDoc(dayRef, {
        ...sanitizedPayload,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, dayPath);
  }

  // Update date index only if this date isn't already recorded
  const indexPath = `${META_COLLECTION}/${INDEX_DOC_ID}`;
  const indexRef = doc(db, META_COLLECTION, INDEX_DOC_ID);
  try {
    const indexSnap = await getDocPreferServer(META_COLLECTION, INDEX_DOC_ID);
    if (indexSnap.exists()) {
      const existingData = indexSnap.data();
      const existingDates: string[] = Array.isArray(existingData.dates) ? existingData.dates : [];
      if (!existingDates.includes(dayState.date)) {
        const nextDates = Array.from(new Set([...existingDates, dayState.date])).sort().slice(-500);
        await setDoc(indexRef, {
          dates: nextDates,
          createdAt: existingData.createdAt ?? serverTimestamp(),
          createdBy: existingData.createdBy ?? user.uid,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        });
      }
    } else {
      await setDoc(indexRef, {
        dates: [dayState.date],
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, indexPath);
  }
}

export async function uploadSettingsToCloud(settings: CloudSettings): Promise<void> {
  const user = auth.currentUser ?? (await ensureAnonymousAuth());
  if (!user) {
    throw new Error('AUTH_REQUIRED');
  }

  const settingsPath = `${META_COLLECTION}/${SETTINGS_DOC_ID}`;
  const settingsRef = doc(db, META_COLLECTION, SETTINGS_DOC_ID);
  const payload = {
    preparedBy: sanitizePreparedBy(settings.preparedBy),
    savedCustomDisposals: sanitizeStringArray(settings.savedCustomDisposals, 200, 100),
    hiddenQuickEditDisposals: sanitizeStringArray(settings.hiddenQuickEditDisposals, 200, 100),
  };

  try {
    const existingSnap = await getDocPreferServer(META_COLLECTION, SETTINGS_DOC_ID);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data();
      await setDoc(settingsRef, {
        ...payload,
        createdAt: existingData.createdAt ?? serverTimestamp(),
        createdBy: existingData.createdBy ?? user.uid,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
    } else {
      await setDoc(settingsRef, {
        ...payload,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, settingsPath);
  }
}
