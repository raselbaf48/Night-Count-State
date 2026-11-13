import React, { useRef } from 'react';
import {
  Shield,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Printer,
} from 'lucide-react';
import { FLYING_WING_SQUADRONS } from '../data/initialData';

interface ControlsBarProps {
  dateIso: string;
  formattedDate: string;
  onPrevDate: () => void;
  onNextDate: () => void;
  onDateChange: (iso: string) => void;
  onOpenPrint: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
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

  const tabs = ['Flying Wing', ...FLYING_WING_SQUADRONS];

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 pt-4 sm:pt-5 pb-3">
      {/* Top Controls Box */}
      <div className="bg-[#0b1424] border border-[#1b2a44] rounded-xl p-3 sm:p-5 shadow-lg shadow-black/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          {/* Left Text */}
          <div>
            <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-emerald-400 tracking-wide uppercase">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{activeTab} • DAILY NIGHT COUNT STATE</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight mt-0.5 sm:mt-1">
              Night Count State Controls
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Manage night count date, personnel state and display settings
            </p>
          </div>

          {/* Right Action Tools - Always side by side on Mobile & Desktop */}
          <div className="flex flex-nowrap items-center justify-between sm:justify-end gap-1.5 sm:gap-3 w-full md:w-auto">
            {/* Date Selector */}
            <div className="flex items-center bg-[#070e1b] border border-slate-700/80 rounded-lg px-1.5 sm:px-2.5 py-1 sm:py-1.5 gap-0.5 sm:gap-1.5 text-[11px] sm:text-xs text-slate-300 shrink-0">
              <span className="text-slate-400 font-medium text-[10px] sm:text-[11px]">Dt:</span>
              <button
                type="button"
                onClick={onPrevDate}
                className="p-0.5 sm:p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div
                onClick={handleDatePickerClick}
                className="relative flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 bg-[#0e1b30] hover:bg-[#162744] text-slate-100 font-medium rounded cursor-pointer transition-colors border border-slate-700/60 whitespace-nowrap"
                title="Click to pick date"
              >
                <span className="text-[11px] sm:text-xs font-semibold">{formattedDate}</span>
                <CalendarIcon className="w-3 h-3 text-slate-400 shrink-0" />
                <input
                  ref={dateInputRef}
                  type="date"
                  value={dateIso}
                  onChange={(e) => e.target.value && onDateChange(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  aria-label="Select date"
                />
              </div>

              <button
                type="button"
                onClick={onNextDate}
                className="p-0.5 sm:p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Colored Official Export / Print Button beside Dt */}
            <button
              type="button"
              onClick={onOpenPrint}
              className="flex items-center justify-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] sm:text-xs font-semibold rounded-lg border border-blue-400/40 transition-all cursor-pointer shadow-md shadow-blue-900/30 whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5 text-white shrink-0" />
              <span>Official Export/Print</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs below Controls: Flying Wing & All Squadrons/Units */}
      <div className="flex flex-wrap items-center gap-2 mt-4 select-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-sm flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#00c853] text-slate-950 shadow-[#00c853]/20 font-bold'
                  : 'bg-[#0b172a] text-slate-300 hover:text-white hover:bg-[#132238] border border-slate-800'
              }`}
            >
              <span>{tab}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
