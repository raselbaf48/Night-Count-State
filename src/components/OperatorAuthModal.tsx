import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, X, AlertCircle } from 'lucide-react';
import { DayState, OperatorProfile } from '../types/nightCount';
import { BAF_ALL_RANKS, BAF_FLIGHTS, BAF_TRADES } from '../data/initialData';
import { findOperatorByBd } from '../utils/storage';

interface OperatorAuthModalProps {
  isOpen: boolean;
  dayState: DayState;
  initialOperator?: OperatorProfile | null;
  onVerify: (operator: OperatorProfile) => void;
  onCancel: () => void;
}

export const OperatorAuthModal: React.FC<OperatorAuthModalProps> = ({
  isOpen,
  dayState,
  initialOperator,
  onVerify,
  onCancel,
}) => {
  const [bdNo, setBdNo] = useState('');
  const [rank, setRank] = useState('');
  const [name, setName] = useState('');
  const [trade, setTrade] = useState('');
  const [flight, setFlight] = useState('');
  const [isCustomTrade, setIsCustomTrade] = useState(false);
  const [isCustomFlight, setIsCustomFlight] = useState(false);
  const [focusedField, setFocusedField] = useState<
    'bdNo' | 'rank' | 'name' | 'trade' | 'flight' | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const getModalFloatLabelClass = (field: 'bdNo' | 'rank' | 'name' | 'trade' | 'flight', value: string) => {
    const isFieldFocused = focusedField === field;
    const isFloating = isFieldFocused || value.length > 0;
    return `absolute left-3.5 pointer-events-none transition-all duration-150 uppercase tracking-wider font-bold z-10 ${
      isFloating
        ? `top-1 -translate-y-1/2 px-1.5 bg-[#0b1424] text-[10px] ${
            isFieldFocused ? 'text-emerald-400' : 'text-slate-400'
          }`
        : 'top-[calc(50%+2px)] -translate-y-1/2 text-xs text-slate-400'
    }`;
  };

  const availableTrades = useMemo(() => {
    const dynamic = new Set<string>(BAF_TRADES);
    (dayState.airmen155 || []).forEach((a) => {
      if (a.trade?.trim()) dynamic.add(a.trade.trim());
    });
    if (dayState.unitAirmen) {
      Object.values(dayState.unitAirmen).forEach((list) => {
        list.forEach((a) => {
          if (a.trade?.trim()) dynamic.add(a.trade.trim());
        });
      });
    }
    return Array.from(dynamic);
  }, [dayState]);

  const availableFlights = useMemo(() => {
    const dynamic = new Set<string>(BAF_FLIGHTS);
    (dayState.airmen155 || []).forEach((a) => {
      if (a.flight?.trim()) dynamic.add(a.flight.trim());
    });
    if (dayState.unitAirmen) {
      Object.values(dayState.unitAirmen).forEach((list) => {
        list.forEach((a) => {
          if (a.flight?.trim()) dynamic.add(a.flight.trim());
        });
      });
    }
    return Array.from(dynamic);
  }, [dayState]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setFocusedField(null);
    if (initialOperator) {
      setBdNo(initialOperator.bdNo || '');
      setRank(initialOperator.rank || '');
      setName(initialOperator.name || '');
      setTrade(initialOperator.trade || '');
      setFlight(initialOperator.flight || '');
      setIsCustomTrade(
        Boolean(initialOperator.trade && !availableTrades.includes(initialOperator.trade))
      );
      setIsCustomFlight(
        Boolean(initialOperator.flight && !availableFlights.includes(initialOperator.flight))
      );
    } else {
      setBdNo('');
      setRank('');
      setName('');
      setTrade('');
      setFlight('');
      setIsCustomTrade(false);
      setIsCustomFlight(false);
    }
  }, [isOpen, initialOperator, availableTrades, availableFlights]);

  if (!isOpen) return null;

  const handleBdChange = (rawValue: string) => {
    const digits = rawValue.replace(/\D/g, '').slice(0, 6);
    setBdNo(digits);
    setError(null);

    if (digits.length === 6) {
      const matched = findOperatorByBd(dayState, digits);
      if (matched) {
        setRank(matched.rank);
        setName(matched.name);
        setTrade(matched.trade);
        setFlight(matched.flight);
        setIsCustomTrade(Boolean(matched.trade && !availableTrades.includes(matched.trade)));
        setIsCustomFlight(Boolean(matched.flight && !availableFlights.includes(matched.flight)));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanBd = bdNo.trim();
    const cleanName = name.trim();
    const cleanTrade = trade.trim();
    const cleanFlight = flight.trim();

    if (!/^\d{6}$/.test(cleanBd)) {
      setError('BD must be exactly 6 digits (numbers only, e.g. 474455).');
      return;
    }
    if (!rank) {
      setError('Please select a Rank.');
      return;
    }
    if (!cleanName) {
      setError('Please enter Name.');
      return;
    }
    if (!cleanTrade) {
      setError('Please select or enter a Trade.');
      return;
    }
    if (!cleanFlight) {
      setError('Please select or enter a Flight.');
      return;
    }

    onVerify({
      bdNo: cleanBd,
      rank,
      name: cleanName,
      trade: cleanTrade,
      flight: cleanFlight,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0b1424] border border-slate-700 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0e192d]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Operator Authentication</h3>
              <p className="text-[10px] text-slate-400">
                Fill up your service details to update Night Count State
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="relative pt-1">
              <label
                htmlFor="op-auth-bd"
                className={getModalFloatLabelClass('bdNo', bdNo)}
              >
                BD *
              </label>
              <input
                id="op-auth-bd"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                autoFocus
                value={bdNo}
                onFocus={() => setFocusedField('bdNo')}
                onBlur={() => setFocusedField((prev) => (prev === 'bdNo' ? null : prev))}
                onChange={(e) => handleBdChange(e.target.value)}
                className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-11 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors border tabular-nums ${
                  focusedField === 'bdNo' ? 'border-emerald-500' : 'border-slate-700/80'
                }`}
              />
              <span className="absolute right-3 top-[calc(50%+2px)] -translate-y-1/2 text-[10px] text-slate-400 tabular-nums pointer-events-none">
                {bdNo.length}/6
              </span>
            </div>

            <div className="relative pt-1">
              <label
                htmlFor="op-auth-rank"
                className={getModalFloatLabelClass('rank', rank)}
              >
                Rank *
              </label>
              <select
                id="op-auth-rank"
                required
                value={rank}
                onFocus={() => setFocusedField('rank')}
                onBlur={() => setFocusedField((prev) => (prev === 'rank' ? null : prev))}
                onChange={(e) => {
                  setRank(e.target.value);
                  setError(null);
                }}
                className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-7 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors cursor-pointer border ${
                  focusedField === 'rank' ? 'border-emerald-500' : 'border-slate-700/80'
                }`}
              >
                <option value="" disabled hidden></option>
                {BAF_ALL_RANKS.map((r) => (
                  <option key={r} value={r} className="bg-[#0b1424] text-slate-200">
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative pt-1">
            <label
              htmlFor="op-auth-name"
              className={getModalFloatLabelClass('name', name)}
            >
              Name *
            </label>
            <input
              id="op-auth-name"
              type="text"
              required
              value={name}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField((prev) => (prev === 'name' ? null : prev))}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              className={`w-full bg-[#08101e] rounded-xl px-3.5 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors border ${
                focusedField === 'name' ? 'border-emerald-500' : 'border-slate-700/80'
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="relative pt-1">
              <label
                htmlFor="op-auth-trade"
                className={getModalFloatLabelClass('trade', trade)}
              >
                Trade *
              </label>
              {isCustomTrade ? (
                <>
                  <input
                    id="op-auth-trade"
                    type="text"
                    required
                    value={trade}
                    onFocus={() => setFocusedField('trade')}
                    onBlur={() => setFocusedField((prev) => (prev === 'trade' ? null : prev))}
                    onChange={(e) => {
                      setTrade(e.target.value);
                      setError(null);
                    }}
                    className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-11 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors border ${
                      focusedField === 'trade' ? 'border-emerald-500' : 'border-slate-700/80'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomTrade(false);
                      setTrade('');
                      setFocusedField(null);
                    }}
                    className="absolute right-2.5 top-[calc(50%+2px)] -translate-y-1/2 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    List
                  </button>
                </>
              ) : (
                <select
                  id="op-auth-trade"
                  required
                  value={trade}
                  onFocus={() => setFocusedField('trade')}
                  onBlur={() => setFocusedField((prev) => (prev === 'trade' ? null : prev))}
                  onChange={(e) => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsCustomTrade(true);
                      setTrade('');
                    } else {
                      setTrade(e.target.value);
                    }
                    setError(null);
                  }}
                  className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-7 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors cursor-pointer border ${
                    focusedField === 'trade' ? 'border-emerald-500' : 'border-slate-700/80'
                  }`}
                >
                  <option value="" disabled hidden></option>
                  {availableTrades.map((t) => (
                    <option key={t} value={t} className="bg-[#0b1424] text-slate-200">
                      {t}
                    </option>
                  ))}
                  <option
                    value="__CUSTOM__"
                    className="bg-[#0b1424] text-emerald-400 font-semibold"
                  >
                    + Custom Trade...
                  </option>
                </select>
              )}
            </div>

            <div className="relative pt-1">
              <label
                htmlFor="op-auth-flight"
                className={getModalFloatLabelClass('flight', flight)}
              >
                Flight *
              </label>
              {isCustomFlight ? (
                <>
                  <input
                    id="op-auth-flight"
                    type="text"
                    required
                    value={flight}
                    onFocus={() => setFocusedField('flight')}
                    onBlur={() => setFocusedField((prev) => (prev === 'flight' ? null : prev))}
                    onChange={(e) => {
                      setFlight(e.target.value);
                      setError(null);
                    }}
                    className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-11 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors border ${
                      focusedField === 'flight' ? 'border-emerald-500' : 'border-slate-700/80'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomFlight(false);
                      setFlight('');
                      setFocusedField(null);
                    }}
                    className="absolute right-2.5 top-[calc(50%+2px)] -translate-y-1/2 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                  >
                    List
                  </button>
                </>
              ) : (
                <select
                  id="op-auth-flight"
                  required
                  value={flight}
                  onFocus={() => setFocusedField('flight')}
                  onBlur={() => setFocusedField((prev) => (prev === 'flight' ? null : prev))}
                  onChange={(e) => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsCustomFlight(true);
                      setFlight('');
                    } else {
                      setFlight(e.target.value);
                    }
                    setError(null);
                  }}
                  className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-7 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors cursor-pointer border ${
                    focusedField === 'flight' ? 'border-emerald-500' : 'border-slate-700/80'
                  }`}
                >
                  <option value="" disabled hidden></option>
                  {availableFlights.map((f) => (
                    <option key={f} value={f} className="bg-[#0b1424] text-slate-200">
                      {f}
                    </option>
                  ))}
                  <option
                    value="__CUSTOM__"
                    className="bg-[#0b1424] text-emerald-400 font-semibold"
                  >
                    + Custom Flight...
                  </option>
                </select>
              )}
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded cursor-pointer shadow transition-all"
            >
              Verify & Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
