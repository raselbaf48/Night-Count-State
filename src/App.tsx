/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ControlsBar } from './components/ControlsBar';
import { UnitStateView } from './components/UnitStateView';
import { ConsolidatedWingView } from './components/ConsolidatedWingView';
import { NominalRollView } from './components/NominalRollView';
import { PreparedByModal } from './components/PreparedByModal';
import { PrintReportModal } from './components/PrintReportModal';
import { DayState, Airman, DisposalRecord, PreparedByInfo, UnitRowState } from './types/nightCount';
import {
  loadDayState,
  saveDayState,
  loadSavedCustomDisposals,
  saveCustomDisposalsList,
  shiftDate,
  syncConsolidated155Row,
  getUnitAirmen,
  setUnitAirmen,
  setUnitRemarks,
  loadUiPrefs,
  saveUiPrefs,
  savePreparedByStorage,
} from './utils/storage';
import { DISPOSAL_OPTIONS } from './data/initialData';
import { FileSpreadsheet, Users, UserCheck } from 'lucide-react';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  const initialPrefs = React.useMemo(() => loadUiPrefs(), []);
  const [dateIso, setDateIso] = useState<string>(initialPrefs.dateIso);
  const [activeTab, setActiveTab] = useState<string>(initialPrefs.activeTab);
  const [unitSubTab, setUnitSubTab] = useState<'state' | 'nominalRoll'>(initialPrefs.unitSubTab);
  const [dayState, setDayState] = useState<DayState>(() => loadDayState(initialPrefs.dateIso));

  // Modals state
  const [isPreparedByOpen, setIsPreparedByOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Persist current date, tab, and sub-tab so user's view never resets
  useEffect(() => {
    saveUiPrefs({ dateIso, activeTab, unitSubTab });
  }, [dateIso, activeTab, unitSubTab]);

  // Sync state on date change (carrying over previous day's disposals & roster for new dates)
  useEffect(() => {
    setDayState((prev) => {
      if (prev.date === dateIso) return prev;
      saveDayState(prev);
      return loadDayState(dateIso, prev);
    });
  }, [dateIso]);

  // Persist dayState when updated and sync unit rows into consolidated table
  const updateAndSaveState = (updater: (prev: DayState) => DayState) => {
    setDayState((prev) => {
      const next = updater(prev);
      const syncedUnits = syncConsolidated155Row(next.consolidatedUnits, next);
      const fullySynced = { ...next, consolidatedUnits: syncedUnits };
      saveDayState(fullySynced);
      return fullySynced;
    });
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'Flying Wing') {
      setUnitSubTab('state');
    }
  };

  const handlePrevDate = () => {
    const prev = shiftDate(dateIso, -1);
    setDateIso(prev);
  };

  const handleNextDate = () => {
    const next = shiftDate(dateIso, 1);
    setDateIso(next);
  };

  const handleDateChange = (newDateIso: string) => {
    setDateIso(newDateIso);
  };

  const activeUnitName = activeTab === 'Flying Wing' ? '155 UASU BAF' : activeTab;

  // Update Airman Disposal directly from Nominal Roll dropdown
  const handleUpdateAirmanDisposal = (airmanId: string, disposalVal: string) => {
    updateAndSaveState((prev) => {
      const currentUnitAirmen = getUnitAirmen(prev, activeUnitName);
      const airman = currentUnitAirmen.find((a) => a.id === airmanId);
      if (!airman) return prev;

      if (disposalVal === '-') {
        const updatedDisposals = prev.disposals.filter((d) => d.airmanId !== airmanId);
        const updatedAirmen = currentUnitAirmen.map((a) =>
          a.id === airmanId ? { ...a, status: 'on_parade' as const, currentDuty: undefined } : a
        );
        return setUnitAirmen({ ...prev, disposals: updatedDisposals }, activeUnitName, updatedAirmen);
      } else {
        const dispOpt = DISPOSAL_OPTIONS.find((o) => o.value === disposalVal);
        const category = dispOpt ? dispOpt.category : 'custom';
        const isDet = category === 'detTdy';

        const existingIdx = prev.disposals.findIndex((d) => d.airmanId === airmanId);
        let updatedDisposals: DisposalRecord[];

        const newRecord: DisposalRecord = {
          id: existingIdx >= 0 ? prev.disposals[existingIdx].id : `disp-${Date.now()}-${airmanId}`,
          airmanId: airman.id,
          rank: airman.rank,
          name: airman.name,
          unit: activeUnitName,
          category,
          displayCategory: disposalVal,
          detail: disposalVal,
          date: prev.date,
          period: isDet ? 'Temporary' : 'Night',
        };

        if (existingIdx >= 0) {
          updatedDisposals = [...prev.disposals];
          updatedDisposals[existingIdx] = newRecord;
        } else {
          updatedDisposals = [...prev.disposals, newRecord];
        }

        const updatedAirmen = currentUnitAirmen.map((a) =>
          a.id === airmanId
            ? {
                ...a,
                status: (isDet ? 'detached' : 'duty') as Airman['status'],
                currentDuty: disposalVal,
              }
            : a
        );

        const prevSavedCustom = prev.savedCustomDisposals ?? loadSavedCustomDisposals();
        const trimmedCustom = disposalVal.trim();
        const nextSavedCustom =
          category === 'custom' &&
          trimmedCustom &&
          !prevSavedCustom.some((c) => c.toLowerCase() === trimmedCustom.toLowerCase())
            ? [...prevSavedCustom, trimmedCustom]
            : prevSavedCustom;

        if (nextSavedCustom !== prevSavedCustom) {
          saveCustomDisposalsList(nextSavedCustom);
        }

        return setUnitAirmen(
          {
            ...prev,
            disposals: updatedDisposals,
            savedCustomDisposals: nextSavedCustom,
          },
          activeUnitName,
          updatedAirmen
        );
      }
    });
  };

  // Add a custom disposal name persistently
  const handleAddCustomDisposal = (customName: string) => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    updateAndSaveState((prev) => {
      const prevSavedCustom = prev.savedCustomDisposals ?? loadSavedCustomDisposals();
      if (prevSavedCustom.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }
      const nextSavedCustom = [...prevSavedCustom, trimmed];
      saveCustomDisposalsList(nextSavedCustom);
      return {
        ...prev,
        savedCustomDisposals: nextSavedCustom,
      };
    });
  };

  // Delete a saved custom disposal manually via Cross button
  const handleDeleteCustomDisposal = (customName: string) => {
    updateAndSaveState((prev) => {
      const targetLower = customName.trim().toLowerCase();
      const prevSavedCustom = prev.savedCustomDisposals ?? loadSavedCustomDisposals();
      const nextSavedCustom = prevSavedCustom.filter((c) => c.toLowerCase() !== targetLower);
      saveCustomDisposalsList(nextSavedCustom);

      const affectedAirmanIds = new Set(
        prev.disposals
          .filter(
            (d) =>
              d.category === 'custom' &&
              (d.detail || d.displayCategory || '').trim().toLowerCase() === targetLower
          )
          .map((d) => d.airmanId)
          .filter(Boolean)
      );

      const updatedDisposals = prev.disposals.filter(
        (d) =>
          !(
            d.category === 'custom' &&
            (d.detail || d.displayCategory || '').trim().toLowerCase() === targetLower
          )
      );

      const resetAirmenList = (list: Airman[]) =>
        list.map((a) =>
          affectedAirmanIds.has(a.id)
            ? { ...a, status: 'on_parade' as const, currentDuty: undefined }
            : a
        );

      const nextUnitAirmen: Record<string, Airman[]> = {};
      if (prev.unitAirmen) {
        Object.entries(prev.unitAirmen).forEach(([u, list]) => {
          nextUnitAirmen[u] = resetAirmenList(list);
        });
      }

      const nextConsolidatedUnits = prev.consolidatedUnits.map((u) => {
        if (!u.customDisposals && !u.disposalCounts) return u;
        const nextCustom = u.customDisposals ? { ...u.customDisposals } : undefined;
        const nextCounts = u.disposalCounts ? { ...u.disposalCounts } : undefined;
        if (nextCustom) {
          Object.keys(nextCustom).forEach((k) => {
            if (k.trim().toLowerCase() === targetLower) delete nextCustom[k];
          });
        }
        if (nextCounts) {
          Object.keys(nextCounts).forEach((k) => {
            if (k.trim().toLowerCase() === targetLower) delete nextCounts[k];
          });
        }
        return { ...u, customDisposals: nextCustom, disposalCounts: nextCounts };
      });

      return {
        ...prev,
        savedCustomDisposals: nextSavedCustom,
        disposals: updatedDisposals,
        airmen155: resetAirmenList(prev.airmen155),
        unitAirmen: nextUnitAirmen,
        consolidatedUnits: nextConsolidatedUnits,
      };
    });
  };

  // Remove Disposal Handler
  const handleRemoveDisposal = (disposalId: string) => {
    updateAndSaveState((prev) => {
      const dispToRemove = prev.disposals.find((d) => d.id === disposalId);
      const filteredDisposals = prev.disposals.filter((d) => d.id !== disposalId);

      if (dispToRemove && dispToRemove.airmanId) {
        const unit = dispToRemove.unit || activeUnitName;
        const updatedList = getUnitAirmen(prev, unit).map((a) =>
          a.id === dispToRemove.airmanId
            ? { ...a, status: 'on_parade' as const, currentDuty: undefined }
            : a
        );
        return setUnitAirmen({ ...prev, disposals: filteredDisposals }, unit, updatedList);
      }

      return {
        ...prev,
        disposals: filteredDisposals,
      };
    });
  };

  // Quick toggle parade status
  const handleToggleAirmanParade = (airmanId: string) => {
    updateAndSaveState((prev) => {
      const currentUnitAirmen = getUnitAirmen(prev, activeUnitName);
      const airman = currentUnitAirmen.find((a) => a.id === airmanId);
      if (!airman) return prev;

      if (airman.status === 'on_parade') {
        const newDisp: DisposalRecord = {
          id: `disp-${Date.now()}`,
          airmanId: airman.id,
          rank: airman.rank,
          name: airman.name,
          unit: activeUnitName,
          category: 'officeDuty',
          displayCategory: 'Office Duty',
          detail: 'Office Duty',
          date: prev.date,
          period: 'Night',
        };
        const updatedList = currentUnitAirmen.map((a) =>
          a.id === airmanId ? { ...a, status: 'duty' as const, currentDuty: 'Office Duty' } : a
        );
        return setUnitAirmen(
          { ...prev, disposals: [...prev.disposals, newDisp] },
          activeUnitName,
          updatedList
        );
      } else {
        const updatedList = currentUnitAirmen.map((a) =>
          a.id === airmanId ? { ...a, status: 'on_parade' as const, currentDuty: undefined } : a
        );
        return setUnitAirmen(
          { ...prev, disposals: prev.disposals.filter((d) => d.airmanId !== airmanId) },
          activeUnitName,
          updatedList
        );
      }
    });
  };

  // Add new airman to active unit roster
  const handleAddAirmanToRoster = (newAirmanData: Omit<Airman, 'id'>) => {
    updateAndSaveState((prev) => {
      const targetUnit = newAirmanData.unit || activeUnitName;
      const currentList = getUnitAirmen(prev, targetUnit);
      const updatedList = [
        ...currentList,
        {
          ...newAirmanData,
          unit: targetUnit,
          id: `airman-${Date.now()}`,
        },
      ];
      return setUnitAirmen(prev, targetUnit, updatedList);
    });
  };

  // Update Prepared By
  const handleSavePreparedBy = (updated: PreparedByInfo) => {
    savePreparedByStorage(updated);
    updateAndSaveState((prev) => ({
      ...prev,
      preparedBy: updated,
    }));
  };

  // Update unit remarks
  const handleUpdateRemarks = (remarks: string) => {
    updateAndSaveState((prev) => setUnitRemarks(prev, activeUnitName, remarks));
  };

  // Delete airman from active unit roster
  const handleDeleteAirman = (airmanId: string) => {
    updateAndSaveState((prev) => {
      const updatedList = getUnitAirmen(prev, activeUnitName).filter((a) => a.id !== airmanId);
      return setUnitAirmen(
        { ...prev, disposals: prev.disposals.filter((d) => d.airmanId !== airmanId) },
        activeUnitName,
        updatedList
      );
    });
  };

  // Full airman update (from clicking row in Nominal Roll)
  const handleUpdateAirmanFull = (updatedAirman: Airman, disposalVal: string) => {
    updateAndSaveState((prev) => {
      const targetUnit = updatedAirman.unit || activeUnitName;
      const updatedAirmen = getUnitAirmen(prev, targetUnit).map((a) =>
        a.id === updatedAirman.id ? { ...updatedAirman } : a
      );

      let updatedDisposals = prev.disposals.filter((d) => d.airmanId !== updatedAirman.id);

      if (disposalVal && disposalVal !== '-') {
        const dispOpt = DISPOSAL_OPTIONS.find((o) => o.value === disposalVal);
        const category = dispOpt ? dispOpt.category : 'custom';
        const isDet = category === 'detTdy';

        const newRecord: DisposalRecord = {
          id: `disp-${Date.now()}-${updatedAirman.id}`,
          airmanId: updatedAirman.id,
          rank: updatedAirman.rank,
          name: updatedAirman.name,
          unit: targetUnit,
          category,
          displayCategory: disposalVal,
          detail: disposalVal,
          date: prev.date,
          period: isDet ? 'Temporary' : 'Night',
        };
        updatedDisposals.push(newRecord);
      }

      return setUnitAirmen({ ...prev, disposals: updatedDisposals }, targetUnit, updatedAirmen);
    });
  };

  // Update Squadron in Flying Wing
  const handleUpdateSquadronRow = (updatedRow: UnitRowState) => {
    updateAndSaveState((prev) => ({
      ...prev,
      consolidatedUnits: prev.consolidatedUnits.map((u) =>
        u.sqnUnit === updatedRow.sqnUnit ? updatedRow : u
      ),
    }));
  };

  const activeUnitAirmenCount = getUnitAirmen(dayState, activeUnitName).length;

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-black">
      <div className={isPrintOpen ? 'no-print flex-1 flex flex-col' : 'flex-1 flex flex-col'}>
        {/* Controls Bar with Date and Flying Wing + All Squadron/Unit tabs */}
        <ControlsBar
          dateIso={dateIso}
          formattedDate={dayState.formattedDisplayDate}
          onPrevDate={handlePrevDate}
          onNextDate={handleNextDate}
          onDateChange={handleDateChange}
          onOpenPrint={() => setIsPrintOpen(true)}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Main Content Area */}
        <main className="flex-1 w-full">
          {activeTab === 'Flying Wing' ? (
            <>
              {/* 2 Sub-options ONLY for Flying Wing: 1. Consolidated State, 2. Prepared By */}
              <div className="w-full max-w-7xl mx-auto px-4 mb-3">
                <div className="inline-flex items-center gap-1.5 bg-[#0b1424] border border-[#1b2a44] p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setIsPreparedByOpen(false)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      !isPreparedByOpen
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Consolidated State</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPreparedByOpen(true)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isPreparedByOpen
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Prepared By</span>
                  </button>
                </div>
              </div>

              <ConsolidatedWingView
                dayState={dayState}
                onUpdateSquadronRow={handleUpdateSquadronRow}
                onSelectUnit={(unitName) => handleTabChange(unitName)}
                onAddCustomDisposal={handleAddCustomDisposal}
                onDeleteCustomDisposal={handleDeleteCustomDisposal}
              />
            </>
          ) : (
            <>
              {/* Inner Sub-Tabs inside each Squadron/Unit (Night Count State & Nominal Roll) */}
              <div className="w-full max-w-7xl mx-auto px-4 mb-3">
                <div className="inline-flex items-center gap-1.5 bg-[#0b1424] border border-[#1b2a44] p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setUnitSubTab('state')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      unitSubTab === 'state'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Night Count State</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitSubTab('nominalRoll')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      unitSubTab === 'nominalRoll'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Nominal Roll</span>
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-900/60 text-[10px] text-slate-200">
                      {activeUnitAirmenCount}
                    </span>
                  </button>
                </div>
              </div>

              {unitSubTab === 'state' ? (
                <UnitStateView
                  unitName={activeUnitName}
                  dayState={dayState}
                  onRemoveDisposal={handleRemoveDisposal}
                  onToggleAirmanParade={handleToggleAirmanParade}
                  onSelectAirmanForDisposal={() => setUnitSubTab('nominalRoll')}
                  onUpdateRemarks={handleUpdateRemarks}
                />
              ) : (
                <NominalRollView
                  unitName={activeUnitName}
                  dayState={dayState}
                  onUpdateAirmanDisposal={handleUpdateAirmanDisposal}
                  onUpdateAirmanFull={handleUpdateAirmanFull}
                  onAddAirman={handleAddAirmanToRoster}
                  onDeleteAirman={handleDeleteAirman}
                  onDeleteCustomDisposal={handleDeleteCustomDisposal}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Prepared By Modal */}
      <PreparedByModal
        isOpen={isPreparedByOpen}
        onClose={() => setIsPreparedByOpen(false)}
        preparedBy={dayState.preparedBy}
        onSave={handleSavePreparedBy}
      />

      {/* Official Export / Print Modal */}
      <PrintReportModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        dayState={dayState}
        activeTab={activeTab}
        unitSubTab={unitSubTab}
      />

      <OfflineIndicator />
    </div>
  );
}
