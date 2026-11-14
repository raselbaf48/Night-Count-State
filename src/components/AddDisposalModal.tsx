import React, { useState, useEffect } from 'react';
import { X, Plus, ShieldAlert, User } from 'lucide-react';
import { Airman, DisposalRecord, Rank } from '../types/nightCount';
import { DISPOSAL_CATEGORIES } from '../data/initialData';

interface AddDisposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  airmen: Airman[];
  selectedAirman?: Airman | null;
  onAddDisposal: (disposal: DisposalRecord) => void;
  dateStr: string;
}

export const AddDisposalModal: React.FC<AddDisposalModalProps> = ({
  isOpen,
  onClose,
  airmen,
  selectedAirman,
  onAddDisposal,
  dateStr,
}) => {
  const [selectedAirmanId, setSelectedAirmanId] = useState<string>('');
  const [customRank, setCustomRank] = useState<Rank>('LAC');
  const [customName, setCustomName] = useState<string>('');
  const [category, setCategory] = useState<string>('officeDuty');
  const [detail, setDetail] = useState<string>('Office Duty');
  const [period, setPeriod] = useState<string>('Night');
  const [remarks, setRemarks] = useState<string>('');

  useEffect(() => {
    if (selectedAirman) {
      setSelectedAirmanId(selectedAirman.id);
      setCustomRank(selectedAirman.rank);
      setCustomName(selectedAirman.name);
    } else if (airmen.length > 0 && !selectedAirmanId) {
      setSelectedAirmanId(airmen[0].id);
    }
  }, [selectedAirman, airmen]);

  if (!isOpen) return null;

  const handleCategoryChange = (catId: string) => {
    setCategory(catId);
    const cat = DISPOSAL_CATEGORIES.find((c) => c.id === catId);
    if (cat) {
      setDetail(cat.label.split('(')[0].trim());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let rank: Rank = customRank;
    let name: string = customName.trim();
    let airmanId: string | undefined = undefined;

    if (selectedAirmanId && selectedAirmanId !== 'new') {
      const found = airmen.find((a) => a.id === selectedAirmanId);
      if (found) {
        rank = found.rank;
        name = found.name;
        airmanId = found.id;
      }
    }

    if (!name) return;

    const catObj = DISPOSAL_CATEGORIES.find((c) => c.id === category);

    const newRecord: DisposalRecord = {
      id: `disp-${Date.now()}`,
      airmanId,
      rank,
      name,
      unit: '155 UASU BAF',
      category,
      displayCategory: catObj ? catObj.label : 'Office Duty',
      detail: detail.trim() || 'Duty',
      date: dateStr,
      period,
      remarks: remarks.trim(),
    };

    onAddDisposal(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0b1424] border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0e1b30] border-b border-slate-700/80">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Add Disposal / Duty Assignment</h3>
              <p className="text-[11px] text-slate-400">Record out-parade duty, leave, or detachment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Airman Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Select Airman (155 UASU BAF)
            </label>
            <select
              value={selectedAirmanId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedAirmanId(val);
                if (val !== 'new') {
                  const a = airmen.find((x) => x.id === val);
                  if (a) {
                    setCustomRank(a.rank);
                    setCustomName(a.name);
                  }
                }
              }}
              className="w-full bg-[#070e1b] border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
            >
              {airmen.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.rank} {a.name} ({a.trade || 'BAF'} - {a.bdNo || 'Active'})
                </option>
              ))}
              <option value="new">+ Enter New / Other Airman</option>
            </select>
          </div>

          {/* If new airman entered */}
          {selectedAirmanId === 'new' && (
            <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800">
              <div>
                <label className="block text-slate-400 mb-1">Rank</label>
                <select
                  value={customRank}
                  onChange={(e) => setCustomRank(e.target.value as Rank)}
                  className="w-full bg-[#070e1b] border border-slate-700 rounded px-2 py-1.5 text-slate-100"
                >
                  <option value="Cpl">Cpl</option>
                  <option value="LAC">LAC</option>
                  <option value="AC-1">AC-1</option>
                  <option value="AC-2">AC-2</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mahfuz"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-[#070e1b] border border-slate-700 rounded px-2 py-1.5 text-slate-100 placeholder:text-slate-600"
                />
              </div>
            </div>
          )}

          {/* Disposal Category */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Disposal / Duty Category
            </label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full bg-[#070e1b] border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 font-medium"
            >
              {DISPOSAL_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Duty Detail / Specific Location */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Duty / Disposal Detail Description
            </label>
            <input
              type="text"
              required
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="e.g. Office Duty, CUST_1794394, Sick Leave, Guard 1"
              className="w-full bg-[#070e1b] border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Appears in the &apos;Duty On&apos; nominal roll (e.g. LAC Rasel - Office Duty)
            </p>
          </div>

          {/* Period & Remarks */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Duty Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full bg-[#070e1b] border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100"
              >
                <option value="Night">Night (1800 - 0600)</option>
                <option value="Day">Day Duty</option>
                <option value="24 Hours">24 Hours</option>
                <option value="Temporary">Temporary Detached</option>
                <option value="Standing">Standing Order</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Remarks (Optional)</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Auth, Ref, Bed No, etc."
                className="w-full bg-[#070e1b] border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 placeholder:text-slate-600"
              />
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#e11d48] hover:bg-[#be123c] text-white font-semibold cursor-pointer shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Record Disposal</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
