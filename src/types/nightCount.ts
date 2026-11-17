export type Rank = 'AC' | 'AC-1' | 'AC-2' | 'LAC' | 'Cpl' | 'Sgt' | 'Flt Sgt' | 'WO' | 'MWO';

export type UserRole = 'OWNER' | 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export type ThemePreference = 'system' | 'light' | 'dark';

export type PermissionLevel = 'hide' | 'view' | 'manage';

export type RolePermissionKey =
  | 'menuOverview'
  | 'viewConsolidatedState'
  | 'editQuickSqnCount'
  | 'editPreparedBy'
  | 'exportPrintReport'
  | 'viewUpdateLog'
  | 'menuSquadrons'
  | 'viewUnitDetails'
  | 'editUnitDisposals'
  | 'manageNominalRoll'
  | 'deleteNominalRollAirman'
  | 'viewUnitUpdateLog'
  | 'accessSettings'
  | 'settingsTheme'
  | 'manageWingsAndUnits'
  | 'manageUsers'
  | 'settingsPermissions'
  | 'settingsHistory'
  | 'manageCloudAndNotice'
  | 'settingsNotice';

export type RolePermissions = Record<RolePermissionKey, PermissionLevel>;

export interface RolePermissionsConfig {
  SUPER_ADMIN: RolePermissions;
  ADMIN: RolePermissions;
  USER: RolePermissions;
  GUEST: RolePermissions;
}

export interface Airman {
  id: string;
  rank: Rank;
  name: string;
  bdNo?: string;
  trade?: string;
  flight?: string; // 'Mechanics' | 'Avionics' | 'GCS' | 'Admin'
  unit: string; // e.g. "155 UASU BAF"
  role?: UserRole;
  adminPin?: string;
  status: 'on_parade' | 'duty' | 'leave' | 'sick' | 'detached' | 'other';
  currentDuty?: string; // e.g. "Office Duty", "CUST_1794394..."
  remarks?: string;
}

export interface DisposalRecord {
  id: string;
  airmanId?: string;
  rank: Rank;
  name: string;
  unit: string;
  category: string; // e.g. 'officeDuty', 'detTdy', 'leave', 'course', etc.
  displayCategory: string; // e.g. 'Office Duty', 'Sick report', 'Driving'
  detail: string; // e.g. 'Duty NCO Office', 'CUST_1794394'
  date: string; // YYYY-MM-DD
  period?: string; // 'Night', '24 Hours', 'Day'
  remarks?: string;
}

export interface UnitRowState {
  sqnUnit: string;
  totalStr: number;
  detTdy: number;
  effStr: number;
  leave: number;
  course: number;
  classVal: number;
  exam: number;
  awol: number;
  detention: number;
  sickReport: number;
  ed: number;
  exPpgf: number;
  cmh: number;
  bns: number;
  bsh: number;
  quarantine: number;
  uc: number;
  uBoard: number;
  officeDuty: number;
  aftFlg: number;
  niFlg: number;
  niDuty: number;
  baseSecurityGd: number;
  baseTaskforceBtf: number;
  airfieldDuty: number;
  offDuty: number;
  ko: number;
  canteen: number;
  bakery: number;
  driving: number;
  ptParadeOnUnit: number;
  games: number;
  guardOfHonor: number;
  totalOutParade: number;
  onParadeForecast: number;
  rmks: string;
  disposalCounts?: Record<string, number>;
  customDisposals?: Record<string, number>;
  manuallyEdited?: boolean;
}

export interface UnitSummarizedRow {
  sqnUnit: string;
  totalStr: number;
  detTdy: number;
  effStr: number;
  leave: number;
  course: number;
  awolDetention: number;
  sickReport: number;
  edExPpgf: number;
  cmhBnsBshQmt: number;
  ucUBoard: number;
  officeDuty: number;
  aftNiFlgNiDuty: number;
  gdTfAirfieldDuty: number;
  driving: number;
  customDisposals?: Record<string, number>;
  totalOutParade: number;
  onParade: number;
  remarks: string;
}

export interface PreparedByInfo {
  name: string;
  rank: string;
  trade: string;
  bdNo: string;
  appointment: string;
  signatureDate: string;
}

export interface OperatorProfile {
  bdNo: string;
  rank: Rank | string;
  name: string;
  trade: string;
  flight: string;
}

export interface StateUpdateLogEntry {
  id: string;
  timestamp: string; // ISO string
  displayTime: string; // e.g. 08:52 PM
  date: string; // YYYY-MM-DD
  area:
    | 'Quick Edit Sqn Count'
    | `Consolidated State : ${string}`
    | 'Nominal Roll'
    | 'Unit State'
    | 'Custom Disposal'
    | 'Prepared By';
  unitName: string;
  action: string;
  operator: OperatorProfile;
}

export interface LoginHistoryEntry {
  id: string;
  bdNo: string;
  rank: string;
  name: string;
  trade: string;
  flight: string;
  mode: 'Portal' | 'Auth Box' | 'Guest';
  timestamp: string; // ISO string
  displayTime: string; // e.g. 14 Nov 2026, 12:12:06 pm
}

export interface WingConfig {
  id: string;
  name: string;
  shortName: string;
  units: string[];
  preparedBy?: PreparedByInfo;
}

export interface DayState {
  date: string; // format "11 Nov 26" or "2026-11-11"
  formattedDisplayDate: string;
  preparedBy: PreparedByInfo;
  airmen155: Airman[];
  unitAirmen?: Record<string, Airman[]>;
  disposals: DisposalRecord[];
  consolidatedUnits: UnitRowState[];
  customRemarks?: string;
  unitRemarks?: Record<string, string>;
  savedCustomDisposals?: string[];
  updateLogs?: StateUpdateLogEntry[];
  rosterVersion?: number;
  lastUpdatedAt?: number;
}
