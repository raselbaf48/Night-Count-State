import React, { useRef } from 'react';
import { DayState, Airman } from '../types/nightCount';
import {
  calculateUnitSummarizedRow,
  categorizeUnitDisposals,
  getUnitAirmen,
  getUnitRemarks,
  sortAirmenBySeniority,
} from '../utils/storage';

interface UnitStateViewProps {
  unitName?: string;
  dayState: DayState;
  onRemoveDisposal?: (id: string) => void;
  onToggleAirmanParade?: (airmanId: string) => void;
  onSelectAirmanForDisposal?: (airman: Airman) => void;
  onUpdateRemarks: (remarks: string) => void;
  onCommitRemarks?: (remarks: string) => void;
  onRequireAuth?: (onSuccess: () => void) => void;
  isOperatorVerified?: boolean;
  canEditRemarks?: boolean;
  isGuestView?: boolean;
}

export const UnitStateView: React.FC<UnitStateViewProps> = ({
  unitName = '155 UASU BAF',
  dayState,
  onUpdateRemarks,
  onCommitRemarks,
  onRequireAuth,
  isOperatorVerified = false,
  canEditRemarks = true,
  isGuestView = false,
}) => {
  const remarksInputRef = useRef<HTMLInputElement>(null);
  const initialRemarksRef = useRef<string>('');
  const summarized = calculateUnitSummarizedRow(dayState, unitName);
  const currentRemarks = getUnitRemarks(dayState, unitName);

  // Separate disposals: TDY, Duty On (ONLY GD/BTF/NTF/Airfield/Escort), Office, and individual sections for all others
  const unitAirmen = getUnitAirmen(dayState, unitName);
  const unitDisposals = dayState.disposals.filter((d) => d.unit === unitName);
  const { tdyDisposals, dutyDisposals, officeDisposals, separateGroups } =
    categorizeUnitDisposals(unitDisposals, unitAirmen);
  const disposalAirmanIds = new Set(unitDisposals.map((d) => d.airmanId).filter(Boolean));

  // Airmen who are explicitly on parade for this unit (sorted by seniority)
  const onParadeAirmen = sortAirmenBySeniority(
    unitAirmen.filter((a) => !disposalAirmanIds.has(a.id) && a.status === 'on_parade')
  );

  const displayVal = (val: number | string) => {
    if (typeof val === 'number') {
      return val === 0 ? '-' : val;
    }
    return val || '-';
  };

  const formatTdyDetail = (detail: string) => {
    const match = detail.match(/^TDY\s*\(([^)]+)\)$/i);
    return match ? match[1].trim() : detail;
  };

  const customEntries = Object.entries(summarized.customDisposals || {});

  const columns = [
    { key: 'sqnUnit', label: 'Sqn/Unit' },
    { key: 'totalStr', label: 'Total Str' },
    { key: 'detTdy', label: 'Det/Tdy' },
    { key: 'effStr', label: 'Eff Str' },
    { key: 'leave', label: 'Leave' },
    { key: 'course', label: 'Course' },
    { key: 'awolDetention', label: 'AWOL/Detention' },
    { key: 'sickReport', label: 'Sick report' },
    { key: 'edExPpgf', label: 'ED/EX PPGF' },
    { key: 'cmhBnsBshQmt', label: 'CMH/ BNS/ BSH' },
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

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pb-12 text-[12px]">
      {/* Outer Military Report Card */}
      <div className="bg-[#0b1424] border border-[#1b2a44] rounded-xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        {isGuestView && (
          <div className="mb-4 px-3.5 py-2 rounded-lg bg-sky-950/40 border border-sky-500/35 text-sky-300 text-[11px] font-semibold text-center">
            Guest Preview Mode — Format Only (Personnel roster &amp; disposals hidden)
          </div>
        )}
        {/* Document Header */}
        <div className="flex flex-col items-center justify-center text-center mb-2">
          <h2 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase underline decoration-slate-400 underline-offset-4">
            NT COUNT STATE: AIRMEN
          </h2>
          <h3 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mt-0.5">
            {unitName}
          </h3>
        </div>

        {/* Date immediately above top-right corner of the table */}
        <div className="flex justify-end mb-1.5">
          <span className="text-[12px] font-semibold text-slate-200">
            Date: {dayState.formattedDisplayDate}
          </span>
        </div>

        {/* The Military State Table - Autofit Columns, 12px Font, Centered Headings */}
        <div className="overflow-x-auto border border-slate-700/80 rounded bg-[#070e1b] mb-7">
          <table className="w-full table-auto text-[12px] text-center border-collapse">
            <thead>
              <tr className="bg-[#0f1b2f] border-b border-slate-700 text-slate-200">
                {columns.map((col, idx) => (
                  <th
                    key={col.key}
                    className={`border-r last:border-r-0 border-slate-700/80 py-2 font-semibold text-[12px] align-middle text-center whitespace-nowrap ${
                      idx === 0 ? 'px-3' : col.key === 'remarks' ? 'px-1 w-px h-36' : 'px-1.5 h-36'
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
              <tr className="border-b border-slate-800 text-slate-100 hover:bg-[#122038] transition-colors text-[12px]">
                <td className="px-3 py-2.5 font-bold text-center whitespace-nowrap text-slate-100 border-r border-slate-700/80">
                  {unitName}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 font-bold text-slate-100 whitespace-nowrap">
                  {displayVal(summarized.totalStr)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                  {displayVal(summarized.detTdy)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 font-bold text-emerald-400 whitespace-nowrap">
                  {displayVal(summarized.effStr)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                  {displayVal(summarized.leave)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                  {displayVal(summarized.course)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                  {displayVal(summarized.awolDetention)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                  {displayVal(summarized.sickReport)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                  {displayVal(summarized.edExPpgf)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                  {displayVal(summarized.cmhBnsBshQmt)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                  {displayVal(summarized.ucUBoard)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 font-semibold text-amber-300 whitespace-nowrap">
                  {displayVal(summarized.officeDuty)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                  {displayVal(summarized.aftNiFlgNiDuty)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                  {displayVal(summarized.gdTfAirfieldDuty)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-400 whitespace-nowrap">
                  {displayVal(summarized.driving)}
                </td>
                {customEntries.map(([customName, count]) => (
                  <td
                    key={`custom-val-${customName}`}
                    className="px-2 py-2 border-r border-slate-700/80 font-semibold text-amber-300 whitespace-nowrap"
                  >
                    {displayVal(count)}
                  </td>
                ))}
                <td className="px-2 py-2 border-r border-slate-700/80 font-bold text-rose-400 whitespace-nowrap">
                  {displayVal(summarized.totalOutParade)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 font-bold text-emerald-400 whitespace-nowrap">
                  {displayVal(summarized.onParade)}
                </td>
                <td className="px-1 py-1 text-slate-300 text-[12px] whitespace-nowrap w-px">
                  <div className="inline-grid items-center justify-items-center">
                    <span className="invisible col-start-1 row-start-1 px-1 text-[12px] whitespace-pre">
                      {currentRemarks || 'Nil'}
                    </span>
                    <input
                      ref={remarksInputRef}
                      type="text"
                      value={currentRemarks}
                      readOnly={!canEditRemarks}
                      placeholder="Nil"
                      onFocus={() => {
                        if (!canEditRemarks) {
                          remarksInputRef.current?.blur();
                          return;
                        }
                        initialRemarksRef.current = currentRemarks;
                        if (!isOperatorVerified && onRequireAuth) {
                          remarksInputRef.current?.blur();
                          onRequireAuth(() => {
                            setTimeout(() => {
                              remarksInputRef.current?.focus();
                            }, 50);
                          });
                          return;
                        }
                      }}
                      onChange={(e) => canEditRemarks && onUpdateRemarks(e.target.value)}
                      onBlur={(e) => {
                        if (
                          canEditRemarks &&
                          isOperatorVerified &&
                          onCommitRemarks &&
                          e.target.value !== initialRemarksRef.current
                        ) {
                          onCommitRemarks(e.target.value);
                        }
                      }}
                      className="col-start-1 row-start-1 w-full min-w-[24px] bg-transparent px-1 py-0.5 text-center text-[12px] text-slate-300 placeholder:text-slate-600 focus:outline-none focus:bg-slate-800/60 rounded"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Nominal Roll Breakdown: only render sections that have personnel */}
        {(onParadeAirmen.length > 0 ||
          tdyDisposals.length > 0 ||
          dutyDisposals.length > 0 ||
          officeDisposals.length > 0 ||
          separateGroups.some((g) => g.items.length > 0)) && (
          <div className="flex flex-row flex-wrap gap-x-12 sm:gap-x-16 gap-y-6 text-[12px] text-slate-200">
            {/* Section 1: On Parade */}
            {onParadeAirmen.length > 0 && (
              <div>
                <h4 className="font-bold text-[12px] text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mb-2.5">
                  ON PARADE
                </h4>
                <div className="flex flex-row gap-6 sm:gap-10">
                  {/* Sub-Column 1: 1 to 15 */}
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

                  {/* Sub-Column 2: 16 onwards */}
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

            {/* Section 2: TDY (Separated from Duty On) */}
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
                          {disp.rank} {disp.name}{showSub ? ` - ${tdySub}` : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 3: Duty On */}
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

            {/* Section 4: Office (Separated from Duty On) */}
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

            {/* Separate Individual Disposal Sections (Leave, Course, AWOL, Sick Report, Driving, Custom, etc.) */}
            {separateGroups
              .filter((group) => group.items.length > 0)
              .map((group) => (
                <div key={`section-${group.name}`}>
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

        {isGuestView && (
          <div className="flex flex-row flex-wrap gap-x-12 sm:gap-x-16 gap-y-6 text-[12px] text-slate-400 italic">
            <div>
              <h4 className="font-bold text-[12px] text-slate-300 uppercase underline decoration-slate-500 underline-offset-4 mb-2.5 not-italic">
                ON PARADE
              </h4>
              <div className="space-y-1">
                <div className="py-0.5 whitespace-nowrap">1. [Rank] [Name]</div>
                <div className="py-0.5 whitespace-nowrap">2. [Rank] [Name]</div>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-[12px] text-slate-300 uppercase underline decoration-slate-500 underline-offset-4 mb-2.5 not-italic">
                TDY
              </h4>
              <div className="space-y-1">
                <div className="py-0.5 whitespace-nowrap">1. [Rank] [Name]</div>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-[12px] text-slate-300 uppercase underline decoration-slate-500 underline-offset-4 mb-2.5 not-italic">
                DUTY ON
              </h4>
              <div className="space-y-1">
                <div className="py-0.5 whitespace-nowrap">1. [Rank] [Name] - [Duty Type]</div>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-[12px] text-slate-300 uppercase underline decoration-slate-500 underline-offset-4 mb-2.5 not-italic">
                OFFICE
              </h4>
              <div className="space-y-1">
                <div className="py-0.5 whitespace-nowrap">1. [Rank] [Name]</div>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-[12px] text-slate-300 uppercase underline decoration-slate-500 underline-offset-4 mb-2.5 not-italic">
                LEAVE
              </h4>
              <div className="space-y-1">
                <div className="py-0.5 whitespace-nowrap">1. [Rank] [Name]</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
