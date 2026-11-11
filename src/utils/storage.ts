import { DayState, DisposalRecord, UnitRowState, UnitSummarizedRow } from '../types/nightCount';
import {
  INITIAL_DAY_STATE,
  INITIAL_AIRMEN_155,
  INITIAL_DISPOSALS,
  INITIAL_PREPARED_BY,
  FLYING_WING_SQUADRONS,
  createBlankUnitRow,
} from '../data/initialData';

const STORAGE_PREFIX = 'night_count_state_';

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

export function loadDayState(dateIso: string): DayState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${dateIso}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate to short names roster if names contain 'Md' or full names
      const hasFullNames = parsed.airmen155?.some((a: any) => a.name.includes('Md ') || a.name.includes('Hossen') || a.name.includes('Islam'));
      if (!parsed.airmen155 || parsed.airmen155.length < 24 || hasFullNames) {
        parsed.airmen155 = INITIAL_AIRMEN_155;
        parsed.disposals = INITIAL_DISPOSALS;
        parsed.preparedBy = INITIAL_PREPARED_BY;
      }
      return parsed;
    }
  } catch (err) {
    console.error('Failed to load day state from storage:', err);
  }
  // Return default state with this date
  return {
    ...INITIAL_DAY_STATE,
    date: dateIso,
    formattedDisplayDate: formatDateToMilitary(dateIso),
  };
}

export function saveDayState(state: DayState): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${state.date}`, JSON.stringify(state));
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

export function calculate155SummarizedRow(
  dayState: DayState
): UnitSummarizedRow {
  const airmen = dayState.airmen155;
  const disposals = dayState.disposals.filter((d) => d.unit === '155 UASU BAF');

  const totalStr = airmen.length;
  // Det/Tdy are those with detTdy category
  const detTdyCount = disposals.filter((d) => d.category === 'detTdy').length;
  const effStr = Math.max(0, totalStr - detTdyCount);

  // Group disposals
  let leave = 0;
  let course = 0;
  let classExam = 0;
  let awolDetention = 0;
  let sickReport = 0;
  let edExPpgf = 0;
  let cmhBnsBshQmt = 0;
  let ucUBoard = 0;
  let officeDuty = 0;
  let aftNiFlgNiDuty = 0;
  let gdTfAirfieldDuty = 0;
  let driving = 0;
  let gamesGuardOfHonor = 0;

  disposals.forEach((d) => {
    switch (d.category) {
      case 'leave':
        leave++;
        break;
      case 'course':
        course++;
        break;
      case 'classExam':
        classExam++;
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
        gdTfAirfieldDuty++;
        break;
      case 'driving':
        driving++;
        break;
      case 'gamesGuardOfHonor':
        gamesGuardOfHonor++;
        break;
      default:
        break;
    }
  });

  const totalOutParade =
    leave +
    course +
    classExam +
    awolDetention +
    sickReport +
    edExPpgf +
    cmhBnsBshQmt +
    ucUBoard +
    officeDuty +
    aftNiFlgNiDuty +
    gdTfAirfieldDuty +
    driving +
    gamesGuardOfHonor;

  const onParade = Math.max(0, effStr - totalOutParade);

  return {
    sqnUnit: '155 UASU BAF',
    totalStr,
    detTdy: detTdyCount,
    effStr,
    leave,
    course,
    classExam,
    awolDetention,
    sickReport,
    edExPpgf,
    cmhBnsBshQmt,
    ucUBoard,
    officeDuty,
    aftNiFlgNiDuty,
    gdTfAirfieldDuty,
    driving,
    gamesGuardOfHonor,
    totalOutParade,
    onParade,
    remarks: dayState.customRemarks || '',
  };
}

export function syncConsolidated155Row(
  units: UnitRowState[],
  dayState: DayState
): UnitRowState[] {
  const summarized = calculate155SummarizedRow(dayState);

  return units.map((u) => {
    if (u.sqnUnit === '155 UASU BAF') {
      return {
        ...u,
        totalStr: summarized.totalStr,
        detTdy: summarized.detTdy,
        effStr: summarized.effStr,
        leave: summarized.leave,
        course: summarized.course,
        exam: summarized.classExam,
        awol: summarized.awolDetention,
        sickReport: summarized.sickReport,
        ed: summarized.edExPpgf,
        cmh: summarized.cmhBnsBshQmt,
        uc: summarized.ucUBoard,
        officeDuty: summarized.officeDuty,
        niDuty: summarized.aftNiFlgNiDuty,
        baseSecurityGd: summarized.gdTfAirfieldDuty,
        driving: summarized.driving,
        guardOfHonor: summarized.gamesGuardOfHonor,
        totalOutParade: summarized.totalOutParade,
        onParadeForecast: summarized.onParade,
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
