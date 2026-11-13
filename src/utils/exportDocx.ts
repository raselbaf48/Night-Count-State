import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextDirection,
  TextRun,
  UnderlineType,
  VerticalAlignTable,
  WidthType,
  convertMillimetersToTwip,
} from 'docx';
import { Airman, DayState, DisposalRecord } from '../types/nightCount';

const FONT_FAMILY = 'Arial';

const BLACK_BORDER = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: '000000',
};

const CELL_BORDERS = {
  top: BLACK_BORDER,
  bottom: BLACK_BORDER,
  left: BLACK_BORDER,
  right: BLACK_BORDER,
};

const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: 'auto',
};

const NO_CELL_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
};

const CELL_MARGINS = {
  top: 40,
  bottom: 40,
  left: 40,
  right: 40,
};

const valStr = (val: number | string) => {
  if (typeof val === 'number') {
    return val === 0 ? '-' : String(val);
  }
  return val || '-';
};

const makeRun = (
  text: string,
  options?: { bold?: boolean; sizePt?: number; underline?: boolean }
) =>
  new TextRun({
    text,
    font: FONT_FAMILY,
    bold: options?.bold ?? false,
    size: (options?.sizePt ?? 9.5) * 2,
    color: '000000',
    underline: options?.underline ? { type: UnderlineType.SINGLE } : undefined,
  });

const makeCell = (
  text: string,
  options?: {
    bold?: boolean;
    sizePt?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    verticalHeader?: boolean;
    widthTwips?: number;
    shadingFill?: string;
    colSpan?: number;
  }
) =>
  new TableCell({
    verticalAlign: VerticalAlignTable.CENTER,
    textDirection: options?.verticalHeader
      ? TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT
      : TextDirection.LEFT_TO_RIGHT_TOP_TO_BOTTOM,
    width: options?.widthTwips
      ? { size: options.widthTwips, type: WidthType.DXA }
      : undefined,
    columnSpan: options?.colSpan,
    borders: CELL_BORDERS,
    margins: CELL_MARGINS,
    shading: options?.shadingFill
      ? { fill: options.shadingFill, type: ShadingType.CLEAR, color: 'auto' }
      : undefined,
    children: [
      new Paragraph({
        alignment: options?.align ?? AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [
          makeRun(text, {
            bold: options?.bold ?? false,
            sizePt: options?.sizePt ?? 9.5,
          }),
        ],
      }),
    ],
  });

export interface ExportWingRow {
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
  remarks?: string;
}

export interface ExportDocxParams {
  dayState: DayState;
  isFlyingWing: boolean;
  isNominalRoll: boolean;
  unitName: string;
  wingColumns: { key: string; label: string }[];
  wingSummary: {
    rowSummaries: ExportWingRow[];
    savedCustomNames: string[];
    totals: {
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
      customDisposals: Record<string, number>;
      totalOutParade: number;
      onParade: number;
    };
  };
  unitColumns: { key: string; label: string }[];
  summarizedUnit: ExportWingRow;
  customEntries: [string, number][];
  currentRemarks: string;
  onParadeAirmen: Airman[];
  tdyDisposals: DisposalRecord[];
  dutyDisposals: DisposalRecord[];
  officeDisposals: DisposalRecord[];
  separateGroups: { name: string; items: DisposalRecord[] }[];
  unitAirmen: Airman[];
  unitDisposalMap: Map<string, string>;
  formatTdyDetail: (detail: string) => string;
}

export async function exportReportToDocx(params: ExportDocxParams): Promise<void> {
  const {
    dayState,
    isFlyingWing,
    isNominalRoll,
    unitName,
    wingColumns,
    wingSummary,
    unitColumns,
    summarizedUnit,
    customEntries,
    currentRemarks,
    onParadeAirmen,
    tdyDisposals,
    dutyDisposals,
    officeDisposals,
    separateGroups,
    unitAirmen,
    unitDisposalMap,
    formatTdyDetail,
  } = params;

  const children: (Paragraph | Table)[] = [];
  let filePrefix = `NT_Count_State_${unitName.replace(/\s+/g, '_')}`;

  // A4 Landscape printable table width: 297mm - 16mm margins = 281mm
  const landscapeTableWidth = convertMillimetersToTwip(281);
  const firstColWidth = convertMillimetersToTwip(36);

  const buildHeaderRow = (cols: { key: string; label: string }[], colWidths: number[]) =>
    new TableRow({
      tableHeader: true,
      height: {
        value: convertMillimetersToTwip(40),
        rule: HeightRule.ATLEAST,
      },
      children: cols.map((col, idx) =>
        makeCell(col.label, {
          bold: true,
          sizePt: 9.5,
          align: AlignmentType.CENTER,
          verticalHeader: idx > 0,
          widthTwips: colWidths[idx],
        })
      ),
    });

  if (isFlyingWing) {
    filePrefix = 'Consolidated_Night_Count_State_FLG_WG';

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 40 },
        children: [
          makeRun('CONSOLIDATED NIGHT COUNT STATE : BAF AIRMEN', {
            bold: true,
            sizePt: 12,
            underline: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [
          makeRun('FLG WG', {
            bold: true,
            sizePt: 12,
            underline: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 60 },
        children: [
          makeRun(`Date: ${dayState.formattedDisplayDate}`, {
            bold: true,
            sizePt: 10,
          }),
        ],
      })
    );

    const restCount = wingColumns.length - 1;
    const remarksWidth = convertMillimetersToTwip(14);
    const dataColsCount = Math.max(1, restCount - 1);
    const eachDataWidth = Math.floor(
      (landscapeTableWidth - firstColWidth - remarksWidth) / dataColsCount
    );
    const colWidths = wingColumns.map((c, idx) => {
      if (idx === 0) return firstColWidth;
      if (c.key === 'remarks') return remarksWidth;
      return eachDataWidth;
    });

    const rows: TableRow[] = [
      buildHeaderRow(wingColumns, colWidths),
      ...wingSummary.rowSummaries.map(
        (r) =>
          new TableRow({
            height: { value: convertMillimetersToTwip(7.5), rule: HeightRule.ATLEAST },
            children: [
              makeCell(r.sqnUnit, {
                bold: true,
                align: AlignmentType.LEFT,
                widthTwips: colWidths[0],
              }),
              makeCell(valStr(r.totalStr), { bold: true, widthTwips: colWidths[1] }),
              makeCell(valStr(r.detTdy), { widthTwips: colWidths[2] }),
              makeCell(valStr(r.effStr), { bold: true, widthTwips: colWidths[3] }),
              makeCell(valStr(r.leave), { widthTwips: colWidths[4] }),
              makeCell(valStr(r.course), { widthTwips: colWidths[5] }),
              makeCell(valStr(r.awolDetention), { widthTwips: colWidths[6] }),
              makeCell(valStr(r.sickReport), { widthTwips: colWidths[7] }),
              makeCell(valStr(r.edExPpgf), { widthTwips: colWidths[8] }),
              makeCell(valStr(r.cmhBnsBshQmt), { widthTwips: colWidths[9] }),
              makeCell(valStr(r.ucUBoard), { widthTwips: colWidths[10] }),
              makeCell(valStr(r.officeDuty), { widthTwips: colWidths[11] }),
              makeCell(valStr(r.aftNiFlgNiDuty), { widthTwips: colWidths[12] }),
              makeCell(valStr(r.gdTfAirfieldDuty), { widthTwips: colWidths[13] }),
              makeCell(valStr(r.driving), { widthTwips: colWidths[14] }),
              ...wingSummary.savedCustomNames.map((cName, cIdx) =>
                makeCell(valStr(r.customDisposals?.[cName] || 0), {
                  widthTwips: colWidths[15 + cIdx],
                })
              ),
              makeCell(valStr(r.totalOutParade), {
                bold: true,
                widthTwips: colWidths[colWidths.length - 3],
              }),
              makeCell(valStr(r.onParade), {
                bold: true,
                widthTwips: colWidths[colWidths.length - 2],
              }),
              makeCell(r.remarks || 'Nil', {
                widthTwips: colWidths[colWidths.length - 1],
              }),
            ],
          })
      ),
      new TableRow({
        height: { value: convertMillimetersToTwip(8), rule: HeightRule.ATLEAST },
        children: [
          makeCell('TOTAL', {
            bold: true,
            align: AlignmentType.CENTER,
            widthTwips: colWidths[0],
            shadingFill: 'F2F2F2',
          }),
          makeCell(valStr(wingSummary.totals.totalStr), {
            bold: true,
            widthTwips: colWidths[1],
            shadingFill: 'F2F2F2',
          }),
          makeCell(valStr(wingSummary.totals.detTdy), {
            bold: true,
            widthTwips: colWidths[2],
            shadingFill: 'F2F2F2',
          }),
          makeCell(valStr(wingSummary.totals.effStr), {
            bold: true,
            widthTwips: colWidths[3],
            shadingFill: 'F2F2F2',
          }),
          makeCell(valStr(wingSummary.totals.leave), {
            bold: true,
            widthTwips: colWidths[4],
            shadingFill: 'F2F2F2',
          }),
          makeCell(valStr(wingSummary.totals.course), {
            bold: true,
            widthTwips: colWidths[5],
            shadingFill: 'F2F2F2',
          }),
          makeCell(valStr(wingSummary.totals.awolDetention), {
            bold: true,
            widthTwips: colWidths[6],
            shadingFill: 'F2F2F2',
          }),
          makeCell(valStr(wingSummary.totals.sickReport), {
            bold: true,
            widthTwips: colWidths[7],
            shadingFill: 'F2F2F2',
          }),
          makeCell(valStr(wingSummary.totals.edExPpgf), {
            bold: true,
            widthTwips: colWidths[8],
            shadingFill: 'F2F2F2',
          }),
          makeCell(valStr(wingSummary.totals.cmhBnsBshQmt), {
            bold: true,
            widthTwips: colWidths[9],
            shadingFill: 'F2F2F2',
          }),
          makeCell(valStr(wingSummary.totals.ucUBoard), {
            bold: true,
            widthTwips: colWidths[10],
            shadingFill: 'F2F2F2',
          }),
          makeCell(valStr(wingSummary.totals.officeDuty), {
            bold: true,
            widthTwips: colWidths[11],
            shadingFill: 'F2F2F2',
          }),
          makeCell(valStr(wingSummary.totals.aftNiFlgNiDuty), {
            bold: true,
            widthTwips: colWidths[12],
            shadingFill: 'F2F2F2',
          }),
          makeCell(valStr(wingSummary.totals.gdTfAirfieldDuty), {
            bold: true,
            widthTwips: colWidths[13],
            shadingFill: 'F2F2F2',
          }),
          makeCell(valStr(wingSummary.totals.driving), {
            bold: true,
            widthTwips: colWidths[14],
            shadingFill: 'F2F2F2',
          }),
          ...wingSummary.savedCustomNames.map((cName, cIdx) =>
            makeCell(valStr(wingSummary.totals.customDisposals[cName] || 0), {
              bold: true,
              widthTwips: colWidths[15 + cIdx],
              shadingFill: 'F2F2F2',
            })
          ),
          makeCell(valStr(wingSummary.totals.totalOutParade), {
            bold: true,
            widthTwips: colWidths[colWidths.length - 3],
            shadingFill: 'F2F2F2',
          }),
          makeCell(valStr(wingSummary.totals.onParade), {
            bold: true,
            widthTwips: colWidths[colWidths.length - 2],
            shadingFill: 'F2F2F2',
          }),
          makeCell('-', {
            bold: true,
            widthTwips: colWidths[colWidths.length - 1],
            shadingFill: 'F2F2F2',
          }),
        ],
      }),
    ];

    children.push(
      new Table({
        width: { size: landscapeTableWidth, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        columnWidths: colWidths,
        rows,
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 280, after: 760 },
        children: [makeRun('Prepared By', { bold: false, sizePt: 10 })],
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 20 },
        children: [
          makeRun((dayState.preparedBy?.name || '').toUpperCase(), {
            bold: true,
            sizePt: 10,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 20 },
        children: [
          makeRun((dayState.preparedBy?.rank || '').toUpperCase(), {
            bold: true,
            sizePt: 9.5,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 0 },
        children: [
          makeRun((dayState.preparedBy?.appointment || '').toUpperCase(), {
            bold: false,
            sizePt: 9.5,
          }),
        ],
      })
    );
  } else if (isNominalRoll) {
    filePrefix = `Nominal_Roll_${unitName.replace(/\s+/g, '_')}`;
    const portraitWidth = convertMillimetersToTwip(186);
    const colWidths = [
      convertMillimetersToTwip(12),
      convertMillimetersToTwip(24),
      convertMillimetersToTwip(18),
      convertMillimetersToTwip(56),
      convertMillimetersToTwip(26),
      convertMillimetersToTwip(22),
      convertMillimetersToTwip(28),
    ];

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 40 },
        children: [
          makeRun('NOMINAL ROLL : BAF AIRMEN', {
            bold: true,
            sizePt: 12,
            underline: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [
          makeRun(unitName, {
            bold: true,
            sizePt: 12,
            underline: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 80 },
        children: [
          makeRun(`Date: ${dayState.formattedDisplayDate} | Total: ${unitAirmen.length}`, {
            bold: true,
            sizePt: 10,
          }),
        ],
      })
    );

    const headerLabels = ['Ser', 'BD No', 'Rank', 'Name', 'Trade', 'Flight', 'Disposal / Duty'];
    const rows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: headerLabels.map((label, idx) =>
          makeCell(label, { bold: true, widthTwips: colWidths[idx], shadingFill: 'F2F2F2' })
        ),
      }),
      ...(unitAirmen.length === 0
        ? [
            new TableRow({
              children: [
                makeCell('No airmen in Nominal Roll', {
                  colSpan: 7,
                  widthTwips: portraitWidth,
                }),
              ],
            }),
          ]
        : unitAirmen.map((a, idx) => {
            const disp = unitDisposalMap.get(a.id) || a.currentDuty || '-';
            return new TableRow({
              children: [
                makeCell(String(idx + 1), { widthTwips: colWidths[0] }),
                makeCell(a.bdNo || '-', { widthTwips: colWidths[1] }),
                makeCell(a.rank, { bold: true, widthTwips: colWidths[2] }),
                makeCell(a.name, {
                  bold: true,
                  align: AlignmentType.LEFT,
                  widthTwips: colWidths[3],
                }),
                makeCell(a.trade || '-', { widthTwips: colWidths[4] }),
                makeCell(a.flight || '-', { widthTwips: colWidths[5] }),
                makeCell(disp, { bold: disp !== '-', widthTwips: colWidths[6] }),
              ],
            });
          })),
    ];

    children.push(
      new Table({
        width: { size: portraitWidth, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        columnWidths: colWidths,
        rows,
      })
    );
  } else {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 40 },
        children: [
          makeRun('NT COUNT STATE: AIRMEN', {
            bold: true,
            sizePt: 12,
            underline: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80 },
        children: [
          makeRun(unitName, {
            bold: true,
            sizePt: 12,
            underline: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 60 },
        children: [
          makeRun(`Date: ${dayState.formattedDisplayDate}`, {
            bold: true,
            sizePt: 10,
          }),
        ],
      })
    );

    const restCount = unitColumns.length - 1;
    const remarksWidth = convertMillimetersToTwip(14);
    const dataColsCount = Math.max(1, restCount - 1);
    const eachDataWidth = Math.floor(
      (landscapeTableWidth - firstColWidth - remarksWidth) / dataColsCount
    );
    const colWidths = unitColumns.map((c, idx) => {
      if (idx === 0) return firstColWidth;
      if (c.key === 'remarks') return remarksWidth;
      return eachDataWidth;
    });

    const rows: TableRow[] = [
      buildHeaderRow(unitColumns, colWidths),
      new TableRow({
        height: { value: convertMillimetersToTwip(8), rule: HeightRule.ATLEAST },
        children: [
          makeCell(unitName, { bold: true, widthTwips: colWidths[0] }),
          makeCell(String(summarizedUnit.totalStr), { bold: true, widthTwips: colWidths[1] }),
          makeCell(valStr(summarizedUnit.detTdy), { widthTwips: colWidths[2] }),
          makeCell(String(summarizedUnit.effStr), { bold: true, widthTwips: colWidths[3] }),
          makeCell(valStr(summarizedUnit.leave), { widthTwips: colWidths[4] }),
          makeCell(valStr(summarizedUnit.course), { widthTwips: colWidths[5] }),
          makeCell(valStr(summarizedUnit.awolDetention), { widthTwips: colWidths[6] }),
          makeCell(valStr(summarizedUnit.sickReport), { widthTwips: colWidths[7] }),
          makeCell(valStr(summarizedUnit.edExPpgf), { widthTwips: colWidths[8] }),
          makeCell(valStr(summarizedUnit.cmhBnsBshQmt), { widthTwips: colWidths[9] }),
          makeCell(valStr(summarizedUnit.ucUBoard), { widthTwips: colWidths[10] }),
          makeCell(valStr(summarizedUnit.officeDuty), { widthTwips: colWidths[11] }),
          makeCell(valStr(summarizedUnit.aftNiFlgNiDuty), { widthTwips: colWidths[12] }),
          makeCell(valStr(summarizedUnit.gdTfAirfieldDuty), { widthTwips: colWidths[13] }),
          makeCell(valStr(summarizedUnit.driving), { widthTwips: colWidths[14] }),
          ...customEntries.map(([, count], cIdx) =>
            makeCell(valStr(count), { widthTwips: colWidths[15 + cIdx] })
          ),
          makeCell(String(summarizedUnit.totalOutParade), {
            bold: true,
            widthTwips: colWidths[colWidths.length - 3],
          }),
          makeCell(String(summarizedUnit.onParade), {
            bold: true,
            widthTwips: colWidths[colWidths.length - 2],
          }),
          makeCell(currentRemarks || 'Nil', {
            widthTwips: colWidths[colWidths.length - 1],
          }),
        ],
      }),
    ];

    children.push(
      new Table({
        width: { size: landscapeTableWidth, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        columnWidths: colWidths,
        rows,
      }),
      new Paragraph({ spacing: { before: 120, after: 0 }, children: [] })
    );

    const makeBreakdownCell = (title: string, lines: string[], widthTwips: number) =>
      new TableCell({
        verticalAlign: VerticalAlignTable.TOP,
        borders: NO_CELL_BORDERS,
        width: { size: widthTwips, type: WidthType.DXA },
        margins: { top: 40, bottom: 40, left: 40, right: 80 },
        children: [
          new Paragraph({
            spacing: { before: 0, after: 80 },
            children: [makeRun(title, { bold: true, sizePt: 10, underline: true })],
          }),
          ...(lines.length === 0
            ? [
                new Paragraph({
                  spacing: { before: 0, after: 40 },
                  children: [makeRun('Nil', { sizePt: 9.5 })],
                }),
              ]
            : lines.map(
                (line, i) =>
                  new Paragraph({
                    spacing: { before: 0, after: 30 },
                    children: [makeRun(`${i + 1}. ${line}`, { sizePt: 9.5 })],
                  })
              )),
        ],
      });

    const breakdownSections: { title: string; lines: string[] }[] = [
      {
        title: 'ON PARADE',
        lines: onParadeAirmen.map((a) => `${a.rank} ${a.name}`),
      },
      {
        title: 'TDY',
        lines: tdyDisposals.map((d) => {
          const sub = formatTdyDetail(d.detail || d.displayCategory);
          const suffix = sub && sub.trim().toUpperCase() !== 'TDY' ? ` - ${sub}` : '';
          return `${d.rank} ${d.name}${suffix}`;
        }),
      },
      {
        title: 'DUTY ON',
        lines: dutyDisposals.map((d) => `${d.rank} ${d.name} - ${d.detail || d.displayCategory}`),
      },
      {
        title: 'OFFICE',
        lines: officeDisposals.map((d) => `${d.rank} ${d.name}`),
      },
      ...separateGroups.map((g) => ({
        title: g.name.toUpperCase(),
        lines: g.items.map((d) => `${d.rank} ${d.name}`),
      })),
    ];

    const breakdownColWidth = Math.floor(landscapeTableWidth / breakdownSections.length);
    children.push(
      new Table({
        width: { size: landscapeTableWidth, type: WidthType.DXA },
        layout: TableLayoutType.FIXED,
        columnWidths: breakdownSections.map(() => breakdownColWidth),
        rows: [
          new TableRow({
            children: breakdownSections.map((sec) =>
              makeBreakdownCell(sec.title, sec.lines, breakdownColWidth)
            ),
          }),
        ],
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: isNominalRoll
            ? {
                size: {
                  width: convertMillimetersToTwip(210),
                  height: convertMillimetersToTwip(297),
                  orientation: PageOrientation.PORTRAIT,
                },
                margin: {
                  top: convertMillimetersToTwip(12),
                  bottom: convertMillimetersToTwip(12),
                  left: convertMillimetersToTwip(12),
                  right: convertMillimetersToTwip(12),
                },
              }
            : {
                // docx library swaps width/height internally when orientation is LANDSCAPE
                size: {
                  width: convertMillimetersToTwip(210),
                  height: convertMillimetersToTwip(297),
                  orientation: PageOrientation.LANDSCAPE,
                },
                margin: {
                  top: convertMillimetersToTwip(8),
                  bottom: convertMillimetersToTwip(8),
                  left: convertMillimetersToTwip(8),
                  right: convertMillimetersToTwip(8),
                },
              },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filePrefix}_${dayState.date}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
