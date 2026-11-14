import React, { useEffect, useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';
import { getTodayDateIso } from '../utils/storage';

interface DatePickerModalProps {
  isOpen: boolean;
  selectedDateIso: string;
  onSelectDate: (iso: string) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_HEADERS = [
  { label: 'Su', isWeekend: false },
  { label: 'Mo', isWeekend: false },
  { label: 'Tu', isWeekend: false },
  { label: 'We', isWeekend: false },
  { label: 'Th', isWeekend: false },
  { label: 'Fr', isWeekend: true },
  { label: 'Sa', isWeekend: true },
];

function parseIsoParts(iso: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]) - 1,
      day: Number(match[3]),
    };
  }
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    day: now.getDate(),
  };
}

function toIsoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  isOpen,
  selectedDateIso,
  onSelectDate,
  onClose,
}) => {
  const initialParts = parseIsoParts(selectedDateIso);
  const [viewYear, setViewYear] = useState<number>(initialParts.year);
  const [viewMonth, setViewMonth] = useState<number>(initialParts.month);

  useEffect(() => {
    if (isOpen) {
      const parts = parseIsoParts(selectedDateIso);
      setViewYear(parts.year);
      setViewMonth(parts.month);
    }
  }, [isOpen, selectedDateIso]);

  const todayIso = getTodayDateIso();

  const yearOptions = useMemo(() => {
    const baseYear = new Date().getFullYear();
    const minY = Math.min(2020, viewYear - 5, baseYear - 5);
    const maxY = Math.max(2035, viewYear + 5, baseYear + 5);
    const list: number[] = [];
    for (let y = minY; y <= maxY; y += 1) {
      list.push(y);
    }
    return list;
  }, [viewYear]);

  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Su .. 6 = Sa
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: Array<{ day: number | null; iso: string | null }> = [];
    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({ day: null, iso: null });
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      cells.push({ day: d, iso: toIsoDate(viewYear, viewMonth, d) });
    }
    return cells;
  }, [viewYear, viewMonth]);

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleTodayClick = () => {
    const tIso = getTodayDateIso();
    onSelectDate(tIso);
    onClose();
  };

  return (
    <div className="min-h-screen w-full bg-[#070d18] text-slate-100 flex items-center justify-center p-4 font-sans antialiased selection:bg-emerald-500 selection:text-black animate-tab-enter">
      <div className="w-full max-w-[380px] bg-[#0b1424] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-200 animate-modal-pop">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="calendar-accent-btn w-10 h-10 rounded-xl bg-[#5b4df7] text-white flex items-center justify-center shadow-md shadow-indigo-950/50 shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-100 leading-tight">Select Date</h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                তারিখ, মাস ও বছর পরিবর্তন করুন
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close calendar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Month & Year Navigation Bar */}
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#0e1b30] border border-slate-700/80">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="date-arrow-3d-btn w-8 h-8 inline-flex items-center justify-center rounded-lg transition-all duration-150 cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>

            <div className="flex items-center justify-center gap-1.5 min-w-0 flex-1">
              <div className="relative flex-1 min-w-0">
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                  aria-label="Select month"
                  className="w-full appearance-none bg-[#070e1b] border border-slate-700/80 rounded-lg pl-2.5 pr-7 py-1.5 text-xs sm:text-sm font-semibold text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {MONTH_NAMES.map((mName, idx) => (
                    <option key={mName} value={idx}>
                      {mName}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
              </div>

              <div className="relative w-[78px] shrink-0">
                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                  aria-label="Select year"
                  className="w-full appearance-none bg-[#070e1b] border border-slate-700/80 rounded-lg pl-2.5 pr-6 py-1.5 text-xs sm:text-sm font-semibold text-slate-100 tabular-nums focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {yearOptions.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="date-arrow-3d-btn w-8 h-8 inline-flex items-center justify-center rounded-lg transition-all duration-150 cursor-pointer shrink-0"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_HEADERS.map((w) => (
              <div
                key={w.label}
                className={`py-1 text-xs font-bold ${
                  w.isWeekend ? 'text-rose-500' : 'text-slate-400'
                }`}
              >
                {w.label}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {calendarCells.map((cell, idx) => {
              if (!cell.day || !cell.iso) {
                return <div key={`empty-${idx}`} className="h-9" />;
              }
              const isSelected = cell.iso === selectedDateIso;
              const isToday = cell.iso === todayIso;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => {
                    onSelectDate(cell.iso!);
                    onClose();
                  }}
                  className={`h-9 w-full flex items-center justify-center rounded-xl text-sm font-bold tabular-nums transition-all cursor-pointer ${
                    isSelected
                      ? 'calendar-accent-btn bg-[#5b4df7] text-white shadow-md shadow-indigo-950/60 scale-[1.03]'
                      : isToday
                        ? 'bg-[#0e1b30] text-emerald-400 border border-emerald-500/60 hover:bg-[#162744]'
                        : 'text-slate-100 hover:bg-[#162744] hover:text-white'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0e192d]/60 border-t border-slate-800/80">
          <button
            type="button"
            onClick={handleTodayClick}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Today</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-800/60"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
