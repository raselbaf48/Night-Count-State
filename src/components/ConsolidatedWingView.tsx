import React, { useState, useEffect } from 'react';
import { DayState, UnitRowState, WingConfig } from '../types/nightCount';
import {
  calculateUnitSummarizedRow,
  getUnitAirmen,
  loadSavedCustomDisposals,
  loadHiddenQuickEditDisposals,
  saveHiddenQuickEditDisposals,
} from '../utils/storage';
import { createBlankUnitRow, DISPOSAL_OPTIONS } from '../data/initialData';
import { Edit3, Check, X, Shield, ArrowLeft, Eye, EyeOff, Plus } from 'lucide-react';

interface ConsolidatedWingViewProps {
  dayState: DayState;
  activeWing?: WingConfig;
  onUpdateSquadronRow: (updatedRow: UnitRowState) => void;
  onSelectUnit: (unitName: string) => void;
  onAddCustomDisposal: (customName: string) => void;
  onDeleteCustomDisposal: (customName: string) => void;
  onSettingsChanged?: () => void;
  onRequireAuth?: (onSuccess: () => void) => void;
  onEditingChange?: (isEditing: boolean) => void;
  canQuickEdit?: boolean;
}

const STANDARD_DISPOSAL_ITEMS = DISPOSAL_OPTIONS.filter((o) => o.value !== '-');
const ALWAYS_VISIBLE_DISPOSALS = new Set(['TDY', 'Leave', 'GD', 'Office Duty']);

export const ConsolidatedWingView: React.FC<ConsolidatedWingViewProps> = ({
  dayState,
  activeWing,
  onUpdateSquadronRow,
  onSelectUnit,
  onAddCustomDisposal,
  onDeleteCustomDisposal,
  onSettingsChanged,
  onRequireAuth,
  onEditingChange,
  canQuickEdit = true,
}) => {
  const [editingSqn, setEditingSqn] = useState<string | null>(null);
  const [editTotalStr, setEditTotalStr] = useState<number>(0);
  const [editCounts, setEditCounts] = useState<Record<string, number>>({});
  const [editRemarks, setEditRemarks] = useState<string>('');
  const [editingSourceRow, setEditingSourceRow] = useState<UnitRowState | null>(null);
  const [hiddenDisposals, setHiddenDisposals] = useState<string[]>(() =>
    loadHiddenQuickEditDisposals().filter((k) => !ALWAYS_VISIBLE_DISPOSALS.has(k))
  );
  useEffect(() => {
    if (!editingSqn) {
      setHiddenDisposals(
        loadHiddenQuickEditDisposals().filter((k) => !ALWAYS_VISIBLE_DISPOSALS.has(k))
      );
    }
  }, [dayState, editingSqn]);

  useEffect(() => {
    onEditingChange?.(Boolean(editingSqn && editingSourceRow));
    return () => {
      onEditingChange?.(false);
    };
  }, [editingSqn, editingSourceRow, onEditingChange]);
  const [showHiddenDrawer, setShowHiddenDrawer] = useState<boolean>(false);
  const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);
  const [newCustomName, setNewCustomName] = useState<string>('');
  const [newCustomAmount, setNewCustomAmount] = useState<number>(0);

  const summarized155 = calculateUnitSummarizedRow(dayState, '155 UASU BAF');
  const rowByUnit = new Map(
    dayState.consolidatedUnits.map((u) => [u.sqnUnit.toLowerCase(), u])
  );
  const units: UnitRowState[] = activeWing
    ? activeWing.units.map(
        (unitName) => rowByUnit.get(unitName.toLowerCase()) || createBlankUnitRow(unitName)
      )
    : dayState.consolidatedUnits;

  const savedCustomNames = Array.from(
    new Set([
      ...Object.keys(summarized155.customDisposals || {}),
      ...(dayState.savedCustomDisposals ?? loadSavedCustomDisposals()),
      ...units.flatMap((u) => Object.keys(u.customDisposals || {})),
    ])
  ).filter((name) => name.trim().length > 0);
  const customEntries: [string, number][] = savedCustomNames.map((name) => [
    name,
    summarized155.customDisposals?.[name] || 0,
  ]);

  const displayVal = (val: number | string) => {
    if (typeof val === 'number') {
      return val === 0 ? '-' : val;
    }
    return val || '-';
  };

  // Helper to compute the summarized values matching 155 UASU BAF heading columns for any squadron row
  const getRowSummary = (row: UnitRowState) => {
    const hasNominalRoll =
      row.sqnUnit === '155 UASU BAF' || getUnitAirmen(dayState, row.sqnUnit).length > 0;
    if (hasNominalRoll) {
      const unitSum = calculateUnitSummarizedRow(dayState, row.sqnUnit);
      return {
        sqnUnit: row.sqnUnit,
        totalStr: unitSum.totalStr,
        detTdy: unitSum.detTdy,
        effStr: unitSum.effStr,
        leave: unitSum.leave,
        course: unitSum.course,
        awolDetention: unitSum.awolDetention,
        sickReport: unitSum.sickReport,
        edExPpgf: unitSum.edExPpgf,
        cmhBnsBshQmt: unitSum.cmhBnsBshQmt,
        ucUBoard: unitSum.ucUBoard,
        officeDuty: unitSum.officeDuty,
        aftNiFlgNiDuty: unitSum.aftNiFlgNiDuty,
        gdTfAirfieldDuty: unitSum.gdTfAirfieldDuty,
        driving: unitSum.driving,
        customDisposals: unitSum.customDisposals || {},
        totalOutParade: unitSum.totalOutParade,
        onParade: unitSum.onParade,
        remarks: unitSum.remarks,
      };
    }

    const totalStr = row.totalStr || 0;
    const detTdy = row.detTdy || 0;
    const effStr = Math.max(0, totalStr - detTdy);
    const leave = row.leave || 0;
    const course = row.course || 0;
    const awolDetention = (row.awol || 0) + (row.detention || 0);
    const sickReport = row.sickReport || 0;
    const edExPpgf = (row.ed || 0) + (row.exPpgf || 0);
    const cmhBnsBshQmt =
      (row.cmh || 0) + (row.bns || 0) + (row.bsh || 0) + (row.quarantine || 0);
    const ucUBoard = (row.uc || 0) + (row.uBoard || 0);
    const officeDuty = (row.officeDuty || 0) + (row.canteen || 0) + (row.bakery || 0);
    const aftNiFlgNiDuty = (row.aftFlg || 0) + (row.niFlg || 0) + (row.niDuty || 0);
    const gdTfAirfieldDuty =
      (row.baseSecurityGd || 0) + (row.baseTaskforceBtf || 0) + (row.airfieldDuty || 0);
    const driving = row.driving || 0;

    const customDisposals: Record<string, number> = {};
    let customTotal = 0;
    savedCustomNames.forEach((name) => {
      const val = row.customDisposals?.[name] || 0;
      customDisposals[name] = val;
      customTotal += val;
    });

    const totalOutParade =
      leave +
      course +
      awolDetention +
      sickReport +
      edExPpgf +
      cmhBnsBshQmt +
      ucUBoard +
      officeDuty +
      aftNiFlgNiDuty +
      gdTfAirfieldDuty +
      driving +
      customTotal;

    const onParade = Math.max(0, effStr - totalOutParade);

    return {
      sqnUnit: row.sqnUnit,
      totalStr,
      detTdy,
      effStr,
      leave,
      course,
      awolDetention,
      sickReport,
      edExPpgf,
      cmhBnsBshQmt,
      ucUBoard,
      officeDuty,
      aftNiFlgNiDuty,
      gdTfAirfieldDuty,
      driving,
      customDisposals,
      totalOutParade,
      onParade,
      remarks: row.rmks || '',
    };
  };

  const rowSummaries = units.map(getRowSummary);

  // Wing Total row aggregated from all squadrons
  const totals = rowSummaries.reduce(
    (acc, r) => {
      acc.totalStr += r.totalStr;
      acc.detTdy += r.detTdy;
      acc.effStr += r.effStr;
      acc.leave += r.leave;
      acc.course += r.course;
      acc.awolDetention += r.awolDetention;
      acc.sickReport += r.sickReport;
      acc.edExPpgf += r.edExPpgf;
      acc.cmhBnsBshQmt += r.cmhBnsBshQmt;
      acc.ucUBoard += r.ucUBoard;
      acc.officeDuty += r.officeDuty;
      acc.aftNiFlgNiDuty += r.aftNiFlgNiDuty;
      acc.gdTfAirfieldDuty += r.gdTfAirfieldDuty;
      acc.driving += r.driving;
      acc.totalOutParade += r.totalOutParade;
      acc.onParade += r.onParade;
      customEntries.forEach(([name]) => {
        acc.customDisposals[name] = (acc.customDisposals[name] || 0) + (r.customDisposals[name] || 0);
      });
      return acc;
    },
    {
      totalStr: 0,
      detTdy: 0,
      effStr: 0,
      leave: 0,
      course: 0,
      awolDetention: 0,
      sickReport: 0,
      edExPpgf: 0,
      cmhBnsBshQmt: 0,
      ucUBoard: 0,
      officeDuty: 0,
      aftNiFlgNiDuty: 0,
      gdTfAirfieldDuty: 0,
      driving: 0,
      customDisposals: {} as Record<string, number>,
      totalOutParade: 0,
      onParade: 0,
    }
  );

  const startEdit = (row: UnitRowState) => {
    const counts: Record<string, number> = {};
    if (row.disposalCounts) {
      Object.entries(row.disposalCounts).forEach(([k, v]) => {
        counts[k] = v || 0;
      });
      // Merge any legacy TDY (Air HQ) / TDY (HSIA) into TDY
      const legacyTdySum =
        (Number(counts['TDY']) || 0) +
        (Number(counts['TDY (Air HQ)']) || 0) +
        (Number(counts['TDY (HSIA)']) || 0);
      delete counts['TDY (Air HQ)'];
      delete counts['TDY (HSIA)'];
      counts['TDY'] = legacyTdySum;
    } else {
      // Seed from existing UnitRowState fields
      counts['TDY'] = row.detTdy || 0;
      counts['Leave'] = row.leave || 0;
      counts['Course'] = row.course || 0;
      counts['AWOL'] = row.awol || 0;
      counts['Detention'] = row.detention || 0;
      counts['Sick report'] = row.sickReport || 0;
      counts['ED'] = row.ed || 0;
      counts['EX PPGF'] = row.exPpgf || 0;
      counts['CMH'] = row.cmh || 0;
      counts['BNS'] = row.bns || 0;
      counts['BSH'] = row.bsh || 0;
      counts['Qmt'] = row.quarantine || 0;
      counts['U/C'] = row.uc || 0;
      counts['U/Board'] = row.uBoard || 0;
      counts['Office Duty'] = (row.officeDuty || 0) + (row.canteen || 0) + (row.bakery || 0);
      counts['Aft flg'] = row.aftFlg || 0;
      counts['Ni flg'] = row.niFlg || 0;
      counts['Ni Duty'] = row.niDuty || 0;
      counts['GD'] = row.baseSecurityGd || 0;
      counts['BTF'] = row.baseTaskforceBtf || 0;
      counts['NTF'] = 0;
      counts['Airfield'] = row.airfieldDuty || 0;
      counts['Escort'] = 0;
      counts['Driving'] = row.driving || 0;
    }

    const customList = dayState.savedCustomDisposals ?? loadSavedCustomDisposals();
    customList.forEach((customName) => {
      if (counts[customName] === undefined) {
        counts[customName] = row.customDisposals?.[customName] || 0;
      }
    });

    setEditingSqn(row.sqnUnit);
    setEditingSourceRow(row);
    setEditTotalStr(row.totalStr || 0);
    setEditCounts(counts);
    setEditRemarks(row.rmks || '');
    setIsAddingCustom(false);
    setNewCustomName('');
    setNewCustomAmount(0);
  };

  const cancelEdit = () => {
    setEditingSqn(null);
    setEditingSourceRow(null);
    setIsAddingCustom(false);
  };

  const toggleHideDisposal = (key: string) => {
    if (ALWAYS_VISIBLE_DISPOSALS.has(key)) return;
    setHiddenDisposals((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      saveHiddenQuickEditDisposals(next);
      onSettingsChanged?.();
      return next;
    });
  };

  const handleAddInlineCustom = () => {
    const trimmed = newCustomName.trim();
    if (!trimmed) return;
    onAddCustomDisposal(trimmed);
    setEditCounts((prev) => ({
      ...prev,
      [trimmed]: Math.max(0, Number(newCustomAmount) || 0),
    }));
    // Ensure newly added custom disposal is visible (not hidden)
    setHiddenDisposals((prev) => {
      if (!prev.includes(trimmed)) return prev;
      const next = prev.filter((k) => k !== trimmed);
      saveHiddenQuickEditDisposals(next);
      onSettingsChanged?.();
      return next;
    });
    setNewCustomName('');
    setNewCustomAmount(0);
    setIsAddingCustom(false);
  };

  const saveEdit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingSourceRow) return;

    const getVal = (key: string) => Math.max(0, Number(editCounts[key]) || 0);
    const detTdy = getVal('TDY') + getVal('TDY (Air HQ)') + getVal('TDY (HSIA)');
    const totalStr = Math.max(0, Number(editTotalStr) || 0);
    const effStr = Math.max(0, totalStr - detTdy);

    const customDisposals: Record<string, number> = {};
    let customTotal = 0;
    const allCustomNames = Array.from(
      new Set([...(dayState.savedCustomDisposals ?? loadSavedCustomDisposals()), ...savedCustomNames])
    );
    allCustomNames.forEach((customName) => {
      const v = getVal(customName);
      customDisposals[customName] = v;
      customTotal += v;
    });

    const leave = getVal('Leave');
    const course = getVal('Course');
    const awol = getVal('AWOL');
    const detention = getVal('Detention');
    const sickReport = getVal('Sick report');
    const ed = getVal('ED');
    const exPpgf = getVal('EX PPGF');
    const cmh = getVal('CMH');
    const bns = getVal('BNS');
    const bsh = getVal('BSH');
    const quarantine = getVal('Qmt');
    const uc = getVal('U/C');
    const uBoard = getVal('U/Board');
    const officeDuty = getVal('Office Duty');
    const aftFlg = getVal('Aft flg');
    const niFlg = getVal('Ni flg');
    const niDuty = getVal('Ni Duty');
    const baseSecurityGd = getVal('GD');
    const baseTaskforceBtf = getVal('BTF');
    const airfieldDuty = getVal('Airfield') + getVal('NTF') + getVal('Escort');
    const driving = getVal('Driving');

    const totalOutParade =
      leave +
      course +
      awol +
      detention +
      sickReport +
      ed +
      exPpgf +
      cmh +
      bns +
      bsh +
      quarantine +
      uc +
      uBoard +
      officeDuty +
      aftFlg +
      niFlg +
      niDuty +
      baseSecurityGd +
      baseTaskforceBtf +
      airfieldDuty +
      driving +
      customTotal;

    const onParadeForecast = Math.max(0, effStr - totalOutParade);

    onUpdateSquadronRow({
      ...editingSourceRow,
      totalStr,
      detTdy,
      effStr,
      leave,
      course,
      awol,
      detention,
      sickReport,
      ed,
      exPpgf,
      cmh,
      bns,
      bsh,
      quarantine,
      uc,
      uBoard,
      officeDuty,
      canteen: 0,
      bakery: 0,
      aftFlg,
      niFlg,
      niDuty,
      baseSecurityGd,
      baseTaskforceBtf,
      airfieldDuty,
      driving,
      totalOutParade,
      onParadeForecast,
      rmks: editRemarks.trim(),
      disposalCounts: { ...editCounts },
      customDisposals,
      manuallyEdited: true,
    });

    setEditingSqn(null);
    setEditingSourceRow(null);
  };

  // If Quick Edit is active, render dedicated full-page editor showing ONLY this Squadron's info
  if (editingSqn && editingSourceRow) {
    const customList = Array.from(
      new Set([
        ...(dayState.savedCustomDisposals ?? loadSavedCustomDisposals()),
        ...savedCustomNames,
      ])
    );

    const getVal = (key: string) => Math.max(0, Number(editCounts[key]) || 0);
    const liveDetTdy = getVal('TDY') + getVal('TDY (Air HQ)') + getVal('TDY (HSIA)');
    const liveEffStr = Math.max(0, editTotalStr - liveDetTdy);

    const liveOutParade =
      STANDARD_DISPOSAL_ITEMS.filter((o) => o.category !== 'detTdy').reduce(
        (sum, item) => sum + getVal(item.value),
        0
      ) + customList.reduce((sum, name) => sum + getVal(name), 0);

    const liveOnParade = Math.max(0, liveEffStr - liveOutParade);

    const allListItems = [
      ...STANDARD_DISPOSAL_ITEMS.map((o) => ({
        key: o.value,
        label: o.label,
        isTdy: o.category === 'detTdy',
        isCustom: false,
      })),
      ...customList.map((name) => ({
        key: name,
        label: name,
        isTdy: false,
        isCustom: true,
      })),
    ];

    const hiddenSet = new Set(
      hiddenDisposals.filter((k) => !ALWAYS_VISIBLE_DISPOSALS.has(k))
    );
    const visibleItems = allListItems.filter(
      (item) =>
        ALWAYS_VISIBLE_DISPOSALS.has(item.key) ||
        !hiddenSet.has(item.key) ||
        getVal(item.key) > 0
    );
    const hiddenItems = allListItems.filter(
      (item) =>
        !ALWAYS_VISIBLE_DISPOSALS.has(item.key) &&
        hiddenSet.has(item.key) &&
        getVal(item.key) === 0
    );
    const toggleableItems = allListItems.filter(
      (item) => !ALWAYS_VISIBLE_DISPOSALS.has(item.key)
    );

    return (
      <div className="w-full max-w-2xl mx-auto px-4 pt-5 sm:pt-8 pb-12 text-[12px]">
        <form
          onSubmit={saveEdit}
          className="bg-[#0b1424] border border-[#1b2a44] rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Dedicated Page Top Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-slate-800/80 bg-[#0e192d]/70">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={cancelEdit}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <div>
                  <h2 className="font-bold text-sm sm:text-base text-white">
                    {editingSqn}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Date: {dayState.formattedDisplayDate} • Quick Edit Count
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Live Auto-Calculated Summary Bar */}
          <div className="grid grid-cols-4 gap-2 px-5 py-3.5 bg-[#070e1b] border-b border-slate-800/80 text-center">
            <div className="p-2 rounded-lg bg-[#0b1424] border border-slate-800/70">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Total Str</div>
              <div className="text-sm font-bold text-white mt-0.5">{editTotalStr}</div>
            </div>
            <div className="p-2 rounded-lg bg-[#0b1424] border border-slate-800/70">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Eff Str</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">{liveEffStr}</div>
            </div>
            <div className="p-2 rounded-lg bg-[#0b1424] border border-slate-800/70">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Total Out Parade</div>
              <div className="text-sm font-bold text-rose-400 mt-0.5">{liveOutParade}</div>
            </div>
            <div className="p-2 rounded-lg bg-[#0b1424] border border-slate-800/70">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">On Parade</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">{liveOnParade}</div>
            </div>
          </div>

          {/* List Visibility Controls Bar (Top Eye Icon to Hide / Unhide disposals) */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2 bg-[#0a1220] border-b border-slate-800/70 text-[11px]">
            <span className="text-slate-400">
              Showing <strong className="text-slate-200">{visibleItems.length}</strong> of{' '}
              <strong className="text-slate-200">{allListItems.length}</strong> disposals
            </span>
            <button
              type="button"
              onClick={() => setShowHiddenDrawer((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                showHiddenDrawer
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                  : 'bg-slate-800/80 border-slate-700/70 hover:bg-slate-700 text-slate-200'
              }`}
              title="Hide / Unhide disposals"
            >
              <Eye className="w-3.5 h-3.5" />
              {hiddenItems.length > 0 && <span>({hiddenItems.length})</span>}
            </button>
          </div>

          {/* Expandable Hide / Unhide Disposals Drawer (Opened via Top Eye Icon) */}
          {showHiddenDrawer && (
            <div className="px-5 py-3 bg-[#070e1b] border-b border-slate-800/80 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-300">
                  Click any disposal to Hide / Unhide:
                </span>
                <span className="text-[10px] text-slate-500">
                  Fixed: Total Str, TDY, Leave, GD, Office Duty
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {toggleableItems.map((item) => {
                  const val = getVal(item.key);
                  const isHidden = hiddenSet.has(item.key) && val === 0;
                  const hasCount = val > 0;
                  return (
                    <button
                      key={`vis-${item.key}`}
                      type="button"
                      disabled={hasCount}
                      onClick={() => toggleHideDisposal(item.key)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs transition-colors ${
                        hasCount
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 cursor-not-allowed opacity-80'
                          : isHidden
                          ? 'bg-slate-900/70 border-slate-800 text-slate-500 hover:border-blue-500/50 hover:text-blue-300 cursor-pointer'
                          : 'bg-blue-600/15 border-blue-500/40 text-blue-200 hover:bg-slate-800 hover:text-slate-300 cursor-pointer'
                      }`}
                      title={
                        hasCount
                          ? `${item.label} has active count (${val})`
                          : isHidden
                          ? `Unhide ${item.label}`
                          : `Hide ${item.label}`
                      }
                    >
                      {isHidden ? (
                        <EyeOff className="w-3 h-3 text-slate-500" />
                      ) : (
                        <Eye className="w-3 h-3 text-blue-400" />
                      )}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vertical Single-Column Disposal List with Amount Box */}
          <div className="divide-y divide-slate-800/50">
            {/* Total Str Row */}
            <div className="flex items-center justify-between px-5 py-2.5 bg-[#0d182b]/60">
              <label className="text-xs font-bold text-white">Total Str</label>
              <input
                type="number"
                min="0"
                value={editTotalStr === 0 ? '' : editTotalStr}
                placeholder="0"
                onChange={(e) => setEditTotalStr(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-center text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Active Visible Disposal Options matching Nominal Roll Disposal List order (No per-row Eye icon) */}
            {visibleItems.map((item) => {
              const val = editCounts[item.key] || 0;
              return (
                <div
                  key={item.key}
                  className="flex items-center justify-between px-5 py-2 hover:bg-slate-800/25 transition-colors group"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`text-xs font-medium truncate ${
                        item.isCustom
                          ? 'text-amber-300'
                          : item.isTdy
                          ? 'text-blue-300'
                          : 'text-slate-200'
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.isCustom && (
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteCustomDisposal(item.key);
                          setEditCounts((prev) => {
                            const next = { ...prev };
                            delete next[item.key];
                            return next;
                          });
                        }}
                        title={`Remove custom disposal "${item.label}"`}
                        className="p-0.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/60 transition-colors cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <input
                    type="number"
                    min="0"
                    value={val === 0 ? '' : val}
                    placeholder="0"
                    onChange={(e) => {
                      const num = Math.max(0, parseInt(e.target.value, 10) || 0);
                      setEditCounts((prev) => ({ ...prev, [item.key]: num }));
                    }}
                    className={`w-24 bg-slate-900/90 border rounded-lg px-3 py-1 text-center text-xs font-semibold placeholder:text-slate-600 focus:outline-none focus:border-blue-500 shrink-0 ${
                      val > 0
                        ? 'border-amber-500/50 text-amber-300 bg-amber-500/10'
                        : 'border-slate-700/80 text-slate-200'
                    }`}
                  />
                </div>
              );
            })}

            {/* Last Item: Custom Option (Add New Custom Disposal) */}
            <div className="px-5 py-2.5 bg-[#0a1322]">
              {!isAddingCustom ? (
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(true)}
                  className="w-full flex items-center justify-between py-1 text-emerald-400 hover:text-emerald-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Custom</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    + Add custom disposal
                  </span>
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={newCustomName}
                    onChange={(e) => setNewCustomName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddInlineCustom();
                      } else if (e.key === 'Escape') {
                        setIsAddingCustom(false);
                      }
                    }}
                    placeholder="Custom disposal name..."
                    className="flex-1 min-w-[160px] bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <input
                    type="number"
                    min="0"
                    value={newCustomAmount === 0 ? '' : newCustomAmount}
                    placeholder="0"
                    onChange={(e) =>
                      setNewCustomAmount(Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-center text-xs font-semibold text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddInlineCustom}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCustom(false);
                      setNewCustomName('');
                      setNewCustomAmount(0);
                    }}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Remarks */}
            <div className="flex items-center justify-between px-5 py-3 bg-[#0d182b]/40">
              <label className="text-xs font-semibold text-slate-300">Remarks</label>
              <input
                type="text"
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
                placeholder="Nil"
                className="w-48 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-center text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-800 bg-[#0e192d]/60">
            <button
              type="button"
              onClick={cancelEdit}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Exact same Heading Row columns as 155 UASU BAF
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

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pb-12 text-[12px]">
      {/* Outer Military Report Card */}
      <div className="bg-[#0b1424] border border-[#1b2a44] rounded-xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Document Header */}
        <div className="flex flex-col items-center justify-center text-center mb-2">
          <h2 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase underline decoration-slate-400 underline-offset-4">
            CONSOLIDATED NIGHT COUNT STATE : BAF AIRMEN
          </h2>
          <h3 className="text-sm sm:text-base font-bold tracking-wider text-slate-100 uppercase underline decoration-slate-400 underline-offset-4 mt-0.5">
            {activeWing?.shortName || 'FLG WG'}
          </h3>
        </div>

        {/* Date immediately above top-right corner of the table */}
        <div className="flex justify-end mb-1.5">
          <span className="text-[12px] font-semibold text-slate-200">
            Date: {dayState.formattedDisplayDate}
          </span>
        </div>

        {/* The Consolidated Matrix Table - Exact same Heading Row as 155 UASU BAF */}
        <div className="overflow-x-auto border border-slate-700/80 rounded bg-[#070e1b] mb-6">
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
            <tbody className="text-slate-200 text-[12px]">
              {units.map((row, idx) => {
                const summary = rowSummaries[idx];
                const is155 = row.sqnUnit === '155 UASU BAF';

                return (
                  <tr
                    key={row.sqnUnit}
                    className={`border-b border-slate-800/80 text-slate-100 hover:bg-[#122038] transition-colors group ${
                      is155 ? 'bg-slate-900/40' : ''
                    }`}
                  >
                    {/* Sqn/Unit */}
                    <td className="px-3 py-2 font-bold text-left whitespace-nowrap border-r border-slate-700/80">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectUnit(row.sqnUnit)}
                          className={`text-left hover:underline cursor-pointer ${
                            is155 ? 'text-emerald-400 font-bold' : 'text-slate-100 hover:text-emerald-300'
                          }`}
                          title={`Open ${row.sqnUnit} state & Nominal Roll`}
                        >
                          {row.sqnUnit}
                        </button>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onSelectUnit(row.sqnUnit)}
                            className="text-[10px] bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900 px-1.5 py-0.5 rounded border border-emerald-700/50 cursor-pointer"
                            title={`Open ${row.sqnUnit} state & Nominal Roll`}
                          >
                            Details
                          </button>
                          {canQuickEdit && getUnitAirmen(dayState, row.sqnUnit).length === 0 && !is155 && (
                            <button
                              onClick={() =>
                                onRequireAuth
                                  ? onRequireAuth(() => startEdit(row))
                                  : startEdit(row)
                              }
                              className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                              title="Quick edit squadron count"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
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
                    {customEntries.map(([customName]) => (
                      <td
                        key={`wing-custom-${row.sqnUnit}-${customName}`}
                        className="px-2 py-2 border-r border-slate-700/80 font-semibold text-amber-300 whitespace-nowrap"
                      >
                        {displayVal(summary.customDisposals[customName] || 0)}
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
                );
              })}

              {/* Total Summary Row */}
              <tr className="bg-[#0e1b2f] border-t-2 border-slate-600 text-slate-100 font-bold text-[12px]">
                <td className="px-3 py-2.5 text-center border-r border-slate-700/80 text-white uppercase tracking-wider whitespace-nowrap">
                  Total
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-white whitespace-nowrap">
                  {displayVal(totals.totalStr)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                  {displayVal(totals.detTdy)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-emerald-400 font-bold whitespace-nowrap">
                  {displayVal(totals.effStr)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                  {displayVal(totals.leave)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                  {displayVal(totals.course)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                  {displayVal(totals.awolDetention)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                  {displayVal(totals.sickReport)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                  {displayVal(totals.edExPpgf)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                  {displayVal(totals.cmhBnsBshQmt)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                  {displayVal(totals.ucUBoard)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-amber-300 whitespace-nowrap">
                  {displayVal(totals.officeDuty)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                  {displayVal(totals.aftNiFlgNiDuty)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                  {displayVal(totals.gdTfAirfieldDuty)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-slate-300 whitespace-nowrap">
                  {displayVal(totals.driving)}
                </td>
                {customEntries.map(([customName]) => (
                  <td
                    key={`wing-total-custom-${customName}`}
                    className="px-2 py-2 border-r border-slate-700/80 text-amber-300 whitespace-nowrap"
                  >
                    {displayVal(totals.customDisposals[customName] || 0)}
                  </td>
                ))}
                <td className="px-2 py-2 border-r border-slate-700/80 text-rose-400 whitespace-nowrap">
                  {displayVal(totals.totalOutParade)}
                </td>
                <td className="px-2 py-2 border-r border-slate-700/80 text-emerald-400 whitespace-nowrap">
                  {displayVal(totals.onParade)}
                </td>
                <td className="px-1.5 py-2 text-slate-400 whitespace-nowrap w-px">
                  -
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Official Prepared By Signature Block below Flying Wing Consolidated State */}
        <div className="mt-8 pt-2 text-left text-[12px] text-slate-200">
          <div className="text-slate-300 font-normal mb-14">Prepared By</div>
          {dayState.preparedBy?.name && (
            <div className="font-bold text-slate-100 uppercase tracking-wide leading-snug">
              {dayState.preparedBy.name}
            </div>
          )}
          {dayState.preparedBy?.rank && (
            <div className="font-bold text-slate-200 uppercase leading-snug">
              {dayState.preparedBy.rank}
            </div>
          )}
          {dayState.preparedBy?.appointment && (
            <div className="text-slate-300 uppercase leading-snug">
              {dayState.preparedBy.appointment}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
