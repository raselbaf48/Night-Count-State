import React, { useEffect, useState } from 'react';
import { X, UserCheck } from 'lucide-react';
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

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...preparedBy,
        name: (preparedBy.name || '').toUpperCase(),
        rank: (preparedBy.rank || '').toUpperCase(),
        appointment: (preparedBy.appointment || '').toUpperCase(),
      });
    }
  }, [isOpen, preparedBy]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      name: formData.name.trim().toUpperCase(),
      rank: formData.rank.trim().toUpperCase(),
      appointment: formData.appointment.trim().toUpperCase(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0b1424] border border-[#1b2a44] w-full max-w-[360px] rounded-xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#0e1b30] border-b border-slate-700/80">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700/70 text-emerald-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-slate-100">
              Prepared By Signature
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form matching Pic 1 layout in App's dark navy & emerald color scheme */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-200 font-bold mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
              placeholder="RIZWAN ISLAM"
              className="w-full bg-[#070e1b] border border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-medium text-xs sm:text-sm uppercase"
            />
          </div>

          <div>
            <label className="block text-slate-200 font-bold mb-1.5">
              Rank
            </label>
            <input
              type="text"
              value={formData.rank}
              onChange={(e) => setFormData({ ...formData, rank: e.target.value.toUpperCase() })}
              placeholder="MWO/SWO/WO"
              className="w-full bg-[#070e1b] border border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-medium text-xs sm:text-sm uppercase"
            />
          </div>

          <div>
            <label className="block text-slate-200 font-bold mb-1.5">
              Designation
            </label>
            <input
              type="text"
              value={formData.appointment}
              onChange={(e) => setFormData({ ...formData, appointment: e.target.value.toUpperCase() })}
              placeholder="JCOIC FLG WG"
              className="w-full bg-[#070e1b] border border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-medium text-xs sm:text-sm uppercase"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs sm:text-sm cursor-pointer transition-all shadow-md"
            >
              Save Signature
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
