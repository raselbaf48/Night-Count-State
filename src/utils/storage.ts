import { Airman, DayState, DisposalRecord, PreparedByInfo, UnitRowState, UnitSummarizedRow } from '../types/nightCount';
import {
  INITIAL_DAY_STATE,
  INITIAL_AIRMEN_155,
  INITIAL_DISPOSALS,
  INITIAL_PREPARED_BY,
  FLYING_WING_SQUADRONS,
  createBlankUnitRow,
} from '../data/initialData';

export function getUnitAirmen(dayState: DayState, unitName: string): Airman[] {
  if (unitName === '155 UASU BAF') {
    return dayState.airmen155;
  }
  return dayState.unitAirmen?.[unitName] || [];
}

export function setUnitAirmen(dayState: DayState, unitName: string, airmen: Airman[]): DayState {
  if (unitName === '155 UASU BAF') {
    return { ...dayState, airmen155: airmen };
  }
  return {
    ...dayState,
    unitAirmen: {
      ...(dayState.unitAirmen || {}),
      [unitName]: airmen,
    },
  };
}

export function getUnitRemarks(dayState: DayState, unitName: string): string {
  if (unitName === '155 UASU BAF') {
    return dayState.customRemarks || '';
  }
  return dayState.unitRemarks?.[unitName] || '';
}

export function setUnitRemarks(dayState: DayState, unitName: string, remarks: string): DayState {
  if (unitName === '155 UASU BAF') {
    return { ...dayState, customRemarks: remarks };
  }
  return {
    ...dayState,
    unitRemarks: {
      ...(dayState.unitRemarks || {}),
      [unitName]: remarks,
    },
  };
}

const STORAGE_PREFIX = 'night_count_state_';
const CUSTOM_DISPOSALS_KEY = 'night_count_saved_custom_disposals';
const HIDDEN_QUICK_EDIT_DISPOSALS_KEY = 'night_count_hidden_quick_edit_disposals';
const PREPARED_BY_KEY = 'night_count_prepared_by';

export function loadSavedPreparedBy(): PreparedByInfo | null {
  try {
    const raw = localStorage.getItem(PREPARED_BY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && typeof parsed.name === 'string') {
        return parsed as PreparedByInfo;
      }
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function savePreparedByStorage(info: PreparedByInfo): void {
  try {
    localStorage.setItem(PREPARED_BY_KEY, JSON.stringify(info));
  } catch {
    // ignore storage errors
  }
}

export function loadHiddenQuickEditDisposals(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_QUICK_EDIT_DISPOSALS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
      }
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

export function saveHiddenQuickEditDisposals(list: string[]): void {
  try {
    const unique = Array.from(new Set(list.map((s) => s.trim()).filter(Boolean)));
    localStorage.setItem(HIDDEN_QUICK_EDIT_DISPOSALS_KEY, JSON.stringify(unique));
  } catch {
    // ignore storage errors
  }
}

export function loadSavedCustomDisposals(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_DISPOSALS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
      }
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

export function saveCustomDisposalsList(list: string[]): void {
  try {
    const unique: string[] = [];
    const seen = new Set<string>();
    list.forEach((item) => {
      const trimmed = item.trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase());
        unique.push(trimmed);
      }
    });
    localStorage.setItem(CUSTOM_DISPOSALS_KEY, JSON.stringify(unique));
  } catch {
    // ignore storage errors
  }
}

export function formatDateToMilitary(dateStr: string): string {
  // Input: "2026-11-11" -> "11 Nov 26"
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(month, 10) - 1;
    const shortYear = year.slice(-2);
    return `${parseInt(day, 10)} ${months[monthIndex] || month} ${shortYear}`;
  } catch {
    return dateStr;
  }
}

export function parseMilitaryDate(militaryStr: string): string {
  // Try to parse "11 Nov 26" -> "2026-11-11"
  try {
    const parts = militaryStr.trim().split(/\s+/);
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const months: Record<string, string> = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
      };
      const month = months[parts[1]] || '11';
      const year = `20${parts[2]}`;
      return `${year}-${month}-${day}`;
    }
  } catch {
    // fallback
  }
  return '2026-11-11';
}

export function shiftDate(dateIso: string, offsetDays: number): string {
  try {
    const d = new Date(dateIso + 'T00:00:00');
    d.setDate(d.getDate() + offsetDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return dateIso;
  }
}

function normalizeAndMigrateParsedState(parsed: any): DayState {
  const hasFullNames =
    Array.isArray(parsed.airmen155) &&
    parsed.airmen155.some(
      (a: any) =>
        typeof a?.name === 'string' &&
        (a.name.includes('Md ') || a.name.includes('Hossen') || a.name.includes('Islam'))
    );

  if (
    !Array.isArray(parsed.airmen155) ||
    (parsed.rosterVersion !== 2 &&
      parsed.rosterVersion !== 3 &&
      parsed.rosterVersion !== 4 &&
      parsed.rosterVersion !== 5 &&
      parsed.rosterVersion !== 6 &&
      parsed.rosterVersion !== 7 &&
      hasFullNames)
  ) {
    parsed.airmen155 = INITIAL_AIRMEN_155;
    parsed.disposals = INITIAL_DISPOSALS;
    parsed.preparedBy = INITIAL_PREPARED_BY;
  } else if ((parsed.rosterVersion || 0) < 7) {
    const legacyMap: Record<string, string> = {
      Canteen: 'Office Duty',
      Bakery: 'Office Duty',
      'Base Security (GD)': 'GD',
      'GD/TF/Airfield Duty': 'GD',
      TF: 'BTF',
      'Airfield Duty': 'Airfield',
      'CMH/ BNS/ BSH/Qmt': 'CMH',
      'AWOL/Detention': 'AWOL',
      'ED/EX PPGF': 'ED',
      'U/C, U/Board': 'U/C',
      'Aft/Ni flg/Ni Duty': 'Ni Duty',
      'TDY (Air HQ)': 'TDY',
      'TDY (HSIA)': 'TDY',
      'TDY (Air Hq)': 'TDY',
      'Tdy (HSIA)': 'TDY',
    };
    const removedSet = new Set([
      'Att (SAIA)',
      'Games',
      'Guard of Honor',
      'Games /Guard of Honor',
      'Class',
      'Exam',
      'Class/Exam',
    ]);
    const isLegacyTdy = (val?: string) => {
      if (!val) return false;
      const lower = val.trim().toLowerCase();
      return lower === 'tdy (air hq)' || lower === 'tdy (hsia)';
    };

    if (Array.isArray(parsed.disposals)) {
      parsed.disposals = parsed.disposals
        .filter((d: any) => !removedSet.has(d.detail) && !removedSet.has(d.displayCategory))
        .map((d: any) => {
          const mapped =
            legacyMap[d.detail] ||
            legacyMap[d.displayCategory] ||
            (isLegacyTdy(d.detail) || isLegacyTdy(d.displayCategory) ? 'TDY' : undefined);
          let next = mapped ? { ...d, detail: mapped, displayCategory: mapped } : { ...d };
          if (
            next.category === 'canteen' ||
            next.category === 'other' ||
            (next.detail || next.displayCategory || '').trim().toLowerCase() === 'office duty'
          ) {
            next = {
              ...next,
              category: 'officeDuty',
              displayCategory: 'Office Duty',
              detail: 'Office Duty',
            };
          }
          return next;
        });
    }

    const migrateAirmenList = (list: any[]) =>
      list.map((a: any) => {
        if (a.currentDuty && removedSet.has(a.currentDuty)) {
          return { ...a, status: 'on_parade', currentDuty: undefined };
        }
        if (a.currentDuty && (legacyMap[a.currentDuty] || isLegacyTdy(a.currentDuty))) {
          return { ...a, currentDuty: legacyMap[a.currentDuty] || 'TDY' };
        }
        return a;
      });

    if (Array.isArray(parsed.airmen155)) {
      parsed.airmen155 = migrateAirmenList(parsed.airmen155);
    }

    if (parsed.unitAirmen && typeof parsed.unitAirmen === 'object') {
      Object.keys(parsed.unitAirmen).forEach((u) => {
        if (Array.isArray(parsed.unitAirmen[u])) {
          parsed.unitAirmen[u] = migrateAirmenList(parsed.unitAirmen[u]);
        }
      });
    }

    if (Array.isArray(parsed.consolidatedUnits)) {
      parsed.consolidatedUnits = parsed.consolidatedUnits.map((u: any) => {
        if (u?.disposalCounts && typeof u.disposalCounts === 'object') {
          const counts = { ...u.disposalCounts };
          const combinedTdy =
            (Number(counts['TDY']) || 0) +
            (Number(counts['TDY (Air HQ)']) || 0) +
            (Number(counts['TDY (HSIA)']) || 0);
          delete counts['TDY (Air HQ)'];
          delete counts['TDY (HSIA)'];
          counts['TDY'] = combinedTdy;
          return { ...u, disposalCounts: counts };
        }
        return u;
      });
    }
  }

  const savedCustom = loadSavedCustomDisposals();
  const dayCustom: string[] = Array.isArray(parsed.disposals)
    ? parsed.disposals
        .filter((d: any) => d.category === 'custom')
        .map((d: any) => String(d.detail || d.displayCategory || '').trim())
        .filter(Boolean)
    : [];
  const mergedCustom = Array.from(
    new Set([
      ...savedCustom,
      ...(Array.isArray(parsed.savedCustomDisposals) ? parsed.savedCustomDisposals : []),
      ...dayCustom,
    ])
  );
  if (mergedCustom.length > savedCustom.length) {
    saveCustomDisposalsList(mergedCustom);
  }

  const savedPreparedBy = loadSavedPreparedBy();
  if (savedPreparedBy) {
    parsed.preparedBy = savedPreparedBy;
  } else if (
    !parsed.preparedBy ||
    (parsed.preparedBy.name === 'Rasel' &&
      parsed.preparedBy.rank === 'LAC' &&
      parsed.preparedBy.bdNo === '474455')
  ) {
    parsed.preparedBy = { ...INITIAL_PREPARED_BY };
  }

  parsed.savedCustomDisposals = mergedCustom;
  parsed.rosterVersion = 7;
  return parsed;
}

function getAllSavedDatesFromStorage(): string[] {
  const dates: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        const datePart = key.slice(STORAGE_PREFIX.length);
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
          dates.push(datePart);
        }
      }
    }
  } catch {
    // ignore storage errors
  }
  return dates.sort();
}

export function loadDayState(dateIso: string, fallbackSource?: DayState): DayState {
  try {
    const savedPreparedBy = loadSavedPreparedBy();
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${dateIso}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const normalized = normalizeAndMigrateParsedState(parsed);
      return savedPreparedBy ? { ...normalized, preparedBy: savedPreparedBy } : normalized;
    }

    // Inherit previous day's roster & disposals when opening a new date
    const savedDates = getAllSavedDatesFromStorage();
    const priorDates = savedDates.filter((d) => d < dateIso);
    const sourceDate =
      priorDates.length > 0
        ? priorDates[priorDates.length - 1]
        : savedDates.length > 0
        ? savedDates[savedDates.length - 1]
        : null;

    if (sourceDate) {
      const sourceRaw = localStorage.getItem(`${STORAGE_PREFIX}${sourceDate}`);
      if (sourceRaw) {
        const migratedSource = normalizeAndMigrateParsedState(JSON.parse(sourceRaw));
        const inherited: DayState = {
          ...migratedSource,
          date: dateIso,
          formattedDisplayDate: formatDateToMilitary(dateIso),
          preparedBy: savedPreparedBy || migratedSource.preparedBy || { ...INITIAL_PREPARED_BY },
          disposals: migratedSource.disposals.map((d) => ({ ...d, date: dateIso })),
          savedCustomDisposals: loadSavedCustomDisposals().length
            ? loadSavedCustomDisposals()
            : migratedSource.savedCustomDisposals || [],
          rosterVersion: 7,
        };
        inherited.consolidatedUnits = syncConsolidated155Row(
          inherited.consolidatedUnits,
          inherited
        );
        return inherited;
      }
    }

    if (fallbackSource) {
      const inherited: DayState = {
        ...fallbackSource,
        date: dateIso,
        formattedDisplayDate: formatDateToMilitary(dateIso),
        preparedBy: savedPreparedBy || fallbackSource.preparedBy || { ...INITIAL_PREPARED_BY },
        disposals: fallbackSource.disposals.map((d) => ({ ...d, date: dateIso })),
        savedCustomDisposals: loadSavedCustomDisposals().length
          ? loadSavedCustomDisposals()
          : fallbackSource.savedCustomDisposals || [],
        rosterVersion: 7,
      };
      inherited.consolidatedUnits = syncConsolidated155Row(
        inherited.consolidatedUnits,
        inherited
      );
      return inherited;
    }
  } catch (err) {
    console.error('Failed to load day state from storage:', err);
  }
  // Return default state with this date
  const savedPreparedBy = loadSavedPreparedBy();
  return {
    ...INITIAL_DAY_STATE,
    date: dateIso,
    formattedDisplayDate: formatDateToMilitary(dateIso),
    preparedBy: savedPreparedBy || INITIAL_DAY_STATE.preparedBy,
    savedCustomDisposals: loadSavedCustomDisposals(),
    rosterVersion: 7,
  };
}

export function saveDayState(state: DayState): void {
  try {
    const customList = state.savedCustomDisposals ?? loadSavedCustomDisposals();
    saveCustomDisposalsList(customList);
    const stateToSave = { ...state, savedCustomDisposals: customList, rosterVersion: 7 };
    localStorage.setItem(`${STORAGE_PREFIX}${state.date}`, JSON.stringify(stateToSave));
    // Also track in history dates list
    const historyRaw = localStorage.getItem('night_count_history_dates');
    const historyList: string[] = historyRaw ? JSON.parse(historyRaw) : [];
    if (!historyList.includes(state.date)) {
      historyList.push(state.date);
      historyList.sort().reverse();
      localStorage.setItem('night_count_history_dates', JSON.stringify(historyList));
    }
  } catch (err) {
    console.error('Failed to save day state to storage:', err);
  }
}

export function getHistoryDates(): string[] {
  try {
    const historyRaw = localStorage.getItem('night_count_history_dates');
    const list: string[] = historyRaw ? JSON.parse(historyRaw) : ['2026-11-11'];
    if (!list.includes('2026-11-11')) {
      list.push('2026-11-11');
    }
    return list.sort().reverse();
  } catch {
    return ['2026-11-11'];
  }
}

export function calculateUnitSummarizedRow(
  dayState: DayState,
  unitName: string
): UnitSummarizedRow {
  const airmen = getUnitAirmen(dayState, unitName);
  const disposals = dayState.disposals.filter((d) => d.unit === unitName);

  const totalStr = airmen.length;
  // Det/Tdy are those with detTdy category
  const detTdyCount = disposals.filter((d) => d.category === 'detTdy').length;
  const effStr = Math.max(0, totalStr - detTdyCount);

  // Group disposals
  let leave = 0;
  let course = 0;
  let awolDetention = 0;
  let sickReport = 0;
  let edExPpgf = 0;
  let cmhBnsBshQmt = 0;
  let ucUBoard = 0;
  let officeDuty = 0;
  let aftNiFlgNiDuty = 0;
  let gdTfAirfieldDuty = 0;
  let driving = 0;
  const customDisposals: Record<string, number> = {};
  const savedCustom = dayState.savedCustomDisposals ?? loadSavedCustomDisposals();
  savedCustom.forEach((name) => {
    const trimmed = name.trim();
    if (trimmed) {
      customDisposals[trimmed] = 0;
    }
  });

  disposals.forEach((d) => {
    switch (d.category) {
      case 'leave':
        leave++;
        break;
      case 'course':
        course++;
        break;
      case 'awol':
        awolDetention++;
        break;
      case 'sickReport':
        sickReport++;
        break;
      case 'edExPpgf':
        edExPpgf++;
        break;
      case 'cmh':
      case 'quarantine':
        cmhBnsBshQmt++;
        break;
      case 'ucUBoard':
        ucUBoard++;
        break;
      case 'officeDuty':
      case 'canteen':
      case 'other':
        officeDuty++;
        break;
      case 'niDuty':
        aftNiFlgNiDuty++;
        break;
      case 'baseSecurityGd':
      case 'airfieldDuty':
      case 'escort':
        gdTfAirfieldDuty++;
        break;
      case 'driving':
        driving++;
        break;
      case 'custom': {
        const customName = (d.detail || d.displayCategory || 'Custom').trim();
        customDisposals[customName] = (customDisposals[customName] || 0) + 1;
        break;
      }
      default:
        break;
    }
  });

  const customTotal = Object.values(customDisposals).reduce((sum, count) => sum + count, 0);

  const totalOutParade =
    leave +
    course +
    awolDetention +
    sickReport +
    edExPpgf +
    cmhBnsBshQmt +
    ucUBoard +
    officeDuty +
    aftNiFlgNiDuty +
    gdTfAirfieldDuty +
    driving +
    customTotal;

  const onParade = Math.max(0, effStr - totalOutParade);

  return {
    sqnUnit: unitName,
    totalStr,
    detTdy: detTdyCount,
    effStr,
    leave,
    course,
    awolDetention,
    sickReport,
    edExPpgf,
    cmhBnsBshQmt,
    ucUBoard,
    officeDuty,
    aftNiFlgNiDuty,
    gdTfAirfieldDuty,
    driving,
    customDisposals,
    totalOutParade,
    onParade,
    remarks: getUnitRemarks(dayState, unitName),
  };
}

export function calculate155SummarizedRow(
  dayState: DayState
): UnitSummarizedRow {
  return calculateUnitSummarizedRow(dayState, '155 UASU BAF');
}

export function syncConsolidated155Row(
  units: UnitRowState[],
  dayState: DayState
): UnitRowState[] {
  return units.map((u) => {
    const hasNominalRoll = u.sqnUnit === '155 UASU BAF' || getUnitAirmen(dayState, u.sqnUnit).length > 0;
    if (hasNominalRoll) {
      const summarized = calculateUnitSummarizedRow(dayState, u.sqnUnit);
      return {
        ...u,
        totalStr: summarized.totalStr,
        detTdy: summarized.detTdy,
        effStr: summarized.effStr,
        leave: summarized.leave,
        course: summarized.course,
        awol: summarized.awolDetention,
        sickReport: summarized.sickReport,
        ed: summarized.edExPpgf,
        cmh: summarized.cmhBnsBshQmt,
        uc: summarized.ucUBoard,
        officeDuty: summarized.officeDuty,
        canteen: 0,
        bakery: 0,
        niDuty: summarized.aftNiFlgNiDuty,
        baseSecurityGd: summarized.gdTfAirfieldDuty,
        baseTaskforceBtf: 0,
        airfieldDuty: 0,
        driving: summarized.driving,
        totalOutParade: summarized.totalOutParade,
        onParadeForecast: summarized.onParade,
        rmks: summarized.remarks,
      };
    }
    return u;
  });
}

export function calculateWingTotals(units: UnitRowState[]): UnitRowState {
  const total = createBlankUnitRow('Total');

  units.forEach((u) => {
    total.totalStr += u.totalStr || 0;
    total.detTdy += u.detTdy || 0;
    total.effStr += u.effStr || 0;
    total.leave += u.leave || 0;
    total.course += u.course || 0;
    total.classVal += u.classVal || 0;
    total.exam += u.exam || 0;
    total.awol += u.awol || 0;
    total.detention += u.detention || 0;
    total.sickReport += u.sickReport || 0;
    total.ed += u.ed || 0;
    total.exPpgf += u.exPpgf || 0;
    total.cmh += u.cmh || 0;
    total.bns += u.bns || 0;
    total.bsh += u.bsh || 0;
    total.quarantine += u.quarantine || 0;
    total.uc += u.uc || 0;
    total.uBoard += u.uBoard || 0;
    total.officeDuty += u.officeDuty || 0;
    total.aftFlg += u.aftFlg || 0;
    total.niFlg += u.niFlg || 0;
    total.niDuty += u.niDuty || 0;
    total.baseSecurityGd += u.baseSecurityGd || 0;
    total.baseTaskforceBtf += u.baseTaskforceBtf || 0;
    total.airfieldDuty += u.airfieldDuty || 0;
    total.offDuty += u.offDuty || 0;
    total.ko += u.ko || 0;
    total.canteen += u.canteen || 0;
    total.bakery += u.bakery || 0;
    total.driving += u.driving || 0;
    total.ptParadeOnUnit += u.ptParadeOnUnit || 0;
    total.games += u.games || 0;
    total.guardOfHonor += u.guardOfHonor || 0;
    total.totalOutParade += u.totalOutParade || 0;
    total.onParadeForecast += u.onParadeForecast || 0;
  });

  return total;
}

const UI_PREFS_KEY = 'night_count_ui_prefs';

export interface UiPrefs {
  dateIso: string;
  activeTab: string;
  unitSubTab: 'state' | 'nominalRoll';
}

export function loadUiPrefs(): UiPrefs {
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        dateIso: typeof parsed.dateIso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.dateIso)
          ? parsed.dateIso
          : '2026-11-11',
        activeTab: typeof parsed.activeTab === 'string' && parsed.activeTab
          ? parsed.activeTab
          : '155 UASU BAF',
        unitSubTab: parsed.unitSubTab === 'nominalRoll' ? 'nominalRoll' : 'state',
      };
    }
  } catch {
    // ignore
  }
  return {
    dateIso: '2026-11-11',
    activeTab: '155 UASU BAF',
    unitSubTab: 'state',
  };
}

export function saveUiPrefs(prefs: UiPrefs): void {
  try {
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function getFlyingWingSummary(dayState: DayState) {
  const units = dayState.consolidatedUnits;
  const summarized155 = calculateUnitSummarizedRow(dayState, '155 UASU BAF');

  const savedCustomNames = Array.from(
    new Set([
      ...Object.keys(summarized155.customDisposals || {}),
      ...(dayState.savedCustomDisposals ?? loadSavedCustomDisposals()),
      ...units.flatMap((u) => Object.keys(u.customDisposals || {})),
    ])
  ).filter((name) => name.trim().length > 0);

  const rowSummaries: UnitSummarizedRow[] = units.map((row) => {
    const hasNominalRoll =
      row.sqnUnit === '155 UASU BAF' || getUnitAirmen(dayState, row.sqnUnit).length > 0;
    if (hasNominalRoll) {
      const unitSum = calculateUnitSummarizedRow(dayState, row.sqnUnit);
      return {
        sqnUnit: row.sqnUnit,
        totalStr: unitSum.totalStr,
        detTdy: unitSum.detTdy,
        effStr: unitSum.effStr,
        leave: unitSum.leave,
        course: unitSum.course,
        awolDetention: unitSum.awolDetention,
        sickReport: unitSum.sickReport,
        edExPpgf: unitSum.edExPpgf,
        cmhBnsBshQmt: unitSum.cmhBnsBshQmt,
        ucUBoard: unitSum.ucUBoard,
        officeDuty: unitSum.officeDuty,
        aftNiFlgNiDuty: unitSum.aftNiFlgNiDuty,
        gdTfAirfieldDuty: unitSum.gdTfAirfieldDuty,
        driving: unitSum.driving,
        customDisposals: unitSum.customDisposals || {},
        totalOutParade: unitSum.totalOutParade,
        onParade: unitSum.onParade,
        remarks: unitSum.remarks,
      };
    }

    const totalStr = row.totalStr || 0;
    const detTdy = row.detTdy || 0;
    const effStr = Math.max(0, totalStr - detTdy);
    const leave = row.leave || 0;
    const course = row.course || 0;
    const awolDetention = (row.awol || 0) + (row.detention || 0);
    const sickReport = row.sickReport || 0;
    const edExPpgf = (row.ed || 0) + (row.exPpgf || 0);
    const cmhBnsBshQmt =
      (row.cmh || 0) + (row.bns || 0) + (row.bsh || 0) + (row.quarantine || 0);
    const ucUBoard = (row.uc || 0) + (row.uBoard || 0);
    const officeDuty = (row.officeDuty || 0) + (row.canteen || 0) + (row.bakery || 0);
    const aftNiFlgNiDuty = (row.aftFlg || 0) + (row.niFlg || 0) + (row.niDuty || 0);
    const gdTfAirfieldDuty =
      (row.baseSecurityGd || 0) + (row.baseTaskforceBtf || 0) + (row.airfieldDuty || 0);
    const driving = row.driving || 0;

    const customDisposals: Record<string, number> = {};
    let customTotal = 0;
    savedCustomNames.forEach((name) => {
      const val = row.customDisposals?.[name] || 0;
      customDisposals[name] = val;
      customTotal += val;
    });

    const totalOutParade =
      leave +
      course +
      awolDetention +
      sickReport +
      edExPpgf +
      cmhBnsBshQmt +
      ucUBoard +
      officeDuty +
      aftNiFlgNiDuty +
      gdTfAirfieldDuty +
      driving +
      customTotal;

    const onParade = Math.max(0, effStr - totalOutParade);

    return {
      sqnUnit: row.sqnUnit,
      totalStr,
      detTdy,
      effStr,
      leave,
      course,
      awolDetention,
      sickReport,
      edExPpgf,
      cmhBnsBshQmt,
      ucUBoard,
      officeDuty,
      aftNiFlgNiDuty,
      gdTfAirfieldDuty,
      driving,
      customDisposals,
      totalOutParade,
      onParade,
      remarks: row.rmks || '',
    };
  });

  const totals = rowSummaries.reduce(
    (acc, r) => {
      acc.totalStr += r.totalStr;
      acc.detTdy += r.detTdy;
      acc.effStr += r.effStr;
      acc.leave += r.leave;
      acc.course += r.course;
      acc.awolDetention += r.awolDetention;
      acc.sickReport += r.sickReport;
      acc.edExPpgf += r.edExPpgf;
      acc.cmhBnsBshQmt += r.cmhBnsBshQmt;
      acc.ucUBoard += r.ucUBoard;
      acc.officeDuty += r.officeDuty;
      acc.aftNiFlgNiDuty += r.aftNiFlgNiDuty;
      acc.gdTfAirfieldDuty += r.gdTfAirfieldDuty;
      acc.driving += r.driving;
      acc.totalOutParade += r.totalOutParade;
      acc.onParade += r.onParade;
      savedCustomNames.forEach((name) => {
        acc.customDisposals[name] =
          (acc.customDisposals[name] || 0) + (r.customDisposals?.[name] || 0);
      });
      return acc;
    },
    {
      totalStr: 0,
      detTdy: 0,
      effStr: 0,
      leave: 0,
      course: 0,
      awolDetention: 0,
      sickReport: 0,
      edExPpgf: 0,
      cmhBnsBshQmt: 0,
      ucUBoard: 0,
      officeDuty: 0,
      aftNiFlgNiDuty: 0,
      gdTfAirfieldDuty: 0,
      driving: 0,
      customDisposals: {} as Record<string, number>,
      totalOutParade: 0,
      onParade: 0,
    }
  );

  return { units, savedCustomNames, rowSummaries, totals };
}
