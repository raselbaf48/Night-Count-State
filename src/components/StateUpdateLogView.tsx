import React, { useMemo, useState } from 'react';
import { History, Search } from 'lucide-react';
import { DayState, StateUpdateLogEntry, WingConfig } from '../types/nightCount';

interface StateUpdateLogViewProps {
  dayState: DayState;
  wings?: WingConfig[];
  activeWing?: WingConfig;
  unitFilter?: string;
  lockedUnit?: string;
}

export const StateUpdateLogView: React.FC<StateUpdateLogViewProps> = ({
  dayState,
  wings = [],
  activeWing,
  unitFilter,
  lockedUnit,
}) => {
  const effectiveUnitFilter = lockedUnit || unitFilter;
  const [searchQuery, setSearchQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'unit'>(effectiveUnitFilter ? 'unit' : 'all');

  const getWingForEntry = (unitName: string): WingConfig | undefined => {
    const clean = (unitName || '').trim().toLowerCase();
    if (!clean) return activeWing;
    return (
      wings.find(
        (w) =>
          w.name.toLowerCase() === clean ||
          w.shortName.toLowerCase() === clean ||
          w.units.some((u) => u.toLowerCase() === clean)
      ) || undefined
    );
  };

  const getSectionDisplayLabel = (entry: StateUpdateLogEntry): string => {
    if (
      entry.area === 'Quick Edit Sqn Count' ||
      entry.area.startsWith('Consolidated State')
    ) {
      const matchedWing = getWingForEntry(entry.unitName) || activeWing;
      const short = matchedWing?.shortName || 'FLG WG';
      return `Consolidated State : ${short}`;
    }
    return entry.area;
  };

  const baseLogs = useMemo(() => {
    const raw = Array.isArray(dayState.updateLogs) ? [...dayState.updateLogs] : [];
    return raw.filter((entry) => {
      if (lockedUnit) {
        return entry.unitName.toLowerCase() === lockedUnit.toLowerCase();
      }
      if (activeWing) {
        const entryUnitLower = (entry.unitName || '').trim().toLowerCase();
        const belongsToActiveWing =
          entryUnitLower === activeWing.name.toLowerCase() ||
          entryUnitLower === activeWing.shortName.toLowerCase() ||
          activeWing.units.some((u) => u.toLowerCase() === entryUnitLower);
        return belongsToActiveWing;
      }
      return true;
    });
  }, [dayState.updateLogs, lockedUnit, activeWing]);

  const logs = useMemo(() => {
    const raw = [...baseLogs];
    // Newest updates first
    raw.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

    return raw.filter((entry) => {
      if (
        (lockedUnit || scope === 'unit') &&
        effectiveUnitFilter &&
        entry.unitName.toLowerCase() !== effectiveUnitFilter.toLowerCase()
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const op = entry.operator;
        const sectionLabel = getSectionDisplayLabel(entry);
        const haystack = [
          entry.unitName,
          entry.area,
          sectionLabel,
          entry.action,
          entry.displayTime,
          op?.bdNo,
          op?.rank,
          op?.name,
          op?.trade,
          op?.flight,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      }
      return true;
    });
  }, [baseLogs, scope, effectiveUnitFilter, lockedUnit, searchQuery, wings, activeWing]);

  const totalDayLogs = baseLogs.length;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pb-12">
      <div className="bg-[#0b1424] border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-800/60 bg-[#0e192d]/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-100 tracking-wide">
                State Update Log — {dayState.formattedDisplayDate}
              </h2>
              <p className="text-[11px] text-slate-400">
                Record of who updated Consolidated State, Nominal Roll &amp; State today ({totalDayLogs}{' '}
                {totalDayLogs === 1 ? 'update' : 'updates'})
              </p>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 border-b border-slate-800/60 bg-[#08101e] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          {lockedUnit ? (
            <span className="text-xs text-slate-400 font-medium">
              Showing updates for <span className="text-emerald-400 font-semibold">{lockedUnit}</span> ({dayState.formattedDisplayDate})
            </span>
          ) : unitFilter ? (
            <div className="inline-flex items-center gap-1 bg-[#0b1424] border border-slate-800 p-1 rounded-lg self-start">
              <button
                type="button"
                onClick={() => setScope('unit')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  scope === 'unit'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {unitFilter}
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  scope === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {activeWing ? `All ${activeWing.shortName}` : 'All Units'} ({totalDayLogs})
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-medium">
              Showing {activeWing ? `${activeWing.name} ` : 'all '}updates for {dayState.formattedDisplayDate}
            </span>
          )}

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by BD, name, unit, action..."
              className="w-full bg-[#0b1424] border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Log Table */}
        <div className="overflow-x-auto">
          {logs.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400 text-xs">
              No state updates recorded for {dayState.formattedDisplayDate}
              {scope === 'unit' && unitFilter
                ? ` in ${unitFilter}`
                : activeWing
                  ? ` in ${activeWing.name}`
                  : ''}
              .
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#0e192d]/80 border-b border-slate-800 text-slate-300 uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">Ser</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">Time</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">BD No</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">Updated By</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">Trade &amp; Flight</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">Unit / Sqn</th>
                  <th className="py-3 px-4 font-semibold whitespace-nowrap">Section</th>
                  <th className="py-3 px-4 font-semibold">Update Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((entry, idx) => (
                  <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-medium">{idx + 1}</td>
                    <td className="py-3 px-4 text-slate-300 font-medium whitespace-nowrap">
                      {entry.displayTime || '-'}
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold whitespace-nowrap">
                      {entry.operator?.bdNo || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-100 font-semibold whitespace-nowrap">
                      {entry.operator?.rank} {entry.operator?.name}
                    </td>
                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      {entry.operator?.trade || '-'}
                      {entry.operator?.flight ? ` • ${entry.operator.flight}` : ''}
                    </td>
                    <td className="py-3 px-4 text-blue-300 font-semibold whitespace-nowrap">
                      {entry.unitName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-200 font-medium">
                        {getSectionDisplayLabel(entry)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-200 min-w-[220px]">{entry.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
