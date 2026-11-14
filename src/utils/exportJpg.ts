import { ExportDocxParams, ExportWingRow } from './exportDocx';

const FONT_FAMILY = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

const valStr = (val: number | string) => {
  if (typeof val === 'number') {
    return val === 0 ? '-' : String(val);
  }
  return val || '-';
};

function drawUnderlinedCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  baselineY: number,
  font: string
) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, centerX, baselineY);
  const metrics = ctx.measureText(text);
  const lineY = baselineY + 3;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(centerX - metrics.width / 2, lineY);
  ctx.lineTo(centerX + metrics.width / 2, lineY);
  ctx.stroke();
  ctx.restore();
}

function drawUnderlinedLeftText(
  ctx: CanvasRenderingContext2D,
  text: string,
  leftX: number,
  baselineY: number,
  font: string
) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, leftX, baselineY);
  const metrics = ctx.measureText(text);
  const lineY = baselineY + 3;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(leftX, lineY);
  ctx.lineTo(leftX + metrics.width, lineY);
  ctx.stroke();
  ctx.restore();
}

function drawCellText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  options?: {
    bold?: boolean;
    fontSize?: number;
    align?: 'left' | 'center' | 'right';
    fill?: string;
    vertical?: boolean;
  }
) {
  ctx.save();
  if (options?.fill) {
    ctx.fillStyle = options.fill;
    ctx.fillRect(x, y, w, h);
  }
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  const fontSize = options?.fontSize ?? 11.5;
  ctx.font = `${options?.bold ? 'bold ' : ''}${fontSize}px ${FONT_FAMILY}`;
  ctx.fillStyle = '#000000';

  if (options?.vertical) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
  } else {
    const align = options?.align ?? 'center';
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    const pad = 7;
    const tx = align === 'left' ? x + pad : align === 'right' ? x + w - pad : x + w / 2;
    ctx.fillText(text, tx, y + h / 2, Math.max(10, w - pad * 1.6));
  }
  ctx.restore();
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: 'image/jpeg' | 'image/png',
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`Failed to generate ${type} image`));
      },
      type,
      quality
    );
  });
}

export interface ExportJpgResult {
  copied: boolean;
  filename: string;
}

export async function exportReportToJpg(params: ExportDocxParams): Promise<ExportJpgResult> {
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
    preparedBy,
  } = params;

  const effectivePreparedBy = preparedBy ?? dayState.preparedBy;
  const wingHeaderShort = (unitName || 'FLG WG').trim() || 'FLG WG';
  let filePrefix = `NT_Count_State_${(unitName || 'Unit').replace(/\s+/g, '_')}`;

  // Logical page dimensions (landscape 1160px for states, portrait 840px for Nominal Roll)
  const logicalWidth = isNominalRoll ? 840 : 1180;
  const marginX = 36;
  const marginTop = 34;
  const marginBottom = 36;
  const contentWidth = logicalWidth - marginX * 2;

  // Measure pass using a temporary 2D context
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d');
  if (!mCtx) {
    throw new Error('Canvas 2D context unavailable');
  }

  let requiredHeight = 600;
  const tableHeaderHeight = 132;
  const rowHeight = 28;

  // Prepare mode-specific geometry before allocating final canvas
  let wingColWidths: number[] = [];
  let unitColWidths: number[] = [];
  let nomColWidths: number[] = [];

  interface BreakdownBlock {
    title: string;
    columns: string[][];
    width: number;
    height: number;
  }
  const breakdownBlocks: BreakdownBlock[] = [];
  const breakdownGapX = 32;
  const breakdownGapY = 24;
  const breakdownLineHeight = 19;
  const breakdownTitleHeight = 24;

  if (isFlyingWing) {
    filePrefix = `Consolidated_Night_Count_State_${wingHeaderShort.replace(/\s+/g, '_')}`;
    mCtx.font = `bold 12px ${FONT_FAMILY}`;
    const maxUnitTextW = Math.max(
      110,
      ...wingSummary.rowSummaries.map((r) => mCtx.measureText(r.sqnUnit).width + 22)
    );
    const firstColW = Math.min(185, Math.max(125, Math.ceil(maxUnitTextW)));
    const remarksColW = 72;
    const middleCount = Math.max(1, wingColumns.length - 2);
    const eachMidW = (contentWidth - firstColW - remarksColW) / middleCount;
    wingColWidths = wingColumns.map((col, idx) => {
      if (idx === 0) return firstColW;
      if (col.key === 'remarks') return remarksColW;
      return eachMidW;
    });

    const tableRowsCount = wingSummary.rowSummaries.length + 1; // + Total row
    const tableBottomY = marginTop + 78 + tableHeaderHeight + tableRowsCount * rowHeight;
    const sigLinesCount =
      (effectivePreparedBy?.name ? 1 : 0) +
      (effectivePreparedBy?.rank ? 1 : 0) +
      (effectivePreparedBy?.appointment ? 1 : 0);
    requiredHeight = tableBottomY + 100 + Math.max(1, sigLinesCount) * 18 + marginBottom;
  } else if (isNominalRoll) {
    filePrefix = `Nominal_Roll_${unitName.replace(/\s+/g, '_')}`;
    nomColWidths = [46, 92, 68, 224, 114, 92, contentWidth - (46 + 92 + 68 + 224 + 114 + 92)];
    const nomRowH = 26;
    const rowsCount = Math.max(1, unitAirmen.length);
    requiredHeight = marginTop + 82 + 30 + rowsCount * nomRowH + marginBottom;
  } else {
    mCtx.font = `bold 12px ${FONT_FAMILY}`;
    const firstColW = Math.min(
      185,
      Math.max(125, Math.ceil(mCtx.measureText(unitName).width + 24))
    );
    const remarksColW = 78;
    const middleCount = Math.max(1, unitColumns.length - 2);
    const eachMidW = (contentWidth - firstColW - remarksColW) / middleCount;
    unitColWidths = unitColumns.map((col, idx) => {
      if (idx === 0) return firstColW;
      if (col.key === 'remarks') return remarksColW;
      return eachMidW;
    });

    const buildBlock = (title: string, lines: string[], splitAt15 = false): BreakdownBlock | null => {
      if (lines.length === 0) return null;
      const numbered = lines.map((l, idx) => `${idx + 1}. ${l}`);
      const cols =
        splitAt15 && numbered.length > 15
          ? [numbered.slice(0, 15), numbered.slice(15)]
          : [numbered];
      mCtx.font = `12px ${FONT_FAMILY}`;
      const colWidths = cols.map((colLines) =>
        Math.max(...colLines.map((ln) => Math.ceil(mCtx.measureText(ln).width) + 6))
      );
      mCtx.font = `bold 12.5px ${FONT_FAMILY}`;
      const titleW = Math.ceil(mCtx.measureText(title).width) + 4;
      const subColGap = 24;
      const totalColsW =
        colWidths.reduce((s, w) => s + w, 0) + (cols.length > 1 ? subColGap * (cols.length - 1) : 0);
      const blockW = Math.max(titleW, totalColsW);
      const maxRows = Math.max(...cols.map((c) => c.length));
      const blockH = breakdownTitleHeight + maxRows * breakdownLineHeight;
      return { title, columns: cols, width: blockW, height: blockH };
    };

    const rawBlocks = [
      buildBlock(
        'ON PARADE',
        onParadeAirmen.map((a) => `${a.rank} ${a.name}`),
        true
      ),
      buildBlock(
        'TDY',
        tdyDisposals.map((d) => {
          const sub = formatTdyDetail(d.detail || d.displayCategory);
          const suffix = sub && sub.trim().toUpperCase() !== 'TDY' ? ` - ${sub}` : '';
          return `${d.rank} ${d.name}${suffix}`;
        })
      ),
      buildBlock(
        'DUTY ON',
        dutyDisposals.map((d) => `${d.rank} ${d.name} - ${d.detail || d.displayCategory}`)
      ),
      buildBlock(
        'OFFICE',
        officeDisposals.map((d) => `${d.rank} ${d.name}`)
      ),
      ...separateGroups
        .filter((g) => g.items.length > 0)
        .map((g) =>
          buildBlock(
            g.name.toUpperCase(),
            g.items.map((d) => `${d.rank} ${d.name}`)
          )
        ),
    ].filter((b): b is BreakdownBlock => b !== null);

    breakdownBlocks.push(...rawBlocks);

    // Compute wrapped rows height for breakdown blocks
    let rowX = 0;
    let totalBreakdownH = 0;
    let currentRowMaxH = 0;
    breakdownBlocks.forEach((blk) => {
      if (rowX > 0 && rowX + blk.width > contentWidth) {
        totalBreakdownH += currentRowMaxH + breakdownGapY;
        rowX = 0;
        currentRowMaxH = 0;
      }
      rowX += blk.width + breakdownGapX;
      currentRowMaxH = Math.max(currentRowMaxH, blk.height);
    });
    if (breakdownBlocks.length > 0) {
      totalBreakdownH += currentRowMaxH;
    }

    const tableBottomY = marginTop + 78 + tableHeaderHeight + rowHeight;
    requiredHeight =
      tableBottomY +
      (breakdownBlocks.length > 0 ? 26 + totalBreakdownH : 0) +
      marginBottom;
  }

  // Create high-DPI canvas (2x scale for crisp text & sharp lines)
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(logicalWidth * scale);
  canvas.height = Math.round(requiredHeight * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to initialize canvas renderer');
  }

  ctx.scale(scale, scale);

  // Solid crisp white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, logicalWidth, requiredHeight);

  const centerX = logicalWidth / 2;

  const drawWingOrUnitRow = (
    row: ExportWingRow,
    colWidths: number[],
    y: number,
    options?: {
      isTotal?: boolean;
      remarksText?: string;
      firstColAlign?: 'left' | 'center';
      customVals?: number[];
    }
  ) => {
    const fill = options?.isTotal ? '#F2F2F2' : undefined;
    const isTotal = Boolean(options?.isTotal);
    const values: { text: string; bold?: boolean; align?: 'left' | 'center' }[] = [
      { text: row.sqnUnit, bold: true, align: options?.firstColAlign ?? 'left' },
      { text: valStr(row.totalStr), bold: true },
      { text: valStr(row.detTdy), bold: isTotal },
      { text: valStr(row.effStr), bold: true },
      { text: valStr(row.leave), bold: isTotal },
      { text: valStr(row.course), bold: isTotal },
      { text: valStr(row.awolDetention), bold: isTotal },
      { text: valStr(row.sickReport), bold: isTotal },
      { text: valStr(row.edExPpgf), bold: isTotal },
      { text: valStr(row.cmhBnsBshQmt), bold: isTotal },
      { text: valStr(row.ucUBoard), bold: isTotal },
      { text: valStr(row.officeDuty), bold: isTotal },
      { text: valStr(row.aftNiFlgNiDuty), bold: isTotal },
      { text: valStr(row.gdTfAirfieldDuty), bold: isTotal },
      { text: valStr(row.driving), bold: isTotal },
      ...(options?.customVals || []).map((cv) => ({ text: valStr(cv), bold: isTotal })),
      { text: valStr(row.totalOutParade), bold: true },
      { text: valStr(row.onParade), bold: true },
      { text: options?.remarksText ?? (row.remarks || 'Nil'), bold: isTotal },
    ];

    let curX = marginX;
    values.forEach((cell, idx) => {
      const w = colWidths[idx] ?? 36;
      drawCellText(ctx, cell.text, curX, y, w, rowHeight, {
        bold: cell.bold,
        fontSize: 11,
        align: cell.align ?? 'center',
        fill,
      });
      curX += w;
    });
  };

  if (isFlyingWing) {
    drawUnderlinedCenteredText(
      ctx,
      'CONSOLIDATED NIGHT COUNT STATE : BAF AIRMEN',
      centerX,
      marginTop + 16,
      `bold 15px ${FONT_FAMILY}`
    );
    drawUnderlinedCenteredText(
      ctx,
      wingHeaderShort,
      centerX,
      marginTop + 40,
      `bold 15px ${FONT_FAMILY}`
    );

    ctx.save();
    ctx.font = `bold 12px ${FONT_FAMILY}`;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'right';
    ctx.fillText(`Date: ${dayState.formattedDisplayDate}`, logicalWidth - marginX, marginTop + 66);
    ctx.restore();

    let curY = marginTop + 78;
    let curX = marginX;
    wingColumns.forEach((col, idx) => {
      const w = wingColWidths[idx];
      drawCellText(ctx, col.label, curX, curY, w, tableHeaderHeight, {
        bold: true,
        fontSize: 11.5,
        align: 'center',
        vertical: idx > 0,
      });
      curX += w;
    });
    curY += tableHeaderHeight;

    wingSummary.rowSummaries.forEach((r) => {
      drawWingOrUnitRow(r, wingColWidths, curY, {
        firstColAlign: 'left',
        customVals: wingSummary.savedCustomNames.map((c) => r.customDisposals?.[c] || 0),
        remarksText: r.remarks || 'Nil',
      });
      curY += rowHeight;
    });

    drawWingOrUnitRow(
      {
        sqnUnit: 'TOTAL',
        ...wingSummary.totals,
      },
      wingColWidths,
      curY,
      {
        isTotal: true,
        firstColAlign: 'center',
        customVals: wingSummary.savedCustomNames.map(
          (c) => wingSummary.totals.customDisposals[c] || 0
        ),
        remarksText: '-',
      }
    );
    curY += rowHeight;

    // Official Prepared By Signature Block
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    let sigY = curY + 34;
    ctx.font = `12px ${FONT_FAMILY}`;
    ctx.fillText('Prepared By', marginX, sigY);
    sigY += 56;
    if (effectivePreparedBy?.name) {
      ctx.font = `bold 12.5px ${FONT_FAMILY}`;
      ctx.fillText(effectivePreparedBy.name.toUpperCase(), marginX, sigY);
      sigY += 18;
    }
    if (effectivePreparedBy?.rank) {
      ctx.font = `bold 12px ${FONT_FAMILY}`;
      ctx.fillText(effectivePreparedBy.rank.toUpperCase(), marginX, sigY);
      sigY += 18;
    }
    if (effectivePreparedBy?.appointment) {
      ctx.font = `12px ${FONT_FAMILY}`;
      ctx.fillText(effectivePreparedBy.appointment.toUpperCase(), marginX, sigY);
    }
    ctx.restore();
  } else if (isNominalRoll) {
    drawUnderlinedCenteredText(
      ctx,
      'NOMINAL ROLL : BAF AIRMEN',
      centerX,
      marginTop + 16,
      `bold 15px ${FONT_FAMILY}`
    );
    drawUnderlinedCenteredText(
      ctx,
      unitName,
      centerX,
      marginTop + 40,
      `bold 15px ${FONT_FAMILY}`
    );

    ctx.save();
    ctx.font = `bold 12px ${FONT_FAMILY}`;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.fillText(`Total Personnel: ${unitAirmen.length}`, marginX, marginTop + 68);
    ctx.textAlign = 'right';
    ctx.fillText(`Date: ${dayState.formattedDisplayDate}`, logicalWidth - marginX, marginTop + 68);
    ctx.restore();

    let curY = marginTop + 82;
    const headers = ['Ser', 'BD No', 'Rank', 'Name', 'Trade', 'Flight', 'Disposal / Duty'];
    let curX = marginX;
    headers.forEach((h, idx) => {
      drawCellText(ctx, h, curX, curY, nomColWidths[idx], 30, {
        bold: true,
        fontSize: 11.5,
        align: 'center',
        fill: '#F2F2F2',
      });
      curX += nomColWidths[idx];
    });
    curY += 30;

    const nomRowH = 26;
    if (unitAirmen.length === 0) {
      drawCellText(ctx, 'No airmen in Nominal Roll', marginX, curY, contentWidth, nomRowH, {
        fontSize: 11.5,
        align: 'center',
      });
    } else {
      unitAirmen.forEach((a, idx) => {
        const disp = unitDisposalMap.get(a.id) || a.currentDuty || '-';
        const vals = [
          String(idx + 1),
          a.bdNo || '-',
          a.rank,
          a.name,
          a.trade || '-',
          a.flight || '-',
          disp,
        ];
        let rx = marginX;
        vals.forEach((v, cIdx) => {
          drawCellText(ctx, v, rx, curY, nomColWidths[cIdx], nomRowH, {
            bold: cIdx === 2 || cIdx === 3 || (cIdx === 6 && disp !== '-'),
            fontSize: 11,
            align: cIdx === 3 ? 'left' : 'center',
          });
          rx += nomColWidths[cIdx];
        });
        curY += nomRowH;
      });
    }
  } else {
    drawUnderlinedCenteredText(
      ctx,
      'NT COUNT STATE: AIRMEN',
      centerX,
      marginTop + 16,
      `bold 15px ${FONT_FAMILY}`
    );
    drawUnderlinedCenteredText(
      ctx,
      unitName,
      centerX,
      marginTop + 40,
      `bold 15px ${FONT_FAMILY}`
    );

    ctx.save();
    ctx.font = `bold 12px ${FONT_FAMILY}`;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'right';
    ctx.fillText(`Date: ${dayState.formattedDisplayDate}`, logicalWidth - marginX, marginTop + 66);
    ctx.restore();

    let curY = marginTop + 78;
    let curX = marginX;
    unitColumns.forEach((col, idx) => {
      const w = unitColWidths[idx];
      drawCellText(ctx, col.label, curX, curY, w, tableHeaderHeight, {
        bold: true,
        fontSize: 11.5,
        align: 'center',
        vertical: idx > 0,
      });
      curX += w;
    });
    curY += tableHeaderHeight;

    drawWingOrUnitRow(
      {
        ...summarizedUnit,
        sqnUnit: unitName,
      },
      unitColWidths,
      curY,
      {
        firstColAlign: 'center',
        customVals: customEntries.map(([, count]) => count),
        remarksText: currentRemarks || 'Nil',
      }
    );
    curY += rowHeight + 28;

    // Render Breakdown Sections (ON PARADE, TDY, DUTY ON, OFFICE, LEAVE, etc.)
    let bx = marginX;
    let by = curY;
    let rowMaxH = 0;

    breakdownBlocks.forEach((blk) => {
      if (bx > marginX && bx + blk.width > logicalWidth - marginX) {
        bx = marginX;
        by += rowMaxH + breakdownGapY;
        rowMaxH = 0;
      }

      drawUnderlinedLeftText(ctx, blk.title, bx, by + 13, `bold 12.5px ${FONT_FAMILY}`);

      ctx.save();
      ctx.font = `12px ${FONT_FAMILY}`;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';

      let subX = bx;
      blk.columns.forEach((colLines) => {
        let maxSubW = 0;
        colLines.forEach((line, lIdx) => {
          const ly = by + breakdownTitleHeight + 13 + lIdx * breakdownLineHeight;
          ctx.fillText(line, subX, ly);
          maxSubW = Math.max(maxSubW, Math.ceil(ctx.measureText(line).width));
        });
        subX += maxSubW + 24;
      });
      ctx.restore();

      bx += blk.width + breakdownGapX;
      rowMaxH = Math.max(rowMaxH, blk.height);
    });
  }

  // Generate JPG for download AND PNG for clipboard copy
  // Start clipboard write immediately with Promise<Blob> to preserve user gesture token across browsers
  let clipboardCopyPromise: Promise<boolean> = Promise.resolve(false);
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.write === 'function' &&
    typeof ClipboardItem !== 'undefined'
  ) {
    try {
      const pngBlobPromise = canvasToBlob(canvas, 'image/png');
      clipboardCopyPromise = navigator.clipboard
        .write([new ClipboardItem({ 'image/png': pngBlobPromise })])
        .then(() => true)
        .catch(() => false);
    } catch {
      clipboardCopyPromise = Promise.resolve(false);
    }
  }

  const jpgBlob = await canvasToBlob(canvas, 'image/jpeg', 0.96);
  const filename = `${filePrefix}_${dayState.date}.jpg`;
  const url = URL.createObjectURL(jpgBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);

  const copied = await clipboardCopyPromise;
  return { copied, filename };
}
