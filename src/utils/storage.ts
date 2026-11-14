import {
  Airman,
  DayState,
  DisposalRecord,
  LoginHistoryEntry,
  OperatorProfile,
  PreparedByInfo,
  RolePermissionKey,
  RolePermissions,
  RolePermissionsConfig,
  StateUpdateLogEntry,
  ThemePreference,
  UnitRowState,
  UnitSummarizedRow,
  UserRole,
  WingConfig,
} from '../types/nightCount';
import {
  INITIAL_DAY_STATE,
  INITIAL_AIRMEN_155,
  INITIAL_DISPOSALS,
  INITIAL_PREPARED_BY,
  FLYING_WING_SQUADRONS,
  DISPOSAL_OPTIONS,
  createBlankUnitRow,
} from '../data/initialData';

const RANK_SENIORITY: Record<string, number> = {
  MWO: 0,
  WO: 1,
  'Flt Sgt': 2,
  Sgt: 3,
  Cpl: 4,
  LAC: 5,
  'AC-1': 6,
  'AC-2': 7,
  AC: 8,
};

export function sortAirmenBySeniority(airmen: Airman[]): Airman[] {
  return [...airmen].sort((a, b) => {
    const rankA = RANK_SENIORITY[a.rank] ?? 99;
    const rankB = RANK_SENIORITY[b.rank] ?? 99;
    if (rankA !== rankB) return rankA - rankB;

    const bdNumA = parseInt((a.bdNo || '').replace(/\D/g, ''), 10);
    const bdNumB = parseInt((b.bdNo || '').replace(/\D/g, ''), 10);
    const hasBdA = !Number.isNaN(bdNumA);
    const hasBdB = !Number.isNaN(bdNumB);

    if (hasBdA && hasBdB && bdNumA !== bdNumB) {
      return bdNumA - bdNumB;
    }
    if (hasBdA !== hasBdB) return hasBdA ? -1 : 1;

    return (a.name || '').localeCompare(b.name || '');
  });
}

export function getUnitAirmen(dayState: DayState, unitName: string): Airman[] {
  if (unitName === '155 UASU BAF') {
    return Array.isArray(dayState?.airmen155) ? dayState.airmen155 : [];
  }
  const list = dayState?.unitAirmen?.[unitName];
  return Array.isArray(list) ? list : [];
}

export function setUnitAirmen(dayState: DayState, unitName: string, airmen: Airman[]): DayState {
  const sorted = sortAirmenBySeniority(airmen);
  if (unitName === '155 UASU BAF') {
    return { ...dayState, airmen155: sorted };
  }
  return {
    ...dayState,
    unitAirmen: {
      ...(dayState.unitAirmen || {}),
      [unitName]: sorted,
    },
  };
}

export function getAllExistingBdUnitMap(dayState: DayState, excludeAirmanId?: string): Map<string, string> {
  const bdMap = new Map<string, string>();
  const addFromList = (list: Airman[] | undefined, unitName: string) => {
    if (!Array.isArray(list)) return;
    for (const a of list) {
      if (!a || (excludeAirmanId && a.id === excludeAirmanId)) continue;
      const bd = (a.bdNo || '').trim();
      if (bd && !bdMap.has(bd)) {
        bdMap.set(bd, unitName);
      }
    }
  };

  addFromList(dayState.airmen155, '155 UASU BAF');
  if (dayState.unitAirmen && typeof dayState.unitAirmen === 'object') {
    for (const [unitName, list] of Object.entries(dayState.unitAirmen)) {
      if (unitName === '155 UASU BAF') continue;
      addFromList(list, unitName);
    }
  }
  return bdMap;
}

export function findExistingBdConflict(
  dayState: DayState,
  bdNo: string,
  excludeAirmanId?: string
): { unit: string; airman: Airman } | null {
  const cleanBd = bdNo.trim();
  if (!cleanBd) return null;

  const checkList = (list: Airman[] | undefined, unitName: string) => {
    if (!Array.isArray(list)) return null;
    const found = list.find(
      (a) => a && (!excludeAirmanId || a.id !== excludeAirmanId) && (a.bdNo || '').trim() === cleanBd
    );
    return found ? { unit: unitName, airman: found } : null;
  };

  const mainConflict = checkList(dayState.airmen155, '155 UASU BAF');
  if (mainConflict) return mainConflict;

  if (dayState.unitAirmen && typeof dayState.unitAirmen === 'object') {
    for (const [unitName, list] of Object.entries(dayState.unitAirmen)) {
      if (unitName === '155 UASU BAF') continue;
      const conflict = checkList(list, unitName);
      if (conflict) return conflict;
    }
  }
  return null;
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
const VERIFIED_OPERATOR_SESSION_KEY = 'night_count_verified_operator';
const GUEST_SESSION_KEY = 'night_count_guest_session';
const RECENT_USER_IDS_KEY = 'night_count_recent_user_ids';
const LOGIN_HISTORY_KEY = 'night_count_login_history';
const APP_NOTICE_KEY = 'night_count_app_notice';
const WINGS_CONFIG_KEY = 'night_count_wings_config';
const THEME_PREF_KEY = 'night_count_theme_preference';
const ROLE_PERMISSIONS_KEY = 'night_count_role_permissions';

export const ALL_PERMISSION_KEYS: RolePermissionKey[] = [
  'viewConsolidatedState',
  'editQuickSqnCount',
  'viewUnitDetails',
  'editUnitDisposals',
  'manageNominalRoll',
  'deleteNominalRollAirman',
  'editPreparedBy',
  'exportPrintReport',
  'viewUpdateLog',
  'accessSettings',
  'manageWingsAndUnits',
  'manageUsers',
  'manageCloudAndNotice',
];

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsConfig = {
  SUPER_ADMIN: {
    viewConsolidatedState: true,
    editQuickSqnCount: true,
    viewUnitDetails: true,
    editUnitDisposals: true,
    manageNominalRoll: true,
    deleteNominalRollAirman: true,
    editPreparedBy: true,
    exportPrintReport: true,
    viewUpdateLog: true,
    accessSettings: true,
    manageWingsAndUnits: true,
    manageUsers: true,
    manageCloudAndNotice: true,
  },
  USER: {
    viewConsolidatedState: true,
    editQuickSqnCount: true,
    viewUnitDetails: true,
    editUnitDisposals: true,
    manageNominalRoll: true,
    deleteNominalRollAirman: false,
    editPreparedBy: true,
    exportPrintReport: true,
    viewUpdateLog: true,
    accessSettings: true,
    manageWingsAndUnits: false,
    manageUsers: false,
    manageCloudAndNotice: false,
  },
  GUEST: {
    viewConsolidatedState: true,
    editQuickSqnCount: false,
    viewUnitDetails: true,
    editUnitDisposals: false,
    manageNominalRoll: false,
    deleteNominalRollAirman: false,
    editPreparedBy: false,
    exportPrintReport: true,
    viewUpdateLog: true,
    accessSettings: false,
    manageWingsAndUnits: false,
    manageUsers: false,
    manageCloudAndNotice: false,
  },
};

function sanitizeRolePermissionMap(
  raw: unknown,
  fallback: RolePermissions
): RolePermissions {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const next = { ...fallback };
  for (const key of ALL_PERMISSION_KEYS) {
    if (typeof src[key] === 'boolean') {
      next[key] = src[key] as boolean;
    }
  }
  return next;
}

export function sanitizeRolePermissionsConfig(raw: unknown): RolePermissionsConfig {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    SUPER_ADMIN: sanitizeRolePermissionMap(src.SUPER_ADMIN, DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN),
    USER: sanitizeRolePermissionMap(src.USER, DEFAULT_ROLE_PERMISSIONS.USER),
    GUEST: sanitizeRolePermissionMap(src.GUEST, DEFAULT_ROLE_PERMISSIONS.GUEST),
  };
}

export function loadRolePermissions(): RolePermissionsConfig {
  try {
    const raw = localStorage.getItem(ROLE_PERMISSIONS_KEY);
    if (raw) {
      return sanitizeRolePermissionsConfig(JSON.parse(raw));
    }
  } catch {
    // ignore storage errors
  }
  return sanitizeRolePermissionsConfig(DEFAULT_ROLE_PERMISSIONS);
}

export function saveRolePermissions(config: RolePermissionsConfig): RolePermissionsConfig {
  const clean = sanitizeRolePermissionsConfig(config);
  try {
    localStorage.setItem(ROLE_PERMISSIONS_KEY, JSON.stringify(clean));
  } catch {
    // ignore storage errors
  }
  return clean;
}

export function getUserRoleByBd(dayState: DayState, bdNo?: string | null): UserRole | 'GUEST' {
  const clean = (bdNo || '').trim();
  if (!clean || clean.toUpperCase() === 'GUEST') return 'GUEST';
  const matched = findAirmanByBd(dayState, clean);
  if (matched?.role) return matched.role;
  if (clean === '474455') return 'OWNER';
  return 'USER';
}

export function hasRolePermission(
  role: UserRole | 'GUEST',
  key: RolePermissionKey,
  config: RolePermissionsConfig
): boolean {
  if (role === 'OWNER') return true;
  return Boolean(config[role]?.[key]);
}

export function loadThemePreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_PREF_KEY);
    if (raw === 'system' || raw === 'light' || raw === 'dark') {
      return raw;
    }
  } catch {
    // ignore storage errors
  }
  return 'dark';
}

export function saveThemePreference(pref: ThemePreference): ThemePreference {
  try {
    localStorage.setItem(THEME_PREF_KEY, pref);
  } catch {
    // ignore storage errors
  }
  return pref;
}

export const DEFAULT_WINGS: WingConfig[] = [
  {
    id: 'flying-wing',
    name: 'Flying Wing',
    shortName: 'FLG WG',
    units: [...FLYING_WING_SQUADRONS],
  },
];

export function sanitizeWingsConfig(raw: unknown): WingConfig[] {
  const defaultWing = DEFAULT_WINGS[0];
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_WINGS.map((w) => ({ ...w, units: [...w.units] }));
  }

  const result: WingConfig[] = [];
  const seenWingIds = new Set<string>();
  const seenWingNames = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Partial<WingConfig>;
    const rawName = typeof obj.name === 'string' ? obj.name.trim().slice(0, 80) : '';
    if (!rawName) continue;
    const nameKey = rawName.toLowerCase();
    if (seenWingNames.has(nameKey)) continue;

    const id =
      typeof obj.id === 'string' && obj.id.trim()
        ? obj.id.trim().slice(0, 60)
        : `wing-${rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || result.length}`;
    if (seenWingIds.has(id)) continue;

    const shortName =
      typeof obj.shortName === 'string' && obj.shortName.trim()
        ? obj.shortName.trim().slice(0, 24).toUpperCase()
        : rawName.slice(0, 12).toUpperCase();

    const cleanUnits: string[] = [];
    const seenUnits = new Set<string>();
    if (Array.isArray(obj.units)) {
      for (const u of obj.units) {
        if (typeof u !== 'string') continue;
        const trimmed = u.trim().slice(0, 60);
        if (trimmed && !seenUnits.has(trimmed.toLowerCase())) {
          seenUnits.add(trimmed.toLowerCase());
          cleanUnits.push(trimmed);
          if (cleanUnits.length >= 50) break;
        }
      }
    }

    // Always ensure core Flying Wing squadrons are preserved inside flying-wing
    if (id === 'flying-wing' || nameKey === 'flying wing') {
      for (const baseUnit of FLYING_WING_SQUADRONS) {
        if (!seenUnits.has(baseUnit.toLowerCase())) {
          seenUnits.add(baseUnit.toLowerCase());
          cleanUnits.push(baseUnit);
        }
      }
    }

    seenWingIds.add(id);
    seenWingNames.add(nameKey);
    result.push({ id, name: rawName, shortName, units: cleanUnits });
    if (result.length >= 30) break;
  }

  if (!seenWingIds.has(defaultWing.id) && !seenWingNames.has(defaultWing.name.toLowerCase())) {
    result.unshift({ ...defaultWing, units: [...defaultWing.units] });
  }

  return result;
}

export function loadWingsConfig(): WingConfig[] {
  try {
    const raw = localStorage.getItem(WINGS_CONFIG_KEY);
    if (raw) {
      return sanitizeWingsConfig(JSON.parse(raw));
    }
  } catch {
    // ignore storage errors
  }
  return sanitizeWingsConfig(DEFAULT_WINGS);
}

export function saveWingsConfig(wings: WingConfig[]): WingConfig[] {
  const clean = sanitizeWingsConfig(wings);
  try {
    localStorage.setItem(WINGS_CONFIG_KEY, JSON.stringify(clean));
  } catch {
    // ignore storage errors
  }
  return clean;
}

export function getAllConfiguredUnits(wings?: WingConfig[]): string[] {
  const list = wings ?? loadWingsConfig();
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const w of list) {
    for (const u of w.units) {
      const trimmed = u.trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase());
        unique.push(trimmed);
      }
    }
  }
  return unique;
}

export function getAllAirmenAcrossUnits(dayState: DayState, wings?: WingConfig[]): Airman[] {
  const unitNames = new Set<string>([
    ...FLYING_WING_SQUADRONS,
    ...getAllConfiguredUnits(wings),
    ...Object.keys(dayState.unitAirmen || {}),
  ]);
  const all: Airman[] = [];
  const seenIds = new Set<string>();
  unitNames.forEach((unitName) => {
    const list = getUnitAirmen(dayState, unitName);
    list.forEach((airman) => {
      if (!seenIds.has(airman.id)) {
        seenIds.add(airman.id);
        all.push({ ...airman, unit: airman.unit || unitName });
      }
    });
  });
  return sortAirmenBySeniority(all);
}

export function ensureDayStateHasConfiguredUnits(
  dayState: DayState,
  wings?: WingConfig[]
): DayState {
  const configured = getAllConfiguredUnits(wings);
  const existing = Array.isArray(dayState.consolidatedUnits) ? dayState.consolidatedUnits : [];
  const existingMap = new Map(existing.map((u) => [u.sqnUnit.toLowerCase(), u]));
  const additions: UnitRowState[] = [];
  for (const unitName of configured) {
    if (!existingMap.has(unitName.toLowerCase())) {
      additions.push(createBlankUnitRow(unitName));
    }
  }
  if (additions.length === 0) return dayState;
  return {
    ...dayState,
    consolidatedUnits: [...existing, ...additions],
  };
}

export function formatLoginTimestamp(date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).toLowerCase();
  return `${day} ${month} ${year}, ${time}`;
}

export function loadLoginHistory(): LoginHistoryEntry[] {
  try {
    const raw = localStorage.getItem(LOGIN_HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((e) => e && typeof e === 'object' && typeof e.id === 'string').slice(0, 50);
      }
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

export function saveLoginHistoryList(entries: LoginHistoryEntry[]): LoginHistoryEntry[] {
  const clean = Array.isArray(entries) ? entries.slice(0, 50) : [];
  try {
    localStorage.setItem(LOGIN_HISTORY_KEY, JSON.stringify(clean));
  } catch {
    // ignore storage errors
  }
  return clean;
}

export function recordLoginHistoryEntry(
  operator: OperatorProfile,
  mode: LoginHistoryEntry['mode']
): LoginHistoryEntry[] {
  const now = new Date();
  const entry: LoginHistoryEntry = {
    id: `login-${now.getTime()}-${Math.random().toString(36).slice(2, 6)}`,
    bdNo: operator.bdNo,
    rank: String(operator.rank || ''),
    name: operator.name,
    trade: operator.trade || '',
    flight: operator.flight || '',
    mode,
    timestamp: now.toISOString(),
    displayTime: formatLoginTimestamp(now),
  };
  const existing = loadLoginHistory();
  return saveLoginHistoryList([entry, ...existing]);
}

export function mergeLoginHistoryLists(
  cloudEntries: unknown,
  localEntries: LoginHistoryEntry[]
): LoginHistoryEntry[] {
  const map = new Map<string, LoginHistoryEntry>();
  const addAll = (list: unknown) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (item && typeof item === 'object' && typeof (item as LoginHistoryEntry).id === 'string') {
        const entry = item as LoginHistoryEntry;
        map.set(entry.id, entry);
      }
    }
  };
  addAll(cloudEntries);
  addAll(localEntries);
  return Array.from(map.values())
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
    .slice(0, 50);
}

export function loadAppNotice(): string {
  try {
    return localStorage.getItem(APP_NOTICE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveAppNoticeStorage(notice: string): string {
  const trimmed = notice.slice(0, 500);
  try {
    localStorage.setItem(APP_NOTICE_KEY, trimmed);
  } catch {
    // ignore storage errors
  }
  return trimmed;
}

export function exportAllNightCountBackup(): string {
  const days: Record<string, DayState> = {};
  for (const dateKey of getAllSavedDatesFromStorage()) {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${dateKey}`);
      if (raw) {
        days[dateKey] = JSON.parse(raw) as DayState;
      }
    } catch {
      // ignore invalid entries
    }
  }
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    days,
    settings: {
      preparedBy: loadSavedPreparedBy(),
      savedCustomDisposals: loadSavedCustomDisposals(),
      hiddenQuickEditDisposals: loadHiddenQuickEditDisposals(),
      recentUserIds: loadRecentUserIds(),
      appNotice: loadAppNotice(),
      wings: loadWingsConfig(),
      rolePermissions: loadRolePermissions(),
    },
  };
  return JSON.stringify(payload, null, 2);
}

export function importNightCountBackup(jsonText: string): { importedDates: number } {
  const parsed = JSON.parse(jsonText);
  if (!parsed || typeof parsed !== 'object' || !parsed.days || typeof parsed.days !== 'object') {
    throw new Error('Invalid Night Count backup file.');
  }
  let count = 0;
  Object.entries(parsed.days as Record<string, unknown>).forEach(([dateIso, rawState]) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateIso) && rawState && typeof rawState === 'object') {
      const normalized = normalizeAndMigrateParsedState(rawState);
      normalized.date = dateIso;
      saveDayState(normalized);
      count += 1;
    }
  });
  if (parsed.settings && typeof parsed.settings === 'object') {
    const s = parsed.settings as Record<string, unknown>;
    if (s.preparedBy && typeof s.preparedBy === 'object') {
      savePreparedByStorage(s.preparedBy as PreparedByInfo);
    }
    if (Array.isArray(s.savedCustomDisposals)) {
      saveCustomDisposalsList(s.savedCustomDisposals as string[]);
    }
    if (Array.isArray(s.hiddenQuickEditDisposals)) {
      saveHiddenQuickEditDisposals(s.hiddenQuickEditDisposals as string[]);
    }
    if (Array.isArray(s.recentUserIds)) {
      saveRecentUserIdsList(s.recentUserIds as string[]);
    }
    if (typeof s.appNotice === 'string') {
      saveAppNoticeStorage(s.appNotice);
    }
    if (Array.isArray(s.wings)) {
      saveWingsConfig(s.wings as WingConfig[]);
    }
    if (s.rolePermissions && typeof s.rolePermissions === 'object') {
      saveRolePermissions(s.rolePermissions as RolePermissionsConfig);
    }
  }
  return { importedDates: count };
}

export function sanitizeRecentUserIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const item of ids) {
    if (typeof item !== 'string') continue;
    const digits = item.replace(/\D/g, '').slice(0, 6);
    if (/^\d{6}$/.test(digits) && !seen.has(digits)) {
      seen.add(digits);
      unique.push(digits);
      if (unique.length >= 3) break;
    }
  }
  return unique;
}

export function loadRecentUserIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_USER_IDS_KEY);
    if (raw) {
      return sanitizeRecentUserIds(JSON.parse(raw));
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

export function saveRecentUserIdsList(ids: string[]): string[] {
  const sanitized = sanitizeRecentUserIds(ids);
  try {
    localStorage.setItem(RECENT_USER_IDS_KEY, JSON.stringify(sanitized));
  } catch {
    // ignore storage errors
  }
  return sanitized;
}

export function recordRecentUserId(bdNo: string): string[] {
  const clean = bdNo.replace(/\D/g, '').slice(0, 6);
  if (!/^\d{6}$/.test(clean)) return loadRecentUserIds();
  const existing = loadRecentUserIds().filter((id) => id !== clean);
  return saveRecentUserIdsList([clean, ...existing]);
}

export function removeRecentUserId(bdNo: string): string[] {
  const clean = bdNo.trim();
  const next = loadRecentUserIds().filter((id) => id !== clean);
  return saveRecentUserIdsList(next);
}

export function mergeRecentUserIds(cloudIds: unknown, localIds: string[]): string[] {
  const cleanCloud = sanitizeRecentUserIds(cloudIds);
  const cleanLocal = sanitizeRecentUserIds(localIds);
  return sanitizeRecentUserIds([...cleanCloud, ...cleanLocal]);
}

export function loadGuestSession(): boolean {
  try {
    return sessionStorage.getItem(GUEST_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveGuestSession(isGuest: boolean): void {
  try {
    if (isGuest) {
      sessionStorage.setItem(GUEST_SESSION_KEY, '1');
    } else {
      sessionStorage.removeItem(GUEST_SESSION_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function clearGuestSession(): void {
  try {
    sessionStorage.removeItem(GUEST_SESSION_KEY);
  } catch {
    // ignore storage errors
  }
}

export function loadVerifiedOperator(): OperatorProfile | null {
  try {
    const raw = sessionStorage.getItem(VERIFIED_OPERATOR_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.bdNo === 'string' &&
        /^\d{6}$/.test(parsed.bdNo.trim()) &&
        typeof parsed.name === 'string' &&
        parsed.name.trim()
      ) {
        return {
          bdNo: parsed.bdNo.trim(),
          rank: String(parsed.rank || ''),
          name: parsed.name.trim(),
          trade: String(parsed.trade || ''),
          flight: String(parsed.flight || ''),
        };
      }
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export function saveVerifiedOperator(operator: OperatorProfile): void {
  try {
    sessionStorage.setItem(VERIFIED_OPERATOR_SESSION_KEY, JSON.stringify(operator));
    sessionStorage.removeItem(GUEST_SESSION_KEY);
  } catch {
    // ignore storage errors
  }
}

export function clearVerifiedOperator(): void {
  try {
    sessionStorage.removeItem(VERIFIED_OPERATOR_SESSION_KEY);
  } catch {
    // ignore storage errors
  }
}

export function findOperatorByBd(dayState: DayState, bdNo: string): OperatorProfile | null {
  const clean = bdNo.trim();
  if (!/^\d{6}$/.test(clean)) return null;
  const searchList = (list: Airman[] | undefined) => {
    if (!Array.isArray(list)) return null;
    const match = list.find((a) => a && (a.bdNo || '').trim() === clean);
    if (!match) return null;
    return {
      bdNo: clean,
      rank: match.rank,
      name: match.name,
      trade: match.trade || '',
      flight: match.flight || '',
    };
  };
  const from155 = searchList(dayState.airmen155);
  if (from155) return from155;
  if (dayState.unitAirmen && typeof dayState.unitAirmen === 'object') {
    for (const list of Object.values(dayState.unitAirmen)) {
      const found = searchList(list);
      if (found) return found;
    }
  }
  if (Array.isArray(dayState.updateLogs)) {
    for (let i = dayState.updateLogs.length - 1; i >= 0; i -= 1) {
      const op = dayState.updateLogs[i]?.operator;
      if (op && op.bdNo?.trim() === clean) {
        return op;
      }
    }
  }
  return null;
}

export function findAirmanByBd(dayState: DayState, bdNo: string): Airman | null {
  const clean = bdNo.trim();
  if (!/^\d{6}$/.test(clean)) return null;
  const from155 = (dayState.airmen155 || []).find((a) => a && (a.bdNo || '').trim() === clean);
  if (from155) return from155;
  if (dayState.unitAirmen && typeof dayState.unitAirmen === 'object') {
    for (const list of Object.values(dayState.unitAirmen)) {
      if (!Array.isArray(list)) continue;
      const found = list.find((a) => a && (a.bdNo || '').trim() === clean);
      if (found) return found;
    }
  }
  return null;
}

export function createStateUpdateLog(
  dateIso: string,
  area: StateUpdateLogEntry['area'],
  unitName: string,
  action: string,
  operator: OperatorProfile
): StateUpdateLogEntry {
  const now = new Date();
  const displayTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return {
    id: `log-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: now.toISOString(),
    displayTime,
    date: dateIso,
    area,
    unitName,
    action,
    operator,
  };
}

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

export function formatDateDayMonth(dateStr: string): string {
  // Input: "2026-11-11" -> "11 Nov"
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(month, 10) - 1;
    return `${parseInt(day, 10)} ${months[monthIndex] || month}`;
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

export function getWeekdayName(dateIso: string): string {
  try {
    if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return '';
    const [y, m, d] = dateIso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString('en-US', { weekday: 'long' });
  } catch {
    return '';
  }
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

function deepCloneDayState(state: DayState): DayState {
  try {
    return JSON.parse(JSON.stringify(state)) as DayState;
  } catch {
    return {
      ...state,
      airmen155: [...(state.airmen155 || [])],
      unitAirmen: { ...(state.unitAirmen || {}) },
      unitRemarks: { ...(state.unitRemarks || {}) },
      disposals: [...(state.disposals || [])],
      consolidatedUnits: [...(state.consolidatedUnits || [])],
      preparedBy: { ...(state.preparedBy || INITIAL_PREPARED_BY) },
    };
  }
}

export function normalizeDayState(parsed: any): DayState {
  return normalizeAndMigrateParsedState(parsed);
}

function normalizeAndMigrateParsedState(parsed: any): DayState {
  if (!parsed || typeof parsed !== 'object') {
    return { ...INITIAL_DAY_STATE };
  }

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

  if (!parsed || typeof parsed !== 'object') {
    return { ...INITIAL_DAY_STATE };
  }

  if (!Array.isArray(parsed.disposals)) {
    parsed.disposals = [];
  } else {
    parsed.disposals = parsed.disposals.filter((d: any) => d && typeof d === 'object');
  }

  if (!Array.isArray(parsed.consolidatedUnits) || parsed.consolidatedUnits.length === 0) {
    parsed.consolidatedUnits = INITIAL_DAY_STATE.consolidatedUnits;
  }

  if (typeof parsed.date !== 'string' || !parsed.date) {
    parsed.date = INITIAL_DAY_STATE.date;
  }
  if (typeof parsed.formattedDisplayDate !== 'string' || !parsed.formattedDisplayDate) {
    parsed.formattedDisplayDate = formatDateToMilitary(parsed.date);
  }

  const seenGlobalBds = new Set<string>();
  const dedupeAndEnsureDefaultOwner = (list: any[]) =>
    list
      .filter((a: any) => {
        if (!a || typeof a !== 'object') return false;
        const bd = typeof a.bdNo === 'string' ? a.bdNo.trim() : '';
        if (!bd) return true;
        if (seenGlobalBds.has(bd)) return false;
        seenGlobalBds.add(bd);
        return true;
      })
      .map((a: any) => {
        const bd = typeof a.bdNo === 'string' ? a.bdNo.trim() : '';
        if (bd === '474455' && !a.role) {
          return { ...a, role: 'OWNER' };
        }
        return a;
      });

  if (Array.isArray(parsed.airmen155)) {
    parsed.airmen155 = sortAirmenBySeniority(dedupeAndEnsureDefaultOwner(parsed.airmen155));
  } else {
    parsed.airmen155 = sortAirmenBySeniority(dedupeAndEnsureDefaultOwner(INITIAL_AIRMEN_155));
  }
  if (parsed.unitAirmen && typeof parsed.unitAirmen === 'object') {
    Object.keys(parsed.unitAirmen).forEach((u) => {
      if (u === '155 UASU BAF') {
        delete parsed.unitAirmen[u];
        return;
      }
      if (Array.isArray(parsed.unitAirmen[u])) {
        parsed.unitAirmen[u] = sortAirmenBySeniority(
          dedupeAndEnsureDefaultOwner(parsed.unitAirmen[u])
        );
      } else {
        parsed.unitAirmen[u] = [];
      }
    });
  } else {
    parsed.unitAirmen = {};
  }

  parsed.savedCustomDisposals = mergedCustom;
  parsed.updateLogs = Array.isArray(parsed.updateLogs)
    ? parsed.updateLogs.filter((entry: any) => entry && typeof entry === 'object' && entry.operator)
    : [];
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

export function isBlankUnitRow(row?: UnitRowState | null): boolean {
  if (!row) return true;
  if (
    (row.totalStr || 0) > 0 ||
    (row.detTdy || 0) > 0 ||
    (row.effStr || 0) > 0 ||
    (row.totalOutParade || 0) > 0 ||
    (row.onParadeForecast || 0) > 0
  ) {
    return false;
  }
  const hasCounts =
    row.disposalCounts &&
    Object.values(row.disposalCounts).some((v) => (Number(v) || 0) > 0);
  if (hasCounts) return false;
  const hasCustom =
    row.customDisposals &&
    Object.values(row.customDisposals).some((v) => (Number(v) || 0) > 0);
  if (hasCustom) return false;
  const trimmedRmks = (row.rmks || '').trim().toLowerCase();
  if (trimmedRmks && trimmedRmks !== 'nil') return false;
  return true;
}

function cloneCarriedUnitRow(priorRow: UnitRowState): UnitRowState {
  try {
    const cloned = JSON.parse(JSON.stringify(priorRow)) as UnitRowState;
    cloned.manuallyEdited = false;
    return cloned;
  } catch {
    return { ...priorRow, manuallyEdited: false };
  }
}

export function carryForwardPriorUnitRows(
  state: DayState,
  fallbackPrior?: DayState | null
): DayState {
  if (!state || !Array.isArray(state.consolidatedUnits)) return state;

  const priorByDate = new Map<string, DayState>();
  const priorDates = getAllSavedDatesFromStorage().filter((d) => d < state.date);
  for (const d of priorDates) {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${d}`);
      if (raw) {
        const parsed = normalizeAndMigrateParsedState(JSON.parse(raw));
        priorByDate.set(d, parsed);
      }
    } catch {
      // ignore invalid storage entries
    }
  }
  if (fallbackPrior && fallbackPrior.date && fallbackPrior.date < state.date) {
    if (!priorByDate.has(fallbackPrior.date)) {
      priorByDate.set(fallbackPrior.date, normalizeAndMigrateParsedState(deepCloneDayState(fallbackPrior)));
    }
  }

  if (priorByDate.size === 0) return state;

  const sortedPriorDays = Array.from(priorByDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, day]) => day);

  let changed = false;
  const nextUnits = state.consolidatedUnits.map((u) => {
    const hasNominalRoll =
      u.sqnUnit === '155 UASU BAF' || getUnitAirmen(state, u.sqnUnit).length > 0;
    if (hasNominalRoll) return u;

    // Never overwrite a row manually edited on this specific date
    if (u.manuallyEdited === true) return u;

    const shouldCarry = u.manuallyEdited === false || isBlankUnitRow(u);
    if (!shouldCarry) return u;

    for (const priorDay of sortedPriorDays) {
      const priorRow = priorDay.consolidatedUnits?.find((p) => p.sqnUnit === u.sqnUnit);
      if (!priorRow) continue;
      if (u.manuallyEdited === false) {
        if (!isBlankUnitRow(priorRow) || priorRow.manuallyEdited === true) {
          changed = true;
          return cloneCarriedUnitRow(priorRow);
        }
      } else if (!isBlankUnitRow(priorRow)) {
        changed = true;
        return cloneCarriedUnitRow(priorRow);
      }
    }
    return u;
  });

  if (!changed) return state;
  return {
    ...state,
    consolidatedUnits: nextUnits,
  };
}

export function loadDayState(dateIso: string, fallbackSource?: DayState): DayState {
  try {
    const savedPreparedBy = loadSavedPreparedBy();
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${dateIso}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const normalized = normalizeAndMigrateParsedState(parsed);
      const withPreparedBy = savedPreparedBy
        ? { ...normalized, preparedBy: savedPreparedBy }
        : normalized;
      return carryForwardPriorUnitRows(withPreparedBy, fallbackSource);
    }

    // Inherit ONLY from the closest prior saved day (< dateIso), never from a future day
    const savedDates = getAllSavedDatesFromStorage();
    const priorDates = savedDates.filter((d) => d < dateIso);
    const sourceDate = priorDates.length > 0 ? priorDates[priorDates.length - 1] : null;

    if (sourceDate) {
      const sourceRaw = localStorage.getItem(`${STORAGE_PREFIX}${sourceDate}`);
      if (sourceRaw) {
        const migratedSource = deepCloneDayState(
          normalizeAndMigrateParsedState(JSON.parse(sourceRaw))
        );
        const inherited: DayState = {
          ...migratedSource,
          date: dateIso,
          formattedDisplayDate: formatDateToMilitary(dateIso),
          preparedBy: savedPreparedBy
            ? { ...savedPreparedBy }
            : { ...(migratedSource.preparedBy || INITIAL_PREPARED_BY) },
          disposals: migratedSource.disposals.map((d) => ({ ...d, date: dateIso })),
          consolidatedUnits: (migratedSource.consolidatedUnits || []).map((u) => ({
            ...u,
            manuallyEdited: false,
          })),
          savedCustomDisposals: loadSavedCustomDisposals().length
            ? loadSavedCustomDisposals()
            : [...(migratedSource.savedCustomDisposals || [])],
          updateLogs: [],
          rosterVersion: 7,
        };
        inherited.consolidatedUnits = syncConsolidated155Row(
          inherited.consolidatedUnits,
          inherited
        );
        return carryForwardPriorUnitRows(inherited, fallbackSource);
      }
    }

    if (fallbackSource && fallbackSource.date < dateIso) {
      const clonedFallback = deepCloneDayState(fallbackSource);
      const inherited: DayState = {
        ...clonedFallback,
        date: dateIso,
        formattedDisplayDate: formatDateToMilitary(dateIso),
        preparedBy: savedPreparedBy
          ? { ...savedPreparedBy }
          : { ...(clonedFallback.preparedBy || INITIAL_PREPARED_BY) },
        disposals: clonedFallback.disposals.map((d) => ({ ...d, date: dateIso })),
        consolidatedUnits: (clonedFallback.consolidatedUnits || []).map((u) => ({
          ...u,
          manuallyEdited: false,
        })),
        savedCustomDisposals: loadSavedCustomDisposals().length
          ? loadSavedCustomDisposals()
          : [...(clonedFallback.savedCustomDisposals || [])],
        updateLogs: [],
        rosterVersion: 7,
      };
      inherited.consolidatedUnits = syncConsolidated155Row(
        inherited.consolidatedUnits,
        inherited
      );
      return carryForwardPriorUnitRows(inherited, fallbackSource);
    }
  } catch (err) {
    console.error('Failed to load day state from storage:', err);
  }
  // Return clean default state with this date
  const savedPreparedBy = loadSavedPreparedBy();
  const baseClone = deepCloneDayState(INITIAL_DAY_STATE);
  return {
    ...baseClone,
    date: dateIso,
    formattedDisplayDate: formatDateToMilitary(dateIso),
    preparedBy: savedPreparedBy ? { ...savedPreparedBy } : { ...baseClone.preparedBy },
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

export function getFlyingWingSummary(dayState: DayState, allowedUnits?: string[]) {
  const rowByUnit = new Map(
    dayState.consolidatedUnits.map((u) => [u.sqnUnit.toLowerCase(), u])
  );
  const units: UnitRowState[] =
    allowedUnits && allowedUnits.length > 0
      ? allowedUnits.map(
          (unitName) => rowByUnit.get(unitName.toLowerCase()) || createBlankUnitRow(unitName)
        )
      : dayState.consolidatedUnits;
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

const DUTY_ON_LABELS = new Set([
  'gd',
  'btf',
  'ntf',
  'airfield',
  'airfield duty',
  'escort',
  'escort duty',
]);
const DUTY_ON_CATEGORIES = new Set(['baseSecurityGd', 'airfieldDuty', 'escort']);

export interface SeparateDisposalGroup {
  name: string;
  items: DisposalRecord[];
}

export function categorizeUnitDisposals(unitDisposals: DisposalRecord[]) {
  const isOfficeDisposal = (d: DisposalRecord) =>
    d.category === 'officeDuty' ||
    d.category === 'canteen' ||
    d.category === 'other' ||
    (d.detail || d.displayCategory || '').trim().toLowerCase() === 'office duty';

  const isTdyDisposal = (d: DisposalRecord) => d.category === 'detTdy';

  const isDutyOnDisposal = (d: DisposalRecord) => {
    if (isTdyDisposal(d) || isOfficeDisposal(d) || d.category === 'custom') return false;
    const label = (d.detail || d.displayCategory || '').trim().toLowerCase();
    return DUTY_ON_CATEGORIES.has(d.category) || DUTY_ON_LABELS.has(label);
  };

  const tdyDisposals = unitDisposals.filter(isTdyDisposal);
  const dutyDisposals = unitDisposals.filter(isDutyOnDisposal);
  const officeDisposals = unitDisposals.filter(isOfficeDisposal);

  const otherDisposals = unitDisposals.filter(
    (d) => !isTdyDisposal(d) && !isDutyOnDisposal(d) && !isOfficeDisposal(d)
  );

  const groupMap = new Map<string, SeparateDisposalGroup>();
  otherDisposals.forEach((d) => {
    const rawName = (d.detail || d.displayCategory || 'Other').trim() || 'Other';
    const key = rawName.toLowerCase();
    const existing = groupMap.get(key);
    if (existing) {
      existing.items.push(d);
    } else {
      groupMap.set(key, { name: rawName, items: [d] });
    }
  });

  const orderIndex = new Map<string, number>(
    DISPOSAL_OPTIONS.map((opt, idx) => [opt.value.trim().toLowerCase(), idx])
  );

  const separateGroups = Array.from(groupMap.values()).sort((a, b) => {
    const idxA = orderIndex.get(a.name.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    const idxB = orderIndex.get(b.name.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    if (idxA !== idxB) return idxA - idxB;
    return 0;
  });

  return {
    tdyDisposals,
    dutyDisposals,
    officeDisposals,
    separateGroups,
  };
}
