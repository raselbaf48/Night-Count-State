import React, { useRef } from 'react';
import {
  Shield,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Printer,
  Users,
} from 'lucide-react';

interface ControlsBarProps {
  dateIso: string;
  formattedDate: string;
  onPrevDate: () => void;
  onNextDate: () => void;
  onDateChange: (iso: string) => void;
  onOpenPrint: () => void;
  activeTab: '155 UASU BAF' | 'Flying Wing' | 'Nominal Roll';
  onTabChange: (tab: '155 UASU BAF' | 'Flying Wing' | 'Nominal Roll') => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  dateIso,
  formattedDate,
  onPrevDate,
  onNextDate,
  onDateChange,
  onOpenPrint,
  activeTab,
  onTabChange,
}) => {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleDatePickerClick = () => {
    if (dateInputRef.current) {
      dateInputRef.current.showPicker?.();
      dateInputRef.current.focus();
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pt-5 pb-3">
      {/* Top Controls Box */}
      <div className="bg-[#0b1424] border border-[#1b2a44] rounded-xl p-4 sm:p-5 shadow-lg shadow-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Left Text */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 tracking-wide uppercase">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>155 UASU BAF • DAILY NIGHT COUNT STATE</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              Night Count State Controls
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Manage night count date, personnel state and display settings
            </p>
          </div>

          {/* Right Action Tools - History, Prepared By, Roster, Add Disposal are removed as requested */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Date Selector */}
            <div className="flex items-center bg-[#070e1b] border border-slate-700/80 rounded-lg px-2.5 py-1.5 gap-1.5 text-xs text-slate-300">
              <span className="text-slate-400 font-medium text-[11px]">Dt:</span>
              <button
                onClick={onPrevDate}
                className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div
                onClick={handleDatePickerClick}
                className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[#0e1b30] hover:bg-[#162744] text-slate-100 font-medium rounded cursor-pointer transition-colors border border-slate-700/60"
                title="Click to pick date"
              >
                <span className="text-xs font-semibold">{formattedDate}</span>
                <CalendarIcon className="w-3 h-3 text-slate-400" />
                <input
                  ref={dateInputRef}
                  type="date"
                  value={dateIso}
                  onChange={(e) => e.target.value && onDateChange(e.target.value)}
                  className="sr-only"
                />
              </div>

              <button
                onClick={onNextDate}
                className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Official Export / Print Button */}
            <button
              onClick={onOpenPrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#101d33] hover:bg-[#182a47] text-slate-200 text-xs font-medium rounded-lg border border-slate-700/70 transition-colors cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Official Export / Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs below Controls: 155 UASU BAF, Flying Wing & Nominal Roll */}
      <div className="flex items-center gap-2 mt-4 select-none">
        <button
          onClick={() => onTabChange('155 UASU BAF')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1.5 ${
            activeTab === '155 UASU BAF'
              ? 'bg-[#00c853] text-slate-950 shadow-[#00c853]/20 font-bold'
              : 'bg-[#0b172a] text-slate-300 hover:text-white hover:bg-[#132238] border border-slate-800'
          }`}
        >
          <span>155 UASU BAF</span>
        </button>

        <button
          onClick={() => onTabChange('Flying Wing')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1.5 ${
            activeTab === 'Flying Wing'
              ? 'bg-[#00c853] text-slate-950 shadow-[#00c853]/20 font-bold'
              : 'bg-[#0b172a] text-slate-300 hover:text-white hover:bg-[#132238] border border-slate-800'
          }`}
        >
          <span>Flying Wing</span>
        </button>

        <button
          onClick={() => onTabChange('Nominal Roll')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1.5 ${
            activeTab === 'Nominal Roll'
              ? 'bg-[#00c853] text-slate-950 shadow-[#00c853]/20 font-bold'
              : 'bg-[#0b172a] text-slate-300 hover:text-white hover:bg-[#132238] border border-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Nominal Roll</span>
        </button>
      </div>
    </div>
  );
};
