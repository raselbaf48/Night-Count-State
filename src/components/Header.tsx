import React from 'react';
import { Shield, ChevronLeft, Calendar, Clock } from 'lucide-react';

interface HeaderProps {
  currentUnit: string;
  dateStr: string;
  onResetToToday?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentUnit, dateStr, onResetToToday }) => {
  return (
    <header className="bg-[#050b14] border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between text-xs select-none sticky top-0 z-40">
      {/* Left: Back button & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onResetToToday}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors text-xs font-medium cursor-pointer"
          title="Back to Today"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-wider text-slate-100 text-xs sm:text-sm uppercase">
            Night Count State
          </span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline text-[11px]">
            BAF Personnel Muster System
          </span>
        </div>
      </div>

      {/* Center: Unit Name */}
      <div className="hidden md:flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 text-xs">
        <Shield className="w-3 h-3 text-emerald-400" />
        <span className="font-semibold tracking-wide text-emerald-400">{currentUnit}</span>
      </div>

      {/* Right: Date badge */}
      <div className="flex items-center gap-3 text-slate-400 text-xs">
        <div className="flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800/80">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-200 font-medium">{dateStr}</span>
        </div>
      </div>
    </header>
  );
};
