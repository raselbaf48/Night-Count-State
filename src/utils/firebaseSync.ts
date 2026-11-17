import {
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, ensureAnonymousAuth, handleFirestoreError, OperationType } from '../firebase';
import { DayState, LoginHistoryEntry, PreparedByInfo, RolePermissionsConfig, WingConfig } from '../types/nightCount';
import { INITIAL_PREPARED_BY } from '../data/initialData';
import { sanitizeRolePermissionsConfig, sanitizeWingsConfig } from './storage';

const DAYS_COLLECTION = 'night_count_days';
const META_COLLECTION = 'night_count_meta';
const SETTINGS_DOC_ID = 'settings';
const INDEX_DOC_ID = 'index';

export interface CloudSettings {
  preparedBy: PreparedByInfo;
  savedCustomDisposals: string[];
  hiddenQuickEditDisposals: string[];
  recentUserIds?: string[];
  loginHistory?: LoginHistoryEntry[];
  appNotice?: string;
  wings?: WingConfig[];
  rolePermissions?: RolePermissionsConfig;
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
    updateLogs: state.updateLogs || [],
  };
  return JSON.stringify(stripUndefined(normalized));
}

function sanitizeLoginHistory(arr: unknown): LoginHistoryEntry[] {
  if (!Array.isArray(arr)) return [];
  const validModes = new Set(['Portal', 'Auth Box', 'Guest']);
  const result: LoginHistoryEntry[] = [];
  const seen = new Set<string>();
  for (const item of arr) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Partial<LoginHistoryEntry>;
    const id = clampStr(raw.id, 80).trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const mode = validModes.has(String(raw.mode)) ? (raw.mode as LoginHistoryEntry['mode']) : 'Portal';
    result.push({
      id,
      bdNo: clampStr(raw.bdNo, 20),
      rank: clampStr(raw.rank, 40),
      name: clampStr(raw.name, 100),
      trade: clampStr(raw.trade, 80),
      flight: clampStr(raw.flight, 80),
      mode,
      timestamp: clampStr(raw.timestamp, 50),
      displayTime: clampStr(raw.displayTime, 60),
    });
    if (result.length >= 50) break;
  }
  return result;
}

export function computeSettingsFingerprint(settings: CloudSettings): string {
  return JSON.stringify({
    preparedBy: sanitizePreparedBy(settings.preparedBy),
    savedCustomDisposals: sanitizeStringArray(settings.savedCustomDisposals, 200, 100),
    hiddenQuickEditDisposals: sanitizeStringArray(settings.hiddenQuickEditDisposals, 200, 100),
    loginHistory: sanitizeLoginHistory(settings.loginHistory),
    appNotice: clampStr(settings.appNotice ?? '', 500),
    wings: sanitizeWingsConfig(settings.wings),
    rolePermissions: sanitizeRolePermissionsConfig(settings.rolePermissions),
  });
}

function isOfflineOrUnavailableError(err: unknown): boolean {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? String((err as { code?: unknown }).code || '').toLowerCase()
      : '';
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err || '').toLowerCase();
  return (
    code === 'unavailable' ||
    code === 'deadline-exceeded' ||
    code === 'aborted' ||
    msg.includes('failed to get document from server') ||
    msg.includes('client is offline') ||
    msg.includes('offline') ||
    msg.includes('unavailable') ||
    msg.includes('network')
  );
}

async function getDocPreferServer(pathCollection: string, docId: string) {
  const ref = doc(db, pathCollection, docId);
  try {
    return await getDocFromServer(ref);
  } catch (err) {
    if (isOfflineOrUnavailableError(err)) {
      try {
        return await getDoc(ref);
      } catch (cacheErr) {
        if (isOfflineOrUnavailableError(cacheErr)) {
          return null;
        }
        throw cacheErr;
      }
    }
    throw err;
  }
}

function extractCloudTimestamp(data: Record<string, any>): number | undefined {
  if (typeof data.lastUpdatedAt === 'number' && Number.isFinite(data.lastUpdatedAt)) {
    return data.lastUpdatedAt;
  }
  if (data.updatedAt && typeof data.updatedAt.toMillis === 'function') {
    return data.updatedAt.toMillis();
  }
  return undefined;
}

export async function downloadDayFromCloud(dateIso: string): Promise<DayState | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return null;
  const path = `${DAYS_COLLECTION}/${dateIso}`;
  try {
    const snap = await getDocPreferServer(DAYS_COLLECTION, dateIso);
    if (!snap || !snap.exists()) return null;
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
      updateLogs: Array.isArray(data.updateLogs) ? data.updateLogs : [],
      rosterVersion: typeof data.rosterVersion === 'number' ? data.rosterVersion : 7,
      lastUpdatedAt: extractCloudTimestamp(data),
    };
  } catch (err) {
    if (isOfflineOrUnavailableError(err)) {
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

    if (settingsSnap && settingsSnap.exists()) {
      const s = settingsSnap.data();
      settings = {
        preparedBy: sanitizePreparedBy(s.preparedBy),
        savedCustomDisposals: sanitizeStringArray(s.savedCustomDisposals, 200, 100),
        hiddenQuickEditDisposals: sanitizeStringArray(s.hiddenQuickEditDisposals, 200, 100),
        loginHistory: sanitizeLoginHistory(s.loginHistory),
        appNotice: clampStr(s.appNotice ?? '', 500),
        wings: Array.isArray(s.wings) ? sanitizeWingsConfig(s.wings) : undefined,
        rolePermissions:
          s.rolePermissions && typeof s.rolePermissions === 'object'
            ? sanitizeRolePermissionsConfig(s.rolePermissions)
            : undefined,
      };
    }

    if (indexSnap && indexSnap.exists()) {
      const idxData = indexSnap.data();
      if (Array.isArray(idxData.dates)) {
        cloudDates = idxData.dates
          .filter((d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
          .sort();
      }
    }

    if (daySnap && daySnap.exists()) {
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
        updateLogs: Array.isArray(data.updateLogs) ? data.updateLogs : [],
        rosterVersion: typeof data.rosterVersion === 'number' ? data.rosterVersion : 7,
        lastUpdatedAt: extractCloudTimestamp(data),
      };
    }

    if (cloudDates.length > 0) {
      const priorDates = cloudDates.filter((d) => d < dateIso);
      if (priorDates.length > 0) {
        const latestPrior = priorDates[priorDates.length - 1];
        priorCloudDayState = await downloadDayFromCloud(latestPrior);
      }
    }
  } catch (err) {
    if (isOfflineOrUnavailableError(err)) {
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
    updateLogs: (dayState.updateLogs || []).slice(0, 500),
    rosterVersion: 7,
  });

  try {
    const existingSnap = await getDocPreferServer(DAYS_COLLECTION, dayState.date);
    if (!existingSnap) {
      throw new Error('CLOUD_UNAVAILABLE');
    }
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
    if (err instanceof Error && err.message === 'CLOUD_UNAVAILABLE') {
      throw err;
    }
    if (isOfflineOrUnavailableError(err)) {
      throw new Error('CLOUD_UNAVAILABLE');
    }
    handleFirestoreError(err, OperationType.WRITE, dayPath);
  }

  // Update date index only if this date isn't already recorded
  const indexPath = `${META_COLLECTION}/${INDEX_DOC_ID}`;
  const indexRef = doc(db, META_COLLECTION, INDEX_DOC_ID);
  try {
    const indexSnap = await getDocPreferServer(META_COLLECTION, INDEX_DOC_ID);
    if (!indexSnap) {
      return;
    }
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
    if (isOfflineOrUnavailableError(err)) {
      return;
    }
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
  const payload = stripUndefined({
    preparedBy: sanitizePreparedBy(settings.preparedBy),
    savedCustomDisposals: sanitizeStringArray(settings.savedCustomDisposals, 200, 100),
    hiddenQuickEditDisposals: sanitizeStringArray(settings.hiddenQuickEditDisposals, 200, 100),
    loginHistory: sanitizeLoginHistory(settings.loginHistory),
    appNotice: clampStr(settings.appNotice ?? '', 500),
    wings: sanitizeWingsConfig(settings.wings),
    rolePermissions: sanitizeRolePermissionsConfig(settings.rolePermissions),
  });

  try {
    const existingSnap = await getDocPreferServer(META_COLLECTION, SETTINGS_DOC_ID);
    if (!existingSnap) {
      throw new Error('CLOUD_UNAVAILABLE');
    }
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
    if (err instanceof Error && err.message === 'CLOUD_UNAVAILABLE') {
      throw err;
    }
    if (isOfflineOrUnavailableError(err)) {
      throw new Error('CLOUD_UNAVAILABLE');
    }
    handleFirestoreError(err, OperationType.WRITE, settingsPath);
  }
}
