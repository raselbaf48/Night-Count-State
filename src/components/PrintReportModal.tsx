import React from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { DayState, WingConfig } from '../types/nightCount';
import {
  calculateUnitSummarizedRow,
  categorizeUnitDisposals,
  getFlyingWingSummary,
  getUnitAirmen,
  getUnitRemarks,
  getWingPreparedBy,
} from '../utils/storage';
import { exportReportToDocx } from '../utils/exportDocx';

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayState: DayState;
  activeTab?: string;
  activeWing?: WingConfig;
  unitSubTab?: 'state' | 'nominalRoll';
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  dayState,
  activeTab = '155 UASU BAF',
  activeWing,
  unitSubTab = 'state',
}) => {
  if (!isOpen) return null;

  const isFlyingWing = activeWing ? activeTab === activeWing.name : activeTab === 'Flying Wing';
  const isNominalRoll = !isFlyingWing && unitSubTab === 'nominalRoll';
  const wingShortName = activeWing?.shortName || 'FLG WG';
  const wingDisplayName = activeWing?.name || 'Flying Wing';
  const unitName = isFlyingWing ? wingShortName : activeTab;
  const effectivePreparedBy = getWingPreparedBy(activeWing, dayState.preparedBy);

  const displayVal = (val: number | string) => {
    if (typeof val === 'number') {
      return val === 0 ? '-' : val;
    }
    return val || '-';
  };

  // --- Mode 1: Flying Wing Consolidated Data ---
  const wingSummary = getFlyingWingSummary(dayState, activeWing?.units);
  const wingColumns = [
    { key: 'sqnUnit', label: 'Sqn/Unit' },
    { key: 'totalStr', label: 'Total Str' },
    { key: 'detTdy', label: 'Det/Tdy' },
    { key: 'effStr', label: 'Eff Str' },
    { key: 'leave', label: 'Leave' },
    { key: 'course', label: 'Course' },
    { key: 'awolDetention', label: 'AWOL/Detention' },
    { key: 'sickReport', label: 'Sick report' },
    { key: 'edExPpgf', label: 'ED/EX PPGF' },
    { key: 'cmhBnsBshQmt', label: 'CMH/ BNS/ BSH/Qmt' },
    { key: 'ucUBoard', label: 'U/C, U/Board' },
    { key: 'officeDuty', label: 'Office Duty' },
    { key: 'aftNiFlgNiDuty', label: 'Aft/Ni flg/Ni Duty' },
    { key: 'gdTfAirfieldDuty', label: 'GD/TF/Airfield Duty' },
    { key: 'driving', label: 'Driving' },
    ...wingSummary.savedCustomNames.map((customName) => ({
      key: `custom-${customName}`,
      label: customName,
    })),
    { key: 'totalOutParade', label: 'Total Out Parade' },
    { key: 'onParade', label: 'On Parade' },
    { key: 'remarks', label: 'Remarks' },
  ];

  // --- Mode 2: Unit Nominal Roll Data ---
  const unitAirmen = isNominalRoll ? getUnitAirmen(dayState, unitName) : [];
  const unitDisposalMap = new Map<string, string>();
  if (isNominalRoll) {
    dayState.disposals
      .filter((d) => d.unit === unitName)
      .forEach((d) => {
        if (d.airmanId) {
          unitDisposalMap.set(d.airmanId, d.detail || d.displayCategory);
        }
      });
  }

  // --- Mode 3: Single Unit Night Count State Data ---
  const summarizedUnit = !isFlyingWing
    ? calculateUnitSummarizedRow(dayState, unitName)
    : calculateUnitSummarizedRow(dayState, '155 UASU BAF');
  const currentRemarks = !isFlyingWing ? getUnitRemarks(dayState, unitName) : '';

  const unitDisposals = !isFlyingWing ? dayState.disposals.filter((d) => d.unit === unitName) : [];
  const { tdyDisposals, dutyDisposals, officeDisposals, separateGroups } =
    categorizeUnitDisposals(unitDisposals);

  const onParadeAirmen = !isFlyingWing
    ? getUnitAirmen(dayState, unitName).filter(
        (a) => a.status === 'on_parade' && !unitDisposals.some((d) => d.airmanId === a.id)
      )
    : [];

  const formatTdyDetail = (detail: string) => {
    const match = detail.match(/^TDY\s*\(([^)]+)\)$/i);
    return match ? match[1].trim() : detail;
  };

  const customEntries = Object.entries(summarizedUnit.customDisposals || {});

  const unitColumns = [
    { key: 'sqnUnit', label: 'Sqn/Unit' },
    { key: 'totalStr', label: 'Total Str' },
    { key: 'detTdy', label: 'Det/Tdy' },
    { key: 'effStr', label: 'Eff Str' },
    { key: 'leave', label: 'Leave' },
    { key: 'course', label: 'Course' },
    { key: 'awolDetention', label: 'AWOL/Detention' },
    { key: 'sickReport', label: 'Sick report' },
    { key: 'edExPpgf', label: 'ED/EX PPGF' },
    { key: 'cmhBnsBshQmt', label: 'CMH/ BNS/ BSH/Qmt' },
    { key: 'ucUBoard', label: 'U/C, U/Board' },
    { key: 'officeDuty', label: 'Office Duty' },
    { key: 'aftNiFlgNiDuty', label: 'Aft/Ni flg/Ni Duty' },
    { key: 'gdTfAirfieldDuty', label: 'GD/TF/Airfield Duty' },
    { key: 'driving', label: 'Driving' },
    ...customEntries.map(([customName]) => ({
      key: `custom-${customName}`,
      label: customName,
    })),
    { key: 'totalOutParade', label: 'Total Out Parade' },
    { key: 'onParade', label: 'On Parade' },
    { key: 'remarks', label: 'Remarks' },
  ];

  const handlePrint = () => {
    window.print();
  };

  const handleExportDoc = async () => {
    await exportReportToDocx({
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
      preparedBy: effectivePreparedBy,
    });
  };

  const modalTitle = isFlyingWing
    ? `Print Preview: ${wingDisplayName} (Consolidated)`
    : isNominalRoll
    ? `Print Preview: ${unitName} — Nominal Roll`
    : `Print Preview: ${unitName}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 print:static print:inset-auto print:block print:p-0 print:bg-white">
      <div className="bg-[#0b1424] border border-slate-700/80 w-full max-w-6xl max-h-[95vh] flex flex-col rounded-xl shadow-2xl overflow-hidden text-slate-200 print:max-h-none print:max-w-none print:w-full print:block print:border-0 print:rounded-none print:shadow-none print:overflow-visible print:bg-white print:text-black">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-[#0e1b30] border-b border-slate-700/80 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer shrink-0"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-100 truncate">
                {modalTitle}
              </h3>
              <p className="text-[11px] text-slate-400">Review document before printing</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportDoc}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2563eb] hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
              title="Download Microsoft Word document"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export Doc</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
              title="Print document to printer or PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Printable Document Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#070d18] print:overflow-visible print:p-0 print:bg-white">
          <div className="bg-[#0b1424] border border-slate-700/80 rounded-xl p-5 sm:p-7 shadow-2xl max-w-6xl mx-auto print-card text-[12px] print:max-w-none">
            {isFlyingWing ? (
              <>
                <div className="flex flex-col items-center justify-center text-center mb-2">
                  <h2 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase underline decoration-slate-400 underline-offset-4">
                    CONSOLIDATED NIGHT COUNT STATE : BAF AIRMEN
                  </h2>
                  <h3 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mt-0.5">
                    {wingShortName}
                  </h3>
                </div>

                <div className="flex justify-end mb-1.5">
                  <span className="text-[12px] font-semibold text-slate-200">
                    Date: {dayState.formattedDisplayDate}
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-700/80 rounded bg-[#070e1b] print:overflow-visible print:border-0 print:rounded-none print:bg-white">
                  <table className="w-full table-auto text-[12px] text-center border-collapse print-table">
                    <thead>
                      <tr className="bg-[#0f1b2f] border-b border-slate-700 text-slate-200">
                        {wingColumns.map((col, idx) => (
                          <th
                            key={col.key}
                            className={`border-r last:border-r-0 border-slate-700/80 py-2 font-semibold text-[12px] align-middle text-center whitespace-nowrap ${
                              idx === 0 ? 'px-3' : col.key === 'remarks' ? 'px-1 w-px h-36 print:h-[115px]' : 'px-1.5 h-36 print:h-[115px]'
                            }`}
                          >
                            {idx === 0 ? (
                              <div className="flex items-center justify-center text-center">
                                {col.label}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full w-full">
                                <div className="writing-vertical text-slate-200 font-medium text-[12px]">
                                  {col.label}
                                </div>
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-slate-200 text-[12px]">
                      {wingSummary.rowSummaries.map((summary) => (
                        <tr key={summary.sqnUnit} className="border-b border-slate-800/80 text-slate-100">
                          <td className="px-3 py-2 font-bold text-left whitespace-nowrap border-r border-slate-700/80">
                            {summary.sqnUnit}
                          </td>
                          <td className="px-2 py-2 border-r border-slate-700/80 font-bold text-slate-100 whitespace-nowrap">
                            {displayVal(summary.totalStr)}
                          </td>
                          <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                            {displayVal(summary.detTdy)}
                          </td>
                          <td className="px-2 py-2 border-r border-slate-700/80 font-bold text-emerald-400 whitespace-nowrap">
                            {displayVal(summary.effStr)}
                          </td>
                          <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                            {displayVal(summary.leave)}
                          </td>
                          <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                            {displayVal(summary.course)}
                          </td>
                          <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                            {displayVal(summary.awolDetention)}
                          </td>
                          <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                            {displayVal(summary.sickReport)}
                          </td>
                          <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                            {displayVal(summary.edExPpgf)}
                          </td>
                          <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                            {displayVal(summary.cmhBnsBshQmt)}
                          </td>
                          <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                            {displayVal(summary.ucUBoard)}
                          </td>
                          <td className="px-2 py-2 border-r border-slate-700/80 font-semibold text-amber-300 whitespace-nowrap">
                            {displayVal(summary.officeDuty)}
                          </td>
                          <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                            {displayVal(summary.aftNiFlgNiDuty)}
                          </td>
                          <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                            {displayVal(summary.gdTfAirfieldDuty)}
                          </td>
                          <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                            {displayVal(summary.driving)}
                          </td>
                          {wingSummary.savedCustomNames.map((cName) => (
                            <td
                              key={`print-wing-${summary.sqnUnit}-${cName}`}
                              className="px-2 py-2 border-r border-slate-700/80 font-semibold text-amber-300 whitespace-nowrap"
                            >
                              {displayVal(summary.customDisposals?.[cName] || 0)}
                            </td>
                          ))}
                          <td className="px-2 py-2 border-r border-slate-700/80 font-bold text-rose-400 whitespace-nowrap">
                            {displayVal(summary.totalOutParade)}
                          </td>
                          <td className="px-2 py-2 border-r border-slate-700/80 font-bold text-emerald-400 whitespace-nowrap">
                            {displayVal(summary.onParade)}
                          </td>
                          <td className="px-1.5 py-2 text-slate-300 text-[12px] whitespace-nowrap w-px">
                            {summary.remarks || 'Nil'}
                          </td>
                        </tr>
                      ))}

                      <tr className="bg-[#0e1b2f] border-t-2 border-slate-600 text-slate-100 font-bold text-[12px]">
                        <td className="px-3 py-2.5 text-center border-r border-slate-700/80 text-white uppercase tracking-wider whitespace-nowrap">
                          Total
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-white whitespace-nowrap">
                          {displayVal(wingSummary.totals.totalStr)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                          {displayVal(wingSummary.totals.detTdy)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-emerald-400 whitespace-nowrap">
                          {displayVal(wingSummary.totals.effStr)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                          {displayVal(wingSummary.totals.leave)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                          {displayVal(wingSummary.totals.course)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                          {displayVal(wingSummary.totals.awolDetention)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                          {displayVal(wingSummary.totals.sickReport)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                          {displayVal(wingSummary.totals.edExPpgf)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                          {displayVal(wingSummary.totals.cmhBnsBshQmt)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                          {displayVal(wingSummary.totals.ucUBoard)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-amber-300 whitespace-nowrap">
                          {displayVal(wingSummary.totals.officeDuty)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                          {displayVal(wingSummary.totals.aftNiFlgNiDuty)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                          {displayVal(wingSummary.totals.gdTfAirfieldDuty)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                          {displayVal(wingSummary.totals.driving)}
                        </td>
                        {wingSummary.savedCustomNames.map((cName) => (
                          <td
                            key={`print-wing-total-${cName}`}
                            className="px-2 py-2 border-r border-slate-700/80 text-amber-300 whitespace-nowrap"
                          >
                            {displayVal(wingSummary.totals.customDisposals[cName] || 0)}
                          </td>
                        ))}
                        <td className="px-2 py-2 border-r border-slate-700/80 text-rose-400 whitespace-nowrap">
                          {displayVal(wingSummary.totals.totalOutParade)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-emerald-400 whitespace-nowrap">
                          {displayVal(wingSummary.totals.onParade)}
                        </td>
                        <td className="px-1.5 py-2 text-slate-400 whitespace-nowrap w-px">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Official Prepared By Signature Block */}
                <div className="mt-8 pt-2 text-left text-[12px] text-slate-200">
                  <div className="text-slate-300 font-normal mb-14">Prepared By</div>
                  {effectivePreparedBy?.name && (
                    <div className="font-bold text-slate-100 uppercase tracking-wide leading-snug">
                      {effectivePreparedBy.name}
                    </div>
                  )}
                  {effectivePreparedBy?.rank && (
                    <div className="font-bold text-slate-200 uppercase leading-snug">
                      {effectivePreparedBy.rank}
                    </div>
                  )}
                  {effectivePreparedBy?.appointment && (
                    <div className="text-slate-300 uppercase leading-snug">
                      {effectivePreparedBy.appointment}
                    </div>
                  )}
                </div>
              </>
            ) : isNominalRoll ? (
              <>
                <div className="flex flex-col items-center justify-center text-center mb-2">
                  <h2 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase underline decoration-slate-400 underline-offset-4">
                    NOMINAL ROLL : BAF AIRMEN
                  </h2>
                  <h3 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mt-0.5">
                    {unitName}
                  </h3>
                </div>

                <div className="flex justify-between items-center mb-2 text-[12px] font-semibold text-slate-200">
                  <span>Total Personnel: {unitAirmen.length}</span>
                  <span>Date: {dayState.formattedDisplayDate}</span>
                </div>

                <div className="overflow-x-auto border border-slate-700/80 rounded bg-[#070e1b] print:overflow-visible print:border-0 print:rounded-none print:bg-white">
                  <table className="w-full text-[12px] text-left border-collapse print-table">
                    <thead>
                      <tr className="bg-[#0f1b2f] border-b border-slate-700 text-slate-200">
                        <th className="py-2 px-3 border-r border-slate-700/80 text-center w-12">Ser</th>
                        <th className="py-2 px-3 border-r border-slate-700/80 text-center w-24">BD No</th>
                        <th className="py-2 px-3 border-r border-slate-700/80 text-center w-20">Rank</th>
                        <th className="py-2 px-3 border-r border-slate-700/80">Name</th>
                        <th className="py-2 px-3 border-r border-slate-700/80">Trade</th>
                        <th className="py-2 px-3 border-r border-slate-700/80">Flight</th>
                        <th className="py-2 px-3 text-center">Disposal / Duty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unitAirmen.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                            No airmen found in Nominal Roll
                          </td>
                        </tr>
                      ) : (
                        unitAirmen.map((airman, idx) => {
                          const disp = unitDisposalMap.get(airman.id) || airman.currentDuty || '-';
                          return (
                            <tr key={airman.id} className="border-b border-slate-800/80 text-slate-100">
                              <td className="py-2 px-3 border-r border-slate-700/80 text-center text-slate-400">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-700/80 text-center text-emerald-400 font-semibold">
                                {airman.bdNo || '-'}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-700/80 text-center font-bold">
                                {airman.rank}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-700/80 font-semibold text-white">
                                {airman.name}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-700/80 text-slate-300">
                                {airman.trade || '-'}
                              </td>
                              <td className="py-2 px-3 border-r border-slate-700/80 text-slate-300">
                                {airman.flight || '-'}
                              </td>
                              <td
                                className={`py-2 px-3 text-center font-semibold ${
                                  disp !== '-' ? 'text-amber-300' : 'text-slate-400'
                                }`}
                              >
                                {disp}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center justify-center text-center mb-2">
                  <h2 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase underline decoration-slate-400 underline-offset-4">
                    NT COUNT STATE: AIRMEN
                  </h2>
                  <h3 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mt-0.5">
                    {unitName}
                  </h3>
                </div>

                <div className="flex justify-end mb-1.5">
                  <span className="text-[12px] font-semibold text-slate-200">
                    Date: {dayState.formattedDisplayDate}
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-700/80 rounded bg-[#070e1b] mb-6 print:overflow-visible print:border-0 print:rounded-none print:bg-white">
                  <table className="w-full table-auto text-[12px] text-center border-collapse print-table">
                    <thead>
                      <tr className="bg-[#0f1b2f] border-b border-slate-700 text-slate-200">
                        {unitColumns.map((col, idx) => (
                          <th
                            key={col.key}
                            className={`border-r last:border-r-0 border-slate-700/80 py-2 font-semibold text-[12px] align-middle text-center whitespace-nowrap ${
                              idx === 0 ? 'px-3' : col.key === 'remarks' ? 'px-1 w-px h-36 print:h-[115px]' : 'px-1.5 h-36 print:h-[115px]'
                            }`}
                          >
                            {idx === 0 ? (
                              <div className="flex items-center justify-center text-center">
                                {col.label}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full w-full">
                                <div className="writing-vertical text-slate-200 font-medium text-[12px]">
                                  {col.label}
                                </div>
                              </div>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-800 text-slate-100 text-[12px]">
                        <td className="px-3 py-2.5 font-bold text-center whitespace-nowrap text-slate-100 border-r border-slate-700/80">
                          {unitName}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 font-bold text-slate-100 whitespace-nowrap">
                          {displayVal(summarizedUnit.totalStr)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                          {displayVal(summarizedUnit.detTdy)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 font-bold text-emerald-400 whitespace-nowrap">
                          {displayVal(summarizedUnit.effStr)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                          {displayVal(summarizedUnit.leave)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                          {displayVal(summarizedUnit.course)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                          {displayVal(summarizedUnit.awolDetention)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                          {displayVal(summarizedUnit.sickReport)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                          {displayVal(summarizedUnit.edExPpgf)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                          {displayVal(summarizedUnit.cmhBnsBshQmt)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                          {displayVal(summarizedUnit.ucUBoard)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 font-semibold text-amber-300 whitespace-nowrap">
                          {displayVal(summarizedUnit.officeDuty)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                          {displayVal(summarizedUnit.aftNiFlgNiDuty)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                          {displayVal(summarizedUnit.gdTfAirfieldDuty)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                          {displayVal(summarizedUnit.driving)}
                        </td>
                        {customEntries.map(([customName, count]) => (
                          <td
                            key={`print-custom-${customName}`}
                            className="px-2 py-2 border-r border-slate-700/80 font-semibold text-amber-300 whitespace-nowrap"
                          >
                            {displayVal(count)}
                          </td>
                        ))}
                        <td className="px-2 py-2 border-r border-slate-700/80 font-bold text-rose-400 whitespace-nowrap">
                          {displayVal(summarizedUnit.totalOutParade)}
                        </td>
                        <td className="px-2 py-2 border-r border-slate-700/80 font-bold text-emerald-400 whitespace-nowrap">
                          {displayVal(summarizedUnit.onParade)}
                        </td>
                        <td className="px-1.5 py-2 text-slate-300 text-[12px] whitespace-nowrap w-px">
                          {currentRemarks || 'Nil'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Breakdown Lists: only render sections with entries */}
                {(onParadeAirmen.length > 0 ||
                  tdyDisposals.length > 0 ||
                  dutyDisposals.length > 0 ||
                  officeDisposals.length > 0 ||
                  separateGroups.some((g) => g.items.length > 0)) && (
                  <div className="flex flex-row flex-wrap gap-x-12 sm:gap-x-16 gap-y-6 text-[12px] text-slate-200">
                    {onParadeAirmen.length > 0 && (
                      <div>
                        <h4 className="font-bold text-[12px] text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mb-2.5">
                          ON PARADE
                        </h4>
                        <div className="flex flex-row gap-6 sm:gap-10">
                          <div className="space-y-1">
                            {onParadeAirmen.slice(0, 15).map((airman, idx) => (
                              <div key={airman.id} className="py-0.5 whitespace-nowrap">
                                <span className="text-slate-400 font-medium">{idx + 1}. </span>
                                <span className="text-slate-200 font-medium">
                                  {airman.rank} {airman.name}
                                </span>
                              </div>
                            ))}
                          </div>
                          {onParadeAirmen.length > 15 && (
                            <div className="space-y-1">
                              {onParadeAirmen.slice(15).map((airman, idx) => (
                                <div key={airman.id} className="py-0.5 whitespace-nowrap">
                                  <span className="text-slate-400 font-medium">{idx + 16}. </span>
                                  <span className="text-slate-200 font-medium">
                                    {airman.rank} {airman.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {tdyDisposals.length > 0 && (
                      <div>
                        <h4 className="font-bold text-[12px] text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mb-2.5">
                          TDY
                        </h4>
                        <div className="space-y-1">
                          {tdyDisposals.map((disp, idx) => {
                            const tdySub = formatTdyDetail(disp.detail || disp.displayCategory);
                            const showSub = tdySub && tdySub.trim().toUpperCase() !== 'TDY';
                            return (
                              <div key={disp.id} className="py-0.5 whitespace-nowrap">
                                <span className="text-slate-400 font-medium">{idx + 1}. </span>
                                <span className="text-slate-200 font-medium">
                                  {disp.rank} {disp.name}
                                  {showSub ? ` - ${tdySub}` : ''}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {dutyDisposals.length > 0 && (
                      <div>
                        <h4 className="font-bold text-[12px] text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mb-2.5">
                          DUTY ON
                        </h4>
                        <div className="space-y-1">
                          {dutyDisposals.map((disp, idx) => (
                            <div key={disp.id} className="py-0.5 whitespace-nowrap">
                              <span className="text-slate-400 font-medium">{idx + 1}. </span>
                              <span className="text-slate-200 font-medium">
                                {disp.rank} {disp.name} - {disp.detail || disp.displayCategory}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {officeDisposals.length > 0 && (
                      <div>
                        <h4 className="font-bold text-[12px] text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mb-2.5">
                          OFFICE
                        </h4>
                        <div className="space-y-1">
                          {officeDisposals.map((disp, idx) => (
                            <div key={disp.id} className="py-0.5 whitespace-nowrap">
                              <span className="text-slate-400 font-medium">{idx + 1}. </span>
                              <span className="text-slate-200 font-medium">
                                {disp.rank} {disp.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {separateGroups
                      .filter((group) => group.items.length > 0)
                      .map((group) => (
                        <div key={`print-section-${group.name}`}>
                          <h4 className="font-bold text-[12px] text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mb-2.5">
                            {group.name}
                          </h4>
                          <div className="space-y-1">
                            {group.items.map((disp, idx) => (
                              <div key={disp.id} className="py-0.5 whitespace-nowrap">
                                <span className="text-slate-400 font-medium">{idx + 1}. </span>
                                <span className="text-slate-200 font-medium">
                                  {disp.rank} {disp.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
