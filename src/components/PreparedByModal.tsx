import React, { useState } from 'react';
import { X, Check, UserCheck, Shield } from 'lucide-react';
import { PreparedByInfo } from '../types/nightCount';

interface PreparedByModalProps {
  isOpen: boolean;
  onClose: () => void;
  preparedBy: PreparedByInfo;
  onSave: (updated: PreparedByInfo) => void;
}

export const PreparedByModal: React.FC<PreparedByModalProps> = ({
  isOpen,
  onClose,
  preparedBy,
  onSave,
}) => {
  const [formData, setFormData] = useState<PreparedByInfo>({ ...preparedBy });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0b1424] border border-slate-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0e1b30] border-b border-slate-700/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Prepared By Configuration</h3>
              <p className="text-[11px] text-slate-400">Official signature block for Night Count State</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Preparer Full Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. LAC Rasel"
              className="w-full bg-[#070e1b] border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Rank</label>
              <select
                value={formData.rank}
                onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                className="w-full bg-[#070e1b] border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="AC-1">AC-1</option>
                <option value="AC-2">AC-2</option>
                <option value="LAC">LAC</option>
                <option value="Cpl">Cpl</option>
                <option value="Sgt">Sgt</option>
                <option value="Flt Sgt">Flt Sgt</option>
                <option value="WO">WO</option>
                <option value="MWO">MWO</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Trade</label>
              <input
                type="text"
                value={formData.trade}
                onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
                placeholder="e.g. Admin Asst, GD, Tech"
                className="w-full bg-[#070e1b] border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">BD Number</label>
              <input
                type="text"
                value={formData.bdNo}
                onChange={(e) => setFormData({ ...formData, bdNo: e.target.value })}
                placeholder="e.g. BD/119438"
                className="w-full bg-[#070e1b] border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Appointment / Duty</label>
              <input
                type="text"
                value={formData.appointment}
                onChange={(e) => setFormData({ ...formData, appointment: e.target.value })}
                placeholder="e.g. Duty NCO / Orderly Sgt"
                className="w-full bg-[#070e1b] border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Preview box */}
          <div className="mt-2 p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
            <span className="text-slate-300 font-semibold block mb-1">Signature Preview:</span>
            <div className="font-mono text-emerald-400">
              Prepared By: {formData.rank} {formData.name} ({formData.trade})
            </div>
            <div className="text-slate-500 text-[10px]">
              {formData.appointment} • {formData.bdNo}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold cursor-pointer transition-all shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>Save Details</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
