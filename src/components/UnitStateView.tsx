import React from 'react';
import { DayState, Airman, DisposalRecord } from '../types/nightCount';
import { calculate155SummarizedRow } from '../utils/storage';
interface UnitStateViewProps {
  dayState: DayState;
  onRemoveDisposal?: (id: string) => void;
  onToggleAirmanParade?: (airmanId: string) => void;
  onSelectAirmanForDisposal?: (airman: Airman) => void;
  onUpdateRemarks: (remarks: string) => void;
}

export const UnitStateView: React.FC<UnitStateViewProps> = ({
  dayState,
  onRemoveDisposal,
  onToggleAirmanParade,
  onSelectAirmanForDisposal,
  onUpdateRemarks,
}) => {
  const summarized = calculate155SummarizedRow(dayState);

  // Group airmen into On Parade and Disposals
  // Those with active disposals are in Duty On
  const unitDisposals = dayState.disposals.filter((d) => d.unit === '155 UASU BAF');
  const disposalAirmanIds = new Set(unitDisposals.map((d) => d.airmanId).filter(Boolean));

  // Airmen who are explicitly on parade
  const onParadeAirmen = dayState.airmen155.filter(
    (a) => !disposalAirmanIds.has(a.id) && a.status === 'on_parade'
  );

  const displayVal = (val: number | string) => {
    if (typeof val === 'number') {
      return val === 0 ? '-' : val;
    }
    return val || '-';
  };

  const columns = [
    { key: 'sqnUnit', label: 'Sqn/Unit', width: 'min-w-[120px]' },
    { key: 'totalStr', label: 'Total Str', width: 'min-w-[42px]' },
    { key: 'detTdy', label: 'Det/Tdy', width: 'min-w-[40px]' },
    { key: 'effStr', label: 'Eff Str', width: 'min-w-[42px]' },
    { key: 'leave', label: 'Leave', width: 'min-w-[36px]' },
    { key: 'course', label: 'Course', width: 'min-w-[36px]' },
    { key: 'classExam', label: 'Class/Exam', width: 'min-w-[38px]' },
    { key: 'awolDetention', label: 'AWOL/Detention', width: 'min-w-[38px]' },
    { key: 'sickReport', label: 'Sick report', width: 'min-w-[38px]' },
    { key: 'edExPpgf', label: 'ED/EX PPGF', width: 'min-w-[38px]' },
    { key: 'cmhBnsBshQmt', label: 'CMH/ BNS/ BSH/Qmt', width: 'min-w-[44px]' },
    { key: 'ucUBoard', label: 'U/C, U/Board', width: 'min-w-[38px]' },
    { key: 'officeDuty', label: 'Office Duty', width: 'min-w-[38px]' },
    { key: 'aftNiFlgNiDuty', label: 'Aft/Ni flg/Ni Duty', width: 'min-w-[40px]' },
    { key: 'gdTfAirfieldDuty', label: 'GD/TF/Airfield Duty', width: 'min-w-[42px]' },
    { key: 'driving', label: 'Driving', width: 'min-w-[36px]' },
    { key: 'gamesGuardOfHonor', label: 'Games /Guard of Honor', width: 'min-w-[42px]' },
    { key: 'totalOutParade', label: 'Total Out Parade', width: 'min-w-[44px]' },
    { key: 'onParade', label: 'On Parade', width: 'min-w-[44px]' },
    { key: 'remarks', label: 'Remarks', width: 'min-w-[60px]' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pb-12">
      {/* Outer Military Report Card matching user screenshot 2 */}
      <div className="bg-[#0b1424] border border-[#1b2a44] rounded-xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Document Header */}
        <div className="flex flex-col items-center justify-center text-center relative mb-6">
          <h2 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase underline decoration-slate-400 underline-offset-4">
            NT COUNT STATE: AIRMEN
          </h2>
          <h3 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mt-0.5">
            155 UASU BAF
          </h3>

          <div className="w-full flex justify-end mt-2 sm:mt-0 sm:absolute sm:right-0 sm:top-0">
            <span className="text-xs sm:text-sm font-semibold text-slate-200">
              Date: {dayState.formattedDisplayDate}
            </span>
          </div>
        </div>

        {/* The Military State Table */}
        <div className="overflow-x-auto border border-slate-700/80 rounded bg-[#070e1b] mb-8">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-[#0f1b2f] border-b border-slate-700 text-slate-200">
                {columns.map((col, idx) => (
                  <th
                    key={col.key}
                    className={`border-r border-slate-700/80 p-1 font-semibold text-[11px] align-bottom pb-2 ${col.width} ${
                      idx === 0 ? 'text-left pl-3 align-middle py-3' : 'h-36'
                    }`}
                  >
                    {idx === 0 ? (
                      col.label
                    ) : (
                      <div className="writing-vertical mx-auto max-h-32 text-slate-200 font-medium">
                        {col.label}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800 text-slate-100 hover:bg-[#122038] transition-colors">
                <td className="p-2.5 font-bold text-left pl-3 text-slate-100 border-r border-slate-700/80 font-sans text-xs">
                  155 UASU BAF
                </td>
                <td className="p-2 border-r border-slate-700/80 font-bold text-slate-100">
                  {displayVal(summarized.totalStr)}
                </td>
                <td className="p-2 border-r border-slate-700/80 text-slate-400">
                  {displayVal(summarized.detTdy)}
                </td>
                <td className="p-2 border-r border-slate-700/80 font-bold text-emerald-400">
                  {displayVal(summarized.effStr)}
                </td>
                <td className="p-2 border-r border-slate-700/80 text-slate-400">
                  {displayVal(summarized.leave)}
                </td>
                <td className="p-2 border-r border-slate-700/80 text-slate-400">
                  {displayVal(summarized.course)}
                </td>
                <td className="p-2 border-r border-slate-700/80 text-slate-400">
                  {displayVal(summarized.classExam)}
                </td>
                <td className="p-2 border-r border-slate-700/80 text-slate-400">
                  {displayVal(summarized.awolDetention)}
                </td>
                <td className="p-2 border-r border-slate-700/80 text-slate-400">
                  {displayVal(summarized.sickReport)}
                </td>
                <td className="p-2 border-r border-slate-700/80 text-slate-400">
                  {displayVal(summarized.edExPpgf)}
                </td>
                <td className="p-2 border-r border-slate-700/80 text-slate-400">
                  {displayVal(summarized.cmhBnsBshQmt)}
                </td>
                <td className="p-2 border-r border-slate-700/80 text-slate-400">
                  {displayVal(summarized.ucUBoard)}
                </td>
                <td className="p-2 border-r border-slate-700/80 font-semibold text-amber-300">
                  {displayVal(summarized.officeDuty)}
                </td>
                <td className="p-2 border-r border-slate-700/80 text-slate-400">
                  {displayVal(summarized.aftNiFlgNiDuty)}
                </td>
                <td className="p-2 border-r border-slate-700/80 text-slate-400">
                  {displayVal(summarized.gdTfAirfieldDuty)}
                </td>
                <td className="p-2 border-r border-slate-700/80 text-slate-400">
                  {displayVal(summarized.driving)}
                </td>
                <td className="p-2 border-r border-slate-700/80 text-slate-400">
                  {displayVal(summarized.gamesGuardOfHonor)}
                </td>
                <td className="p-2 border-r border-slate-700/80 font-bold text-rose-400">
                  {displayVal(summarized.totalOutParade)}
                </td>
                <td className="p-2 border-r border-slate-700/80 font-bold text-emerald-400 text-sm">
                  {displayVal(summarized.onParade)}
                </td>
                <td className="p-1 text-slate-300 text-xs">
                  <input
                    type="text"
                    value={dayState.customRemarks || ''}
                    placeholder="Nil"
                    onChange={(e) => onUpdateRemarks(e.target.value)}
                    className="w-full bg-transparent px-1 py-0.5 text-center text-slate-300 placeholder:text-slate-600 focus:outline-none focus:bg-slate-800/60 rounded"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Nominal Roll Breakdown matching 1st Pic (image_b3bbea17.png) */}
        <div className="flex flex-row flex-wrap gap-x-12 sm:gap-x-16 gap-y-6 text-xs text-slate-200">
          {/* Left: On Parade */}
          <div>
            <h4 className="font-bold text-xs text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mb-2.5">
              On Parade
            </h4>

            {onParadeAirmen.length === 0 ? (
              <div className="text-slate-500 italic">No airmen on parade</div>
            ) : (
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
              </div>
            )}
          </div>

          {/* Right: Duty On */}
          <div>
            <h4 className="font-bold text-xs text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mb-2.5">
              Duty On
            </h4>

            {unitDisposals.length === 0 ? (
              <div className="text-slate-500 italic">No airmen on duty</div>
            ) : (
              <div className="space-y-1">
                {unitDisposals.map((disp, idx) => (
                  <div key={disp.id} className="py-0.5 whitespace-nowrap">
                    <span className="text-slate-400 font-medium">{idx + 1}. </span>
                    <span className="text-slate-200 font-medium">
                      {disp.rank} {disp.name} - {disp.detail || disp.displayCategory}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
