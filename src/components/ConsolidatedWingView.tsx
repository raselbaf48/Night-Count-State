import React, { useState } from 'react';
import { DayState, UnitRowState } from '../types/nightCount';
import { calculateWingTotals } from '../utils/storage';
import { Edit3, Check, X, Shield, UserCheck } from 'lucide-react';

interface ConsolidatedWingViewProps {
  dayState: DayState;
  onUpdateSquadronRow: (updatedRow: UnitRowState) => void;
  onSwitchToUnit: () => void;
}

export const ConsolidatedWingView: React.FC<ConsolidatedWingViewProps> = ({
  dayState,
  onUpdateSquadronRow,
  onSwitchToUnit,
}) => {
  const [editingSqn, setEditingSqn] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<UnitRowState | null>(null);

  const units = dayState.consolidatedUnits;
  const totals = calculateWingTotals(units);

  const startEdit = (row: UnitRowState) => {
    setEditingSqn(row.sqnUnit);
    setEditFormData({ ...row });
  };

  const cancelEdit = () => {
    setEditingSqn(null);
    setEditFormData(null);
  };

  const saveEdit = () => {
    if (editFormData) {
      // Recalculate totals for this row
      const det = Number(editFormData.detTdy) || 0;
      const tot = Number(editFormData.totalStr) || 0;
      const eff = Math.max(0, tot - det);
      
      const outParade =
        (Number(editFormData.leave) || 0) +
        (Number(editFormData.course) || 0) +
        (Number(editFormData.classVal) || 0) +
        (Number(editFormData.exam) || 0) +
        (Number(editFormData.awol) || 0) +
        (Number(editFormData.detention) || 0) +
        (Number(editFormData.sickReport) || 0) +
        (Number(editFormData.ed) || 0) +
        (Number(editFormData.exPpgf) || 0) +
        (Number(editFormData.cmh) || 0) +
        (Number(editFormData.bns) || 0) +
        (Number(editFormData.bsh) || 0) +
        (Number(editFormData.quarantine) || 0) +
        (Number(editFormData.uc) || 0) +
        (Number(editFormData.uBoard) || 0) +
        (Number(editFormData.officeDuty) || 0) +
        (Number(editFormData.aftFlg) || 0) +
        (Number(editFormData.niFlg) || 0) +
        (Number(editFormData.niDuty) || 0) +
        (Number(editFormData.baseSecurityGd) || 0) +
        (Number(editFormData.baseTaskforceBtf) || 0) +
        (Number(editFormData.airfieldDuty) || 0) +
        (Number(editFormData.offDuty) || 0) +
        (Number(editFormData.ko) || 0) +
        (Number(editFormData.canteen) || 0) +
        (Number(editFormData.bakery) || 0) +
        (Number(editFormData.driving) || 0) +
        (Number(editFormData.ptParadeOnUnit) || 0) +
        (Number(editFormData.games) || 0) +
        (Number(editFormData.guardOfHonor) || 0);

      const onParadeForecast = Math.max(0, eff - outParade);

      onUpdateSquadronRow({
        ...editFormData,
        totalStr: tot,
        detTdy: det,
        effStr: eff,
        totalOutParade: outParade,
        onParadeForecast,
      });
    }
    setEditingSqn(null);
    setEditFormData(null);
  };

  const columns = [
    { key: 'sqnUnit', label: 'Sqn/Unit', isFixed: true, width: 'min-w-[130px]' },
    { key: 'totalStr', label: 'Total Str', width: 'min-w-[36px]' },
    { key: 'detTdy', label: 'Det/Tdy', width: 'min-w-[36px]' },
    { key: 'effStr', label: 'Eff Str', width: 'min-w-[36px]' },
    { key: 'leave', label: 'Leave', width: 'min-w-[34px]' },
    { key: 'course', label: 'Course', width: 'min-w-[34px]' },
    { key: 'classVal', label: 'Class', width: 'min-w-[34px]' },
    { key: 'exam', label: 'Exam', width: 'min-w-[34px]' },
    { key: 'awol', label: 'AWOL', width: 'min-w-[34px]' },
    { key: 'detention', label: 'Detention', width: 'min-w-[34px]' },
    { key: 'sickReport', label: 'Sick report', width: 'min-w-[34px]' },
    { key: 'ed', label: 'ED', width: 'min-w-[34px]' },
    { key: 'exPpgf', label: 'Ex PPGF', width: 'min-w-[34px]' },
    { key: 'cmh', label: 'CMH', width: 'min-w-[34px]' },
    { key: 'bns', label: 'BNS', width: 'min-w-[34px]' },
    { key: 'bsh', label: 'BSH', width: 'min-w-[34px]' },
    { key: 'quarantine', label: 'Quarantine', width: 'min-w-[34px]' },
    { key: 'uc', label: 'U/C', width: 'min-w-[34px]' },
    { key: 'uBoard', label: 'U/Board', width: 'min-w-[34px]' },
    { key: 'officeDuty', label: 'Office Duty', width: 'min-w-[34px]' },
    { key: 'aftFlg', label: 'Aft Flg', width: 'min-w-[34px]' },
    { key: 'niFlg', label: 'Ni Flg', width: 'min-w-[34px]' },
    { key: 'niDuty', label: 'Ni Duty', width: 'min-w-[34px]' },
    { key: 'baseSecurityGd', label: 'Base Security (GD)', width: 'min-w-[36px]' },
    { key: 'baseTaskforceBtf', label: 'Base Taskforce (BTF)', width: 'min-w-[36px]' },
    { key: 'airfieldDuty', label: 'Airfield Duty', width: 'min-w-[36px]' },
    { key: 'offDuty', label: 'Off Duty', width: 'min-w-[34px]' },
    { key: 'ko', label: 'K/O', width: 'min-w-[34px]' },
    { key: 'canteen', label: 'Canteen', width: 'min-w-[34px]' },
    { key: 'bakery', label: 'Bakery', width: 'min-w-[34px]' },
    { key: 'driving', label: 'Driving', width: 'min-w-[34px]' },
    { key: 'ptParadeOnUnit', label: 'PT/Parade on Unit', width: 'min-w-[36px]' },
    { key: 'games', label: 'Games', width: 'min-w-[34px]' },
    { key: 'guardOfHonor', label: 'Guard of Honor', width: 'min-w-[36px]' },
    { key: 'totalOutParade', label: 'Total Out PT/Parade', width: 'min-w-[40px]' },
    { key: 'onParadeForecast', label: 'On PT / Parade (Forecast)', width: 'min-w-[44px]' },
    { key: 'rmks', label: 'Rmks', width: 'min-w-[60px]' },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pb-12">
      {/* Outer Military Report Card matching screenshot 1 */}
      <div className="bg-[#0b1424] border border-[#1b2a44] rounded-xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Document Header */}
        <div className="flex flex-col items-center justify-center text-center relative mb-6">
          <h2 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase underline decoration-slate-400 underline-offset-4">
            CONSOLIDATED NIGHT COUNT STATE : BAF AIRMEN
          </h2>
          <h3 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mt-0.5">
            FLG WG
          </h3>

          <div className="w-full flex justify-end mt-2 sm:mt-0 sm:absolute sm:right-0 sm:top-0">
            <span className="text-xs sm:text-sm font-semibold text-slate-200">
              Date: {dayState.formattedDisplayDate}
            </span>
          </div>
        </div>

        {/* The Full Military Matrix Table */}
        <div className="overflow-x-auto border border-slate-700/80 rounded bg-[#070e1b] mb-8">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-[#0f1b2f] border-b border-slate-700 text-slate-200">
                {columns.map((col, idx) => (
                  <th
                    key={col.key}
                    className={`border-r border-slate-700/80 p-1 font-semibold text-[11px] align-bottom pb-2 ${col.width} ${
                      idx === 0 ? 'text-left pl-3 align-middle py-3 sticky left-0 bg-[#0f1b2f] z-10' : 'h-40'
                    }`}
                  >
                    {idx === 0 ? (
                      col.label
                    ) : (
                      <div className="writing-vertical mx-auto max-h-36 text-slate-200 font-medium">
                        {col.label}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {units.map((row) => {
                const isEditing = editingSqn === row.sqnUnit;
                const is155 = row.sqnUnit === '155 UASU BAF';

                return (
                  <tr
                    key={row.sqnUnit}
                    className={`border-b border-slate-800/80 text-slate-200 hover:bg-[#122038] transition-colors ${
                      is155 ? 'bg-slate-900/40' : ''
                    }`}
                  >
                    {/* Sqn/Unit column */}
                    <td className="p-2.5 font-bold text-left pl-3 text-slate-100 border-r border-slate-700/80 font-sans text-xs sticky left-0 bg-[#070e1b] z-10">
                      <div className="flex items-center justify-between gap-2">
                        <span className={is155 ? 'text-emerald-400 font-bold' : ''}>
                          {row.sqnUnit}
                        </span>
                        {is155 ? (
                          <button
                            onClick={onSwitchToUnit}
                            className="text-[10px] bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900 px-1.5 py-0.5 rounded border border-emerald-700/50 cursor-pointer font-sans"
                            title="Open detailed nominal roll"
                          >
                            Details
                          </button>
                        ) : !isEditing ? (
                          <button
                            onClick={() => startEdit(row)}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 p-0.5"
                            title="Edit squadron count"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        ) : null}
                      </div>
                    </td>

                    {/* Numeric columns */}
                    {columns.slice(1).map((col) => {
                      if (col.key === 'rmks') {
                        return (
                          <td key={col.key} className="p-1 text-slate-400 border-r border-slate-700/80 text-center text-[11px]">
                            {row.rmks || ''}
                          </td>
                        );
                      }

                      const val = (row as any)[col.key];
                      const isHighlighted =
                        (col.key === 'totalStr' || col.key === 'effStr' || col.key === 'onParadeForecast') &&
                        val > 0;
                      const isOutParade = (col.key === 'totalOutParade' || col.key === 'officeDuty') && val > 0;

                      return (
                        <td
                          key={col.key}
                          className={`p-1.5 border-r border-slate-700/80 ${
                            isHighlighted
                              ? 'text-emerald-400 font-bold'
                              : isOutParade
                              ? 'text-amber-300 font-semibold'
                              : val > 0
                              ? 'text-slate-100 font-medium'
                              : 'text-slate-500'
                          }`}
                        >
                          {val === 0 ? '0' : val}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Total Summary Row matching Screenshot 1 */}
              <tr className="bg-[#0e1b2f] border-t-2 border-slate-600 text-slate-100 font-bold text-xs">
                <td className="p-2.5 text-left pl-3 font-sans text-xs sticky left-0 bg-[#0e1b2f] z-10 text-white uppercase tracking-wider">
                  Total
                </td>
                {columns.slice(1).map((col) => {
                  if (col.key === 'rmks') {
                    return <td key={col.key} className="p-1 border-r border-slate-700/80"></td>;
                  }
                  const totalVal = (totals as any)[col.key] || 0;
                  const isMainTotal =
                    col.key === 'totalStr' || col.key === 'effStr' || col.key === 'onParadeForecast';
                  return (
                    <td
                      key={col.key}
                      className={`p-2 border-r border-slate-700/80 ${
                        isMainTotal ? 'text-emerald-400 font-black text-xs' : totalVal > 0 ? 'text-white' : 'text-slate-500'
                      }`}
                    >
                      {totalVal}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Quick Squadron Editor Drawer/Modal if editing */}
        {editingSqn && editFormData && (
          <div className="mb-8 p-4 rounded-lg bg-[#070e1b] border border-slate-700">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-sm text-slate-100">
                  Edit State: {editingSqn}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveEdit}
                  className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Total Str</label>
                <input
                  type="number"
                  min="0"
                  value={editFormData.totalStr}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, totalStr: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Det/Tdy</label>
                <input
                  type="number"
                  min="0"
                  value={editFormData.detTdy}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, detTdy: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Office Duty</label>
                <input
                  type="number"
                  min="0"
                  value={editFormData.officeDuty}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, officeDuty: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Leave</label>
                <input
                  type="number"
                  min="0"
                  value={editFormData.leave}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, leave: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Sick Report</label>
                <input
                  type="number"
                  min="0"
                  value={editFormData.sickReport}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, sickReport: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Course</label>
                <input
                  type="number"
                  min="0"
                  value={editFormData.course}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, course: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Base Security</label>
                <input
                  type="number"
                  min="0"
                  value={editFormData.baseSecurityGd}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, baseSecurityGd: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Driving</label>
                <input
                  type="number"
                  min="0"
                  value={editFormData.driving}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, driving: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
