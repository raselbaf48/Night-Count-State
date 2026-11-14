import React from 'react';
import {
  Shield,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Printer,
  LogOut,
  LogIn,
  Menu,
  Cloud,
} from 'lucide-react';
import { OperatorProfile } from '../types/nightCount';
import { formatDateDayMonth, getWeekdayName } from '../utils/storage';
import { PWAInstallButton } from './PWAInstallButton';

interface ControlsBarProps {
  dateIso: string;
  formattedDate: string;
  onPrevDate: () => void;
  onNextDate: () => void;
  onOpenCalendar: () => void;
  onOpenPrint: () => void;
  activeTab: string;
  isWingView?: boolean;
  wingSubTab: 'consolidated' | 'log';
  unitSubTab: 'state' | 'nominalRoll' | 'log';
  operator?: OperatorProfile | null;
  onLogout?: () => void;
  onOpenMobileMenu: () => void;
  onOpenCloudSync: () => void;
  canExportPrint?: boolean;
  canOpenCloudSync?: boolean;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  dateIso,
  formattedDate,
  onPrevDate,
  onNextDate,
  onOpenCalendar,
  onOpenPrint,
  activeTab,
  isWingView = activeTab === 'Flying Wing',
  wingSubTab,
  unitSubTab,
  operator,
  onLogout,
  onOpenMobileMenu,
  onOpenCloudSync,
  canExportPrint = true,
  canOpenCloudSync = true,
}) => {

  const weekdayName = getWeekdayName(dateIso);
  const shortDateDisplay = formatDateDayMonth(dateIso) || formattedDate;

  const sectionLabel = isWingView
    ? wingSubTab === 'log'
      ? 'State Update Log'
      : `${activeTab} • Consolidated State`
    : unitSubTab === 'nominalRoll'
      ? `${activeTab} • Nominal Roll`
      : unitSubTab === 'log'
        ? `${activeTab} • Update Log`
        : `${activeTab} • Night Count State`;

  return (
    <header className="w-full bg-[#08101e]/95 border-b border-[#16233b] sticky top-0 z-20 backdrop-blur-md">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-5 py-2.5 sm:py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3">
          {/* Left: Mobile Drawer Toggle + Breadcrumb & Active Section Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={onOpenMobileMenu}
              aria-label="Open navigation menu"
              className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg bg-[#0d192e] hover:bg-[#142542] border border-[#1e3152] text-emerald-400 transition-colors cursor-pointer shrink-0"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-emerald-400 tracking-wider uppercase">
                <Shield className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">{activeTab} • DAILY NIGHT COUNT STATE</span>
              </div>
              <h1 className="text-base sm:text-xl font-bold text-white tracking-tight truncate">
                {sectionLabel}
              </h1>
            </div>
          </div>

          {/* Right Action Tools - Wraps cleanly on narrow mobile screens without overflow */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full md:w-auto min-w-0">
            {/* Date & Bar (stacked) paired with Official Export/Print of matching height */}
            <div className="flex items-stretch gap-2 w-full sm:w-auto min-w-0">
              {/* Date Selector: Date row on top, Bar (Weekday) below */}
              <div className="flex flex-col items-center justify-center bg-[#070e1b] border border-slate-700/80 rounded-lg px-2 sm:px-2.5 py-1.5 gap-1 text-[11px] sm:text-xs text-slate-300 shrink-0">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="text-slate-400 font-medium text-[10px] sm:text-[11px]">Date:</span>
                  <button
                    type="button"
                    onClick={onPrevDate}
                    className="date-arrow-3d-btn w-6 h-6 sm:w-7 sm:h-7 inline-flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer shrink-0"
                    title="Previous Day"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>

                  <button
                    type="button"
                    onClick={onOpenCalendar}
                    className="relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 bg-[#0e1b30] hover:bg-[#162744] text-slate-100 font-medium rounded-md cursor-pointer transition-colors border border-slate-700/60 whitespace-nowrap"
                    title="Click to select date"
                  >
                    <span className="text-[11px] sm:text-xs font-semibold tabular-nums">
                      {shortDateDisplay}
                    </span>
                    <CalendarIcon className="w-3 h-3 text-slate-400 shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={onNextDate}
                    className="date-arrow-3d-btn w-6 h-6 sm:w-7 sm:h-7 inline-flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer shrink-0"
                    title="Next Day"
                  >
                    <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>

                {weekdayName && (
                  <div className="w-full text-center pt-1.5 border-t border-slate-700/80 text-emerald-400 font-extrabold text-sm sm:text-base tracking-wide whitespace-nowrap leading-tight">
                    {weekdayName}
                  </div>
                )}
              </div>

              {/* Colored Official Export / Print Button matching Date + Bar box height */}
              {canExportPrint && (
                <button
                  type="button"
                  onClick={onOpenPrint}
                  className="flex-1 sm:flex-initial self-stretch flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] sm:text-xs font-semibold rounded-lg border border-blue-400/40 transition-all cursor-pointer shadow-md shadow-blue-900/30 text-center leading-tight min-w-0 sm:whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>Official Export/Print</span>
                </button>
              )}
            </div>

            <PWAInstallButton />

            {/* Cloud Sync Shortcut Button */}
            {canOpenCloudSync && (
              <button
                type="button"
                onClick={onOpenCloudSync}
                title="Database Cloud Sync"
                className="inline-flex items-center justify-center p-1.5 sm:p-2 rounded-lg bg-[#070e1b] hover:bg-[#101c31] border border-slate-700/80 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer shrink-0"
              >
                <Cloud className="w-3.5 h-3.5" />
              </button>
            )}

            {onLogout &&
              (operator ? (
                <div className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg bg-[#070e1b] border border-slate-700/80 text-[11px] sm:text-xs whitespace-nowrap shrink-0">
                  <span className="text-slate-300 font-medium">
                    {operator.rank} {operator.name}
                    <span className="text-slate-500 ml-1 tabular-nums">· {operator.bdNo}</span>
                  </span>
                  <button
                    type="button"
                    onClick={onLogout}
                    title="Logout and switch operator"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 border border-slate-700/80 hover:border-rose-700/60 transition-colors cursor-pointer font-semibold"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 pl-2.5 pr-1 py-1 rounded-lg bg-[#070e1b] border border-slate-700/80 text-[11px] sm:text-xs whitespace-nowrap shrink-0">
                  <span className="text-slate-400 font-medium">Guest</span>
                  <button
                    type="button"
                    onClick={onLogout}
                    title="Return to Login Portal"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 transition-colors cursor-pointer font-semibold"
                  >
                    <LogIn className="w-3 h-3" />
                    <span>User Login</span>
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </header>
  );
};
