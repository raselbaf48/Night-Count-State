import * as XLSX from 'xlsx';
import { Airman, Rank } from '../types/nightCount';

export interface ParsedExcelAirmanRow {
  rowNumber: number;
  serNo?: string;
  bdNo: string;
  rank: Rank | '';
  rawRank: string;
  name: string;
  trade: string;
  flight: string;
  error?: string;
}

const VALID_RANKS: Rank[] = ['Cpl', 'LAC', 'AC', 'AC-1', 'AC-2', 'Flt Sgt', 'WO', 'MWO'];

export function normalizeRank(raw: string): Rank | '' {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  const lower = cleaned.toLowerCase().replace(/[^a-z0-9]/g, '');

  const map: Record<string, Rank> = {
    cpl: 'Cpl',
    corporal: 'Cpl',
    lac: 'LAC',
    leadingaircraftman: 'LAC',
    ac: 'AC',
    aircraftman: 'AC',
    ac1: 'AC-1',
    ac2: 'AC-2',
    fltsgt: 'Flt Sgt',
    flightsgt: 'Flt Sgt',
    flightsergeant: 'Flt Sgt',
    wo: 'WO',
    warrantofficer: 'WO',
    mwo: 'MWO',
    masterwarrantofficer: 'MWO',
  };

  if (map[lower]) return map[lower];
  const exact = VALID_RANKS.find((r) => r.toLowerCase() === cleaned.toLowerCase());
  return exact || '';
}

function normalizeHeaderKey(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getFieldValue(row: Record<string, unknown>, candidates: string[]): string {
  const entries = Object.entries(row);
  for (const candidate of candidates) {
    const found = entries.find(([k]) => normalizeHeaderKey(k) === candidate);
    if (found && found[1] !== undefined && found[1] !== null) {
      return String(found[1]).trim();
    }
  }
  return '';
}

export async function parseAirmenExcelFile(
  file: File,
  existingBds: Set<string> | Map<string, string>
): Promise<ParsedExcelAirmanRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('No sheet found in the uploaded file.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  if (jsonRows.length === 0) {
    throw new Error('The uploaded Excel sheet has no data rows.');
  }

  const seenInFile = new Set<string>();

  return jsonRows.map((row, idx) => {
    const rowNumber = idx + 2; // 1-indexed header + row
    const serNo = getFieldValue(row, ['serno', 'ser', 'sl', 'slno', 'sn', 'serialno']);
    const rawBd = getFieldValue(row, ['bd', 'bdno', 'bdnumber', 'serviceno', 'svcno']);
    const bdNo = rawBd.replace(/\D/g, '');
    const rawRank = getFieldValue(row, ['rank', 'rk']);
    const rank = normalizeRank(rawRank);
    const name = getFieldValue(row, ['name', 'shortname', 'airmanname', 'fullname']);
    const trade = getFieldValue(row, ['trade', 'trd', 'branch']);
    const flight = getFieldValue(row, ['flight', 'flt', 'section', 'sec']);

    const errors: string[] = [];
    if (!/^\d{6}$/.test(bdNo)) {
      errors.push('BD must be 6 digits');
    } else if (existingBds instanceof Map ? existingBds.has(bdNo) : existingBds.has(bdNo)) {
      const conflictUnit = existingBds instanceof Map ? existingBds.get(bdNo) : undefined;
      errors.push(conflictUnit ? `BD already in ${conflictUnit}` : 'BD already exists');
    } else if (seenInFile.has(bdNo)) {
      errors.push('Duplicate BD in file');
    }

    if (bdNo) seenInFile.add(bdNo);

    if (!rank) {
      errors.push(rawRank ? `Invalid rank "${rawRank}"` : 'Rank missing');
    }
    if (!name) {
      errors.push('Name missing');
    }
    if (!trade) {
      errors.push('Trade missing');
    }
    if (!flight) {
      errors.push('Flight missing');
    }

    return {
      rowNumber,
      serNo: serNo || String(idx + 1),
      bdNo,
      rank,
      rawRank,
      name,
      trade,
      flight,
      error: errors.length > 0 ? errors.join(', ') : undefined,
    };
  });
}

export function downloadSampleAirmenExcel(): void {
  const sampleRows = [
    { 'Ser No': 1, BD: '474455', Rank: 'LAC', Name: 'Shakil', Trade: 'E&I Fitt', Flight: 'GCS' },
    { 'Ser No': 2, BD: '475120', Rank: 'Cpl', Name: 'Tanvir', Trade: 'Radio Fitt', Flight: 'Avionics' },
  ];
  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  worksheet['!cols'] = [
    { wch: 9 },
    { wch: 12 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Airmen');
  XLSX.writeFile(workbook, 'Airmen_Bulk_Upload_Template.xlsx');
}

export function buildAirmenFromParsedRows(
  rows: ParsedExcelAirmanRow[],
  unitName: string
): Omit<Airman, 'id'>[] {
  return rows
    .filter((r) => !r.error && r.rank)
    .map((r) => ({
      bdNo: r.bdNo,
      rank: r.rank as Rank,
      name: r.name,
      trade: r.trade,
      flight: r.flight,
      unit: unitName,
      status: 'on_parade' as const,
    }));
}
