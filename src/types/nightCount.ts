export type Rank = 'AC' | 'AC-1' | 'AC-2' | 'LAC' | 'Cpl' | 'Sgt' | 'Flt Sgt' | 'WO' | 'MWO';

export interface Airman {
  id: string;
  rank: Rank;
  name: string;
  bdNo?: string;
  trade?: string;
  flight?: string; // 'Mechanics' | 'Avionics' | 'GCS' | 'Admin'
  unit: string; // e.g. "155 UASU BAF"
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
}

export interface UnitSummarizedRow {
  sqnUnit: string;
  totalStr: number;
  detTdy: number;
  effStr: number;
  leave: number;
  course: number;
  classExam: number;
  awolDetention: number;
  sickReport: number;
  edExPpgf: number;
  cmhBnsBshQmt: number;
  ucUBoard: number;
  officeDuty: number;
  aftNiFlgNiDuty: number;
  gdTfAirfieldDuty: number;
  driving: number;
  gamesGuardOfHonor: number;
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

export interface DayState {
  date: string; // format "11 Nov 26" or "2026-11-11"
  formattedDisplayDate: string;
  preparedBy: PreparedByInfo;
  airmen155: Airman[];
  disposals: DisposalRecord[];
  consolidatedUnits: UnitRowState[];
  customRemarks?: string;
  rosterVersion?: number;
}
