import React from 'react';
import { X, Calendar, ArrowRight, RotateCcw, Clock } from 'lucide-react';
import { formatDateToMilitary } from '../utils/storage';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  dates: string[];
  currentDate: string;
  onSelectDate: (dateIso: string) => void;
  onResetDefaults: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  dates,
  currentDate,
  onSelectDate,
  onResetDefaults,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0b1424] border border-slate-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0e1b30] border-b border-slate-700/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Night Count History</h3>
              <p className="text-[11px] text-slate-400">Past dates and recorded muster states</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {dates.map((d) => {
              const isSelected = d === currentDate;
              const mil = formatDateToMilitary(d);

              return (
                <div
                  key={d}
                  onClick={() => {
                    onSelectDate(d);
                    onClose();
                  }}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-600 text-emerald-300'
                      : 'bg-[#070e1b] border-slate-800 hover:border-slate-700 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <div className="font-bold text-xs">{mil}</div>
                      <div className="text-[10px] text-slate-500 font-sans">{d}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-medium">
                    {isSelected ? (
                      <span className="text-emerald-400 font-semibold">Active Date</span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1 group-hover:text-white">
                        View <ArrowRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reset button */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <button
              onClick={() => {
                if (confirm('Reset state to initial default screenshot sample data?')) {
                  onResetDefaults();
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Screenshot Default</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
