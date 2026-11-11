/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
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
  shiftDate,
  syncConsolidated155Row,
} from './utils/storage';
import { INITIAL_DAY_STATE, DISPOSAL_OPTIONS } from './data/initialData';

export default function App() {
  const [dateIso, setDateIso] = useState<string>('2026-11-11');
  const [activeTab, setActiveTab] = useState<'155 UASU BAF' | 'Flying Wing' | 'Nominal Roll'>('155 UASU BAF');
  const [dayState, setDayState] = useState<DayState>(() => loadDayState('2026-11-11'));

  // Modals state
  const [isPreparedByOpen, setIsPreparedByOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Sync state on date change
  useEffect(() => {
    const loaded = loadDayState(dateIso);
    setDayState(loaded);
  }, [dateIso]);

  // Persist dayState when updated and sync 155 row into consolidated table
  const updateAndSaveState = (updater: (prev: DayState) => DayState) => {
    setDayState((prev) => {
      const next = updater(prev);
      const syncedUnits = syncConsolidated155Row(next.consolidatedUnits, next);
      const fullySynced = { ...next, consolidatedUnits: syncedUnits };
      saveDayState(fullySynced);
      return fullySynced;
    });
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

  // Update Airman Disposal directly from Nominal Roll dropdown
  const handleUpdateAirmanDisposal = (airmanId: string, disposalVal: string) => {
    updateAndSaveState((prev) => {
      const airman = prev.airmen155.find((a) => a.id === airmanId);
      if (!airman) return prev;

      if (disposalVal === '-') {
        // Return to On Parade
        const updatedDisposals = prev.disposals.filter((d) => d.airmanId !== airmanId);
        const updatedAirmen = prev.airmen155.map((a) =>
          a.id === airmanId ? { ...a, status: 'on_parade' as const, currentDuty: undefined } : a
        );
        return {
          ...prev,
          disposals: updatedDisposals,
          airmen155: updatedAirmen,
        };
      } else {
        // Assigned to a specific disposal/duty
        const dispOpt = DISPOSAL_OPTIONS.find((o) => o.value === disposalVal);
        const category = dispOpt ? dispOpt.category : 'officeDuty';
        const isDet = category === 'detTdy';

        // Check if existing disposal record for this airman exists
        const existingIdx = prev.disposals.findIndex((d) => d.airmanId === airmanId);
        let updatedDisposals: DisposalRecord[];

        const newRecord: DisposalRecord = {
          id: existingIdx >= 0 ? prev.disposals[existingIdx].id : `disp-${Date.now()}-${airmanId}`,
          airmanId: airman.id,
          rank: airman.rank,
          name: airman.name,
          unit: '155 UASU BAF',
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

        const updatedAirmen = prev.airmen155.map((a) =>
          a.id === airmanId
            ? {
                ...a,
                status: (isDet ? 'detached' : 'duty') as Airman['status'],
                currentDuty: disposalVal,
              }
            : a
        );

        return {
          ...prev,
          disposals: updatedDisposals,
          airmen155: updatedAirmen,
        };
      }
    });
  };

  // Remove Disposal Handler
  const handleRemoveDisposal = (disposalId: string) => {
    updateAndSaveState((prev) => {
      const dispToRemove = prev.disposals.find((d) => d.id === disposalId);
      const filteredDisposals = prev.disposals.filter((d) => d.id !== disposalId);

      let updatedAirmen = prev.airmen155;
      if (dispToRemove && dispToRemove.airmanId) {
        updatedAirmen = prev.airmen155.map((a) =>
          a.id === dispToRemove.airmanId
            ? { ...a, status: 'on_parade' as const, currentDuty: undefined }
            : a
        );
      }

      return {
        ...prev,
        disposals: filteredDisposals,
        airmen155: updatedAirmen,
      };
    });
  };

  // Quick toggle parade status
  const handleToggleAirmanParade = (airmanId: string) => {
    updateAndSaveState((prev) => {
      const airman = prev.airmen155.find((a) => a.id === airmanId);
      if (!airman) return prev;

      if (airman.status === 'on_parade') {
        const newDisp: DisposalRecord = {
          id: `disp-${Date.now()}`,
          airmanId: airman.id,
          rank: airman.rank,
          name: airman.name,
          unit: '155 UASU BAF',
          category: 'officeDuty',
          displayCategory: 'Office Duty',
          detail: 'Office Duty',
          date: prev.date,
          period: 'Night',
        };
        return {
          ...prev,
          disposals: [...prev.disposals, newDisp],
          airmen155: prev.airmen155.map((a) =>
            a.id === airmanId ? { ...a, status: 'duty' as const, currentDuty: 'Office Duty' } : a
          ),
        };
      } else {
        return {
          ...prev,
          disposals: prev.disposals.filter((d) => d.airmanId !== airmanId),
          airmen155: prev.airmen155.map((a) =>
            a.id === airmanId ? { ...a, status: 'on_parade' as const, currentDuty: undefined } : a
          ),
        };
      }
    });
  };

  // Add new airman to roster
  const handleAddAirmanToRoster = (newAirmanData: Omit<Airman, 'id'>) => {
    updateAndSaveState((prev) => ({
      ...prev,
      airmen155: [
        ...prev.airmen155,
        {
          ...newAirmanData,
          id: `airman-${Date.now()}`,
        },
      ],
    }));
  };

  // Update Prepared By
  const handleSavePreparedBy = (updated: PreparedByInfo) => {
    updateAndSaveState((prev) => ({
      ...prev,
      preparedBy: updated,
    }));
  };

  // Update custom remarks
  const handleUpdateRemarks = (remarks: string) => {
    updateAndSaveState((prev) => ({
      ...prev,
      customRemarks: remarks,
    }));
  };

  // Delete airman from roster
  const handleDeleteAirman = (airmanId: string) => {
    updateAndSaveState((prev) => ({
      ...prev,
      airmen155: prev.airmen155.filter((a) => a.id !== airmanId),
      disposals: prev.disposals.filter((d) => d.airmanId !== airmanId),
    }));
  };

  // Full airman update (from clicking row in Nominal Roll)
  const handleUpdateAirmanFull = (updatedAirman: Airman, disposalVal: string) => {
    updateAndSaveState((prev) => {
      // 1. Update airman in roster
      const updatedAirmen = prev.airmen155.map((a) =>
        a.id === updatedAirman.id ? { ...updatedAirman } : a
      );

      // 2. Update disposals
      let updatedDisposals = prev.disposals.filter((d) => d.airmanId !== updatedAirman.id);

      if (disposalVal && disposalVal !== '-') {
        const dispOpt = DISPOSAL_OPTIONS.find((o) => o.value === disposalVal);
        const category = dispOpt ? dispOpt.category : 'officeDuty';
        const isDet = category === 'detTdy';

        const newRecord: DisposalRecord = {
          id: `disp-${Date.now()}-${updatedAirman.id}`,
          airmanId: updatedAirman.id,
          rank: updatedAirman.rank,
          name: updatedAirman.name,
          unit: '155 UASU BAF',
          category,
          displayCategory: disposalVal,
          detail: disposalVal,
          date: prev.date,
          period: isDet ? 'Temporary' : 'Night',
        };
        updatedDisposals.push(newRecord);
      }

      return {
        ...prev,
        airmen155: updatedAirmen,
        disposals: updatedDisposals,
      };
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

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-black">
      {/* Top Header */}
      <Header
        currentUnit="155-UASU-BAF"
        dateStr={dayState.formattedDisplayDate}
        onResetToToday={() => setDateIso('2026-11-11')}
      />

      {/* Controls Bar with Date and Nominal Roll tab */}
      <ControlsBar
        dateIso={dateIso}
        formattedDate={dayState.formattedDisplayDate}
        onPrevDate={handlePrevDate}
        onNextDate={handleNextDate}
        onDateChange={handleDateChange}
        onOpenPrint={() => setIsPrintOpen(true)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {activeTab === '155 UASU BAF' && (
          <UnitStateView
            dayState={dayState}
            onRemoveDisposal={handleRemoveDisposal}
            onToggleAirmanParade={handleToggleAirmanParade}
            onSelectAirmanForDisposal={() => {
              setActiveTab('Nominal Roll');
            }}
            onUpdateRemarks={handleUpdateRemarks}
          />
        )}

        {activeTab === 'Flying Wing' && (
          <ConsolidatedWingView
            dayState={dayState}
            onUpdateSquadronRow={handleUpdateSquadronRow}
            onSwitchToUnit={() => setActiveTab('155 UASU BAF')}
          />
        )}

        {activeTab === 'Nominal Roll' && (
          <NominalRollView
            dayState={dayState}
            onUpdateAirmanDisposal={handleUpdateAirmanDisposal}
            onUpdateAirmanFull={handleUpdateAirmanFull}
            onAddAirman={handleAddAirmanToRoster}
            onDeleteAirman={handleDeleteAirman}
          />
        )}
      </main>

      {/* Prepared By Modal (accessible by clicking signature block in state view) */}
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
        activeTab={activeTab === 'Flying Wing' ? 'Flying Wing' : '155 UASU BAF'}
      />
    </div>
  );
}
