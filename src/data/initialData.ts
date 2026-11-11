import { Airman, DayState, DisposalRecord, PreparedByInfo, Rank, UnitRowState } from '../types/nightCount';

export const INITIAL_PREPARED_BY: PreparedByInfo = {
  name: 'Rasel',
  rank: 'LAC',
  trade: 'E&I Fitt',
  bdNo: '474455',
  appointment: 'Duty NCO / Orderly Sgt',
  signatureDate: '11 Nov 26',
};

// Official nominal roll with BD Numbers, short names, Trades, and Flights
export const INITIAL_AIRMEN_155: Airman[] = [
  { id: 'airman-1', bdNo: '462102', rank: 'Cpl', name: 'Harun', trade: 'E&I Fitt', flight: 'GCS', unit: '155 UASU BAF', status: 'on_parade' },
  { id: 'airman-2', bdNo: '464231', rank: 'Cpl', name: 'Omar', trade: 'Radio Fitt', flight: 'Avionics', unit: '155 UASU BAF', status: 'on_parade' },
  { id: 'airman-3', bdNo: '465289', rank: 'Cpl', name: 'Ismail', trade: 'Log Asst', flight: 'Admin', unit: '155 UASU BAF', status: 'detached', currentDuty: 'TDY (Air HQ)' },
  { id: 'airman-4', bdNo: '467312', rank: 'Cpl', name: 'Ahasan', trade: 'ATCA', flight: 'Admin', unit: '155 UASU BAF', status: 'on_parade' },
  { id: 'airman-5', bdNo: '468445', rank: 'Cpl', name: 'Koraishi', trade: 'Afr Fitt', flight: 'Mechanics', unit: '155 UASU BAF', status: 'detached', currentDuty: 'TDY (HSIA)' },
  { id: 'airman-6', bdNo: '469520', rank: 'Cpl', name: 'Sajib', trade: 'Eng Fitt', flight: 'Mechanics', unit: '155 UASU BAF', status: 'on_parade' },
  { id: 'airman-7', bdNo: '471112', rank: 'Cpl', name: 'Maraz', trade: 'Sec Asst (GD)', flight: 'Admin', unit: '155 UASU BAF', status: 'on_parade' },
  { id: 'airman-8', bdNo: '472432', rank: 'Cpl', name: 'Shariful', trade: 'Log Asst', flight: 'Admin', unit: '155 UASU BAF', status: 'on_parade' },
  { id: 'airman-9', bdNo: '473856', rank: 'Cpl', name: 'Akash', trade: 'IT Asst', flight: 'GCS', unit: '155 UASU BAF', status: 'on_parade' },
  { id: 'airman-10', bdNo: '474455', rank: 'LAC', name: 'Rasel', trade: 'E&I Fitt', flight: 'Avionics', unit: '155 UASU BAF', status: 'duty', currentDuty: 'Canteen' },
  { id: 'airman-11', bdNo: '474513', rank: 'LAC', name: 'Mahedi', trade: 'Armt Fitt', flight: 'Mechanics', unit: '155 UASU BAF', status: 'detached', currentDuty: 'Att (SAIA)' },
  { id: 'airman-12', bdNo: '474549', rank: 'LAC', name: 'Rakib', trade: 'Radio Fitt', flight: 'Avionics', unit: '155 UASU BAF', status: 'on_parade' },
  { id: 'airman-13', bdNo: '474608', rank: 'LAC', name: 'Joy', trade: 'Radio Fitt', flight: 'GCS', unit: '155 UASU BAF', status: 'on_parade' },
  { id: 'airman-14', bdNo: '474730', rank: 'LAC', name: 'Ashraful', trade: 'Afr Fitt', flight: 'Mechanics', unit: '155 UASU BAF', status: 'on_parade' },
  { id: 'airman-15', bdNo: '474758', rank: 'LAC', name: 'Hridoy', trade: 'Eng Fitt', flight: 'Mechanics', unit: '155 UASU BAF', status: 'on_parade' },
  { id: 'airman-16', bdNo: '474806', rank: 'LAC', name: 'Mehedi', trade: 'GS', flight: 'GCS', unit: '155 UASU BAF', status: 'detached', currentDuty: 'TDY (Air HQ)' },
  { id: 'airman-17', bdNo: '475268', rank: 'LAC', name: 'Nishad', trade: 'Radio Fitt', flight: 'Avionics', unit: '155 UASU BAF', status: 'on_parade' },
  { id: 'airman-18', bdNo: '475296', rank: 'LAC', name: 'Zakirul', trade: 'E&I Fitt', flight: 'GCS', unit: '155 UASU BAF', status: 'on_parade' },
  { id: 'airman-19', bdNo: '475391', rank: 'LAC', name: 'Zubayer', trade: 'Afr Fitt', flight: 'Mechanics', unit: '155 UASU BAF', status: 'on_parade' },
  { id: 'airman-20', bdNo: '475803', rank: 'LAC', name: 'Tusar', trade: 'E&I Fitt', flight: 'GCS', unit: '155 UASU BAF', status: 'on_parade' },
  { id: 'airman-21', bdNo: '475902', rank: 'LAC', name: 'Adnan', trade: 'Radio Fitt', flight: 'GCS', unit: '155 UASU BAF', status: 'on_parade' },
  { id: 'airman-22', bdNo: '476023', rank: 'LAC', name: 'Rashed', trade: 'Eng Fitt', flight: 'Mechanics', unit: '155 UASU BAF', status: 'on_parade' },
  { id: 'airman-23', bdNo: '476257', rank: 'LAC', name: 'Saidul', trade: 'E&I Fitt', flight: 'GCS', unit: '155 UASU BAF', status: 'on_parade' },
  { id: 'airman-24', bdNo: '477329', rank: 'AC-1', name: 'Shawon', trade: 'IT Asst', flight: 'GCS', unit: '155 UASU BAF', status: 'on_parade' },
];

export const INITIAL_DISPOSALS: DisposalRecord[] = [
  {
    id: 'disp-3',
    airmanId: 'airman-3',
    rank: 'Cpl',
    name: 'Ismail',
    unit: '155 UASU BAF',
    category: 'detTdy',
    displayCategory: 'Det/Tdy',
    detail: 'TDY (Air HQ)',
    date: '2026-11-11',
    period: 'Temporary',
  },
  {
    id: 'disp-5',
    airmanId: 'airman-5',
    rank: 'Cpl',
    name: 'Koraishi',
    unit: '155 UASU BAF',
    category: 'detTdy',
    displayCategory: 'Det/Tdy',
    detail: 'TDY (HSIA)',
    date: '2026-11-11',
    period: 'Temporary',
  },
  {
    id: 'disp-10',
    airmanId: 'airman-10',
    rank: 'LAC',
    name: 'Rasel',
    unit: '155 UASU BAF',
    category: 'canteen',
    displayCategory: 'Canteen',
    detail: 'Canteen',
    date: '2026-11-11',
    period: 'Duty',
  },
  {
    id: 'disp-11',
    airmanId: 'airman-11',
    rank: 'LAC',
    name: 'Mahedi',
    unit: '155 UASU BAF',
    category: 'detTdy',
    displayCategory: 'Det/Tdy',
    detail: 'Att (SAIA)',
    date: '2026-11-11',
    period: 'Temporary',
  },
  {
    id: 'disp-16',
    airmanId: 'airman-16',
    rank: 'LAC',
    name: 'Mehedi',
    unit: '155 UASU BAF',
    category: 'detTdy',
    displayCategory: 'Det/Tdy',
    detail: 'TDY (Air HQ)',
    date: '2026-11-11',
    period: 'Temporary',
  },
];

export const FLYING_WING_SQUADRONS = [
  'Flg WG HQ',
  '1 SQN BAF',
  '3 SQN BAF',
  '5 SQN BAF',
  '21 SQN BAF',
  '105 AJTU BAF',
  '155 UASU BAF',
  '301 SAM UNIT',
];

export function createBlankUnitRow(unitName: string): UnitRowState {
  return {
    sqnUnit: unitName,
    totalStr: 0,
    detTdy: 0,
    effStr: 0,
    leave: 0,
    course: 0,
    classVal: 0,
    exam: 0,
    awol: 0,
    detention: 0,
    sickReport: 0,
    ed: 0,
    exPpgf: 0,
    cmh: 0,
    bns: 0,
    bsh: 0,
    quarantine: 0,
    uc: 0,
    uBoard: 0,
    officeDuty: 0,
    aftFlg: 0,
    niFlg: 0,
    niDuty: 0,
    baseSecurityGd: 0,
    baseTaskforceBtf: 0,
    airfieldDuty: 0,
    offDuty: 0,
    ko: 0,
    canteen: 0,
    bakery: 0,
    driving: 0,
    ptParadeOnUnit: 0,
    games: 0,
    guardOfHonor: 0,
    totalOutParade: 0,
    onParadeForecast: 0,
    rmks: '',
  };
}

export function getInitialConsolidatedUnits(): UnitRowState[] {
  return FLYING_WING_SQUADRONS.map((sqn) => {
    if (sqn === '155 UASU BAF') {
      return {
        ...createBlankUnitRow(sqn),
        totalStr: 24,
        detTdy: 4,
        effStr: 20,
        canteen: 1,
        totalOutParade: 1,
        onParadeForecast: 19,
      };
    }
    return createBlankUnitRow(sqn);
  });
}

export const INITIAL_DAY_STATE: DayState = {
  date: '2026-11-11',
  formattedDisplayDate: '11 Nov 26',
  preparedBy: INITIAL_PREPARED_BY,
  airmen155: INITIAL_AIRMEN_155,
  disposals: INITIAL_DISPOSALS,
  consolidatedUnits: getInitialConsolidatedUnits(),
};

export const DISPOSAL_OPTIONS = [
  { value: '-', label: '-', category: 'none' },
  { value: 'TDY (Air HQ)', label: 'TDY (Air HQ)', category: 'detTdy' },
  { value: 'TDY (HSIA)', label: 'TDY (HSIA)', category: 'detTdy' },
  { value: 'Att (SAIA)', label: 'Att (SAIA)', category: 'detTdy' },
  { value: 'Office Duty', label: 'Office Duty', category: 'officeDuty' },
  { value: 'Canteen', label: 'Canteen', category: 'canteen' },
  { value: 'Bakery', label: 'Bakery', category: 'bakery' },
  { value: 'Base Security (GD)', label: 'Base Security (GD)', category: 'baseSecurityGd' },
  { value: 'Airfield Duty', label: 'Airfield Duty', category: 'airfieldDuty' },
  { value: 'Driving', label: 'Driving', category: 'driving' },
  { value: 'Leave', label: 'Leave', category: 'leave' },
  { value: 'Sick report', label: 'Sick report', category: 'sickReport' },
  { value: 'CMH', label: 'CMH', category: 'cmh' },
  { value: 'Course', label: 'Course', category: 'course' },
  { value: 'Class/Exam', label: 'Class/Exam', category: 'classExam' },
  { value: 'AWOL', label: 'AWOL', category: 'awol' },
  { value: 'ED/EX PPGF', label: 'ED/EX PPGF', category: 'edExPpgf' },
  { value: 'Games', label: 'Games', category: 'gamesGuardOfHonor' },
  { value: 'Guard of Honor', label: 'Guard of Honor', category: 'gamesGuardOfHonor' },
];

export const DISPOSAL_CATEGORIES = [
  { id: 'officeDuty', label: 'Office Duty', wingCol: 'officeDuty', unitCol: 'officeDuty' },
  { id: 'leave', label: 'Leave (Casual / Annual / Sick)', wingCol: 'leave', unitCol: 'leave' },
  { id: 'course', label: 'Course', wingCol: 'course', unitCol: 'course' },
  { id: 'classExam', label: 'Class / Exam', wingCol: 'exam', unitCol: 'classExam' },
  { id: 'awol', label: 'AWOL / Detention', wingCol: 'awol', unitCol: 'awolDetention' },
  { id: 'sickReport', label: 'Sick Report', wingCol: 'sickReport', unitCol: 'sickReport' },
  { id: 'edExPpgf', label: 'ED / Ex PPGF', wingCol: 'ed', unitCol: 'edExPpgf' },
  { id: 'cmh', label: 'CMH / BNS / BSH / Qmt', wingCol: 'cmh', unitCol: 'cmhBnsBshQmt' },
  { id: 'quarantine', label: 'Quarantine', wingCol: 'quarantine', unitCol: 'cmhBnsBshQmt' },
  { id: 'ucUBoard', label: 'U/C / U-Board', wingCol: 'uc', unitCol: 'ucUBoard' },
  { id: 'niDuty', label: 'Aft / Ni flg / Ni Duty', wingCol: 'niDuty', unitCol: 'aftNiFlgNiDuty' },
  { id: 'baseSecurityGd', label: 'Base Security (GD / BTF)', wingCol: 'baseSecurityGd', unitCol: 'gdTfAirfieldDuty' },
  { id: 'airfieldDuty', label: 'Airfield Duty', wingCol: 'airfieldDuty', unitCol: 'gdTfAirfieldDuty' },
  { id: 'driving', label: 'Driving', wingCol: 'driving', unitCol: 'driving' },
  { id: 'canteen', label: 'Canteen / Bakery / Mess', wingCol: 'canteen', unitCol: 'officeDuty' },
  { id: 'gamesGuardOfHonor', label: 'Games / Guard of Honor', wingCol: 'guardOfHonor', unitCol: 'gamesGuardOfHonor' },
  { id: 'detTdy', label: 'Detachment / TDY', wingCol: 'detTdy', unitCol: 'detTdy' },
  { id: 'other', label: 'Other Special Duty', wingCol: 'officeDuty', unitCol: 'officeDuty' },
];

// Trades matching Pic 3 exactly
export const BAF_TRADES = [
  'Afr Fitt',
  'Eng Fitt',
  'E&I Fitt',
  'Radio Fitt',
  'Armt Fitt',
  'GS',
  'Log Asst',
  'Sec Asst (GD)',
  'Sec Asst (Accts)',
  'Admin Asst',
  'ATCA',
  'Cy Asst',
  'IT Asst',
];

// Ranks for Add Airmen (Cpl, LAC, AC)
export const BAF_RANKS_SELECT: Rank[] = ['Cpl', 'LAC', 'AC', 'AC-1', 'AC-2'];

// Flights for 155 UASU BAF
export const BAF_FLIGHTS = ['Mechanics', 'Avionics', 'GCS', 'Admin'];

