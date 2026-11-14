import React, { useState } from 'react';
import { X, Plus, Trash2, UserPlus, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Airman, Rank } from '../types/nightCount';

interface RosterManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  airmen: Airman[];
  onAddAirman: (airman: Omit<Airman, 'id'>) => void;
  onDeleteAirman: (id: string) => void;
  onToggleStatus: (id: string) => void;
}

export const RosterManagerModal: React.FC<RosterManagerModalProps> = ({
  isOpen,
  onClose,
  airmen,
  onAddAirman,
  onDeleteAirman,
  onToggleStatus,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [rank, setRank] = useState<Rank>('LAC');
  const [bdNo, setBdNo] = useState('');
  const [trade, setTrade] = useState('GD');

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddAirman({
      name: name.trim(),
      rank,
      bdNo: bdNo.trim() || `BD/${Math.floor(100000 + Math.random() * 900000)}`,
      trade: trade.trim() || 'GD',
      unit: '155 UASU BAF',
      status: 'on_parade',
    });

    setName('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0b1424] border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0e1b30] border-b border-slate-700/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">
                155 UASU BAF Personnel Roster ({airmen.length})
              </h3>
              <p className="text-[11px] text-slate-400">
                Manage unit airmen, service numbers, and default muster state
              </p>
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
        <div className="p-5 text-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">
              Nominal roll of airmen posted to 155 UASU BAF:
            </span>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cancel New' : 'Add Airman'}</span>
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <form onSubmit={handleAdd} className="p-3.5 rounded-lg bg-[#070e1b] border border-slate-700 space-y-3">
              <div className="font-semibold text-slate-200">New Personnel Details</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-slate-400 block mb-1">Rank</label>
                  <select
                    value={rank}
                    onChange={(e) => setRank(e.target.value as Rank)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                  >
                    <option value="Cpl">Cpl</option>
                    <option value="LAC">LAC</option>
                    <option value="AC-1">AC-1</option>
                    <option value="AC-2">AC-2</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shakil"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Trade</label>
                  <input
                    type="text"
                    placeholder="e.g. Admin, GD"
                    value={trade}
                    onChange={(e) => setTrade(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">BD Number</label>
                  <input
                    type="text"
                    placeholder="BD/119999"
                    value={bdNo}
                    onChange={(e) => setBdNo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded cursor-pointer"
                >
                  Save Airman
                </button>
              </div>
            </form>
          )}

          {/* Roster list */}
          <div className="max-h-80 overflow-y-auto space-y-1 pr-1 font-mono">
            {airmen.map((a, idx) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-2 rounded bg-[#070e1b] border border-slate-800/80 hover:border-slate-700"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-slate-500 w-5 text-right font-medium">{idx + 1}.</span>
                  <span className="text-emerald-400 font-semibold">{a.rank}</span>
                  <span className="text-slate-100 font-medium">{a.name}</span>
                  <span className="text-slate-500 text-[10px] hidden sm:inline">({a.trade || 'GD'})</span>
                  <span className="text-slate-400 text-[10px] hidden md:inline">[{a.bdNo || 'N/A'}]</span>
                </div>

                <div className="flex items-center gap-2 font-sans">
                  <button
                    onClick={() => onToggleStatus(a.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                      a.status === 'on_parade'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}
                  >
                    {a.status === 'on_parade' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>On Parade</span>
                      </>
                    ) : (
                      <>
                        <ShieldAlert className="w-3 h-3" />
                        <span>Out Parade ({a.currentDuty || 'Duty'})</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onDeleteAirman(a.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                    title="Remove from roster"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
