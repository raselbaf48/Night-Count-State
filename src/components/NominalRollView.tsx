import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Users, ChevronUp, ChevronDown, Plus, Search, Edit3, Trash2, Check, X, AlertCircle } from 'lucide-react';
import { Airman, DayState, Rank } from '../types/nightCount';
import { DISPOSAL_OPTIONS, BAF_TRADES, BAF_FLIGHTS } from '../data/initialData';
import { loadSavedCustomDisposals, getUnitAirmen } from '../utils/storage';

interface NominalRollViewProps {
  unitName?: string;
  dayState: DayState;
  onUpdateAirmanDisposal: (airmanId: string, disposalVal: string) => void;
  onUpdateAirmanFull: (updatedAirman: Airman, disposalVal: string) => void;
  onAddAirman: (airman: Omit<Airman, 'id'>) => void;
  onDeleteAirman: (airmanId: string) => void;
  onDeleteCustomDisposal: (customName: string) => void;
}

interface DisposalDropdownProps {
  value: string;
  hasDisposal: boolean;
  savedCustomDisposals: string[];
  onSelect: (val: string) => void;
  onOpenCustomModal: () => void;
  onDeleteCustomDisposal: (customName: string) => void;
}

const DisposalDropdown: React.FC<DisposalDropdownProps> = ({
  value,
  hasDisposal,
  savedCustomDisposals,
  onSelect,
  onOpenCustomModal,
  onDeleteCustomDisposal,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dispSearch, setDispSearch] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; openUp: boolean }>({
    top: 0,
    left: 0,
    width: 224,
    openUp: false,
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = 320;
    const openUp = spaceBelow < menuHeight && rect.top > spaceBelow;
    setCoords({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left: Math.min(rect.left, window.innerWidth - Math.max(rect.width, 224) - 8),
      width: Math.max(rect.width, 224),
      openUp,
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const timer = setTimeout(() => searchInputRef.current?.focus(), 10);

    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    const handleScrollOrResize = () => updatePosition();

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  const query = dispSearch.trim().toLowerCase();
  const filteredStandard = useMemo(
    () =>
      DISPOSAL_OPTIONS.filter((opt) =>
        !query ? true : opt.label.toLowerCase().includes(query)
      ),
    [query]
  );

  const filteredCustom = useMemo(
    () =>
      savedCustomDisposals.filter((name) =>
        !query ? true : name.toLowerCase().includes(query)
      ),
    [savedCustomDisposals, query]
  );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!isOpen) {
            setDispSearch('');
            updatePosition();
          }
          setIsOpen((prev) => !prev);
        }}
        className={`w-full flex items-center justify-between gap-2 py-1 px-2.5 rounded-lg text-xs cursor-pointer transition-all focus:outline-none ${
          hasDisposal
            ? 'bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/30 hover:bg-amber-500/20'
            : 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
        }`}
      >
        <span className="truncate text-left">{value}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 opacity-70 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: coords.openUp ? undefined : `${coords.top}px`,
              bottom: coords.openUp ? `${window.innerHeight - coords.top}px` : undefined,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 9999,
            }}
            className="bg-[#0b1424] border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Search Bar */}
            <div className="p-2 border-b border-slate-800 bg-[#0e192d]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={dispSearch}
                  onChange={(e) => setDispSearch(e.target.value)}
                  placeholder="Search disposal..."
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-6 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                />
                {dispSearch && (
                  <button
                    type="button"
                    onClick={() => setDispSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Options List */}
            <div className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-800/30">
              {filteredStandard.length === 0 && filteredCustom.length === 0 ? (
                <div className="px-3 py-3 text-center text-slate-500 italic">
                  No disposal found
                </div>
              ) : (
                <>
                  {filteredStandard.map((opt) => {
                    const isSelected = value === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onSelect(opt.value);
                          setIsOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600/20 text-blue-300 font-semibold'
                            : 'text-slate-200 hover:bg-slate-800/70'
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-blue-400" />}
                      </button>
                    );
                  })}

                  {filteredCustom.map((customName) => {
                    const isSelected = value === customName;
                    return (
                      <div
                        key={`custom-${customName}`}
                        onClick={() => {
                          onSelect(customName);
                          setIsOpen(false);
                        }}
                        className={`w-full px-3 py-1.5 flex items-center justify-between gap-2 transition-colors cursor-pointer group ${
                          isSelected
                            ? 'bg-amber-500/15 text-amber-300 font-semibold'
                            : 'text-amber-300/90 hover:bg-slate-800/70'
                        }`}
                      >
                        <span className="truncate flex-1 text-left">{customName}</span>
                        <div className="flex items-center shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteCustomDisposal(customName);
                            }}
                            title={`Remove "${customName}"`}
                            className="p-0.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Bottom Custom Action */}
            <div className="border-t border-slate-800 bg-[#0e192d]/80 p-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenCustomModal();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-emerald-400 hover:bg-emerald-500/10 font-semibold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Custom</span>
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export const NominalRollView: React.FC<NominalRollViewProps> = ({
  unitName = '155 UASU BAF',
  dayState,
  onUpdateAirmanDisposal,
  onUpdateAirmanFull,
  onAddAirman,
  onDeleteAirman,
  onDeleteCustomDisposal,
}) => {
  const [selectedFlight, setSelectedFlight] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Edit Airman Modal state
  const [editingAirman, setEditingAirman] = useState<Airman | null>(null);
  const [editBdNo, setEditBdNo] = useState('');
  const [editRank, setEditRank] = useState<Rank>('LAC');
  const [editName, setEditName] = useState('');
  const [editTrade, setEditTrade] = useState('');
  const [editFlight, setEditFlight] = useState('GCS');

  // New airman form state - DEFAULT A KONO OPTION FILLUP THAKBE NA
  const [newName, setNewName] = useState('');
  const [newRank, setNewRank] = useState<string>('');
  const [newTrade, setNewTrade] = useState<string>('');
  const [newFlight, setNewFlight] = useState<string>('');
  const [newBdNo, setNewBdNo] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  // Custom disposal modal state
  const [customModalAirman, setCustomModalAirman] = useState<Airman | null>(null);
  const [customDisposalInput, setCustomDisposalInput] = useState('');

  const airmen = getUnitAirmen(dayState, unitName);
  const disposals = dayState.disposals.filter((d) => d.unit === unitName);

  // Map each airman to their active disposal value
  const airmanDisposalMap = useMemo(() => {
    const map = new Map<string, string>();
    disposals.forEach((d) => {
      if (d.airmanId) {
        map.set(d.airmanId, d.detail || d.displayCategory);
      }
    });
    return map;
  }, [disposals]);

  // Saved custom disposal names (persist until user clicks Cross button)
  const activeCustomDisposals = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    const saved = dayState.savedCustomDisposals ?? loadSavedCustomDisposals();
    saved.forEach((name) => {
      const val = name.trim();
      if (val && !seen.has(val.toLowerCase())) {
        seen.add(val.toLowerCase());
        list.push(val);
      }
    });
    disposals.forEach((d) => {
      if (d.category === 'custom') {
        const val = (d.detail || d.displayCategory || '').trim();
        if (val && !seen.has(val.toLowerCase())) {
          seen.add(val.toLowerCase());
          list.push(val);
        }
      }
    });
    return list;
  }, [dayState.savedCustomDisposals, disposals]);

  // Flights filter options
  const flightOptions = ['All', 'Mechanics', 'Avionics', 'GCS', 'Admin'];

  // Filter airmen based only on Flight and Search (Rank filter removed as requested)
  const filteredAirmen = useMemo(() => {
    return airmen.filter((airman) => {
      // Flight filter
      if (selectedFlight !== 'All') {
        if (airman.flight !== selectedFlight) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = airman.name.toLowerCase().includes(q);
        const matchesTrade = (airman.trade || '').toLowerCase().includes(q);
        const matchesRank = airman.rank.toLowerCase().includes(q);
        const matchesBd = (airman.bdNo || '').toLowerCase().includes(q);
        if (!matchesName && !matchesTrade && !matchesRank && !matchesBd) return false;
      }

      return true;
    });
  }, [airmen, selectedFlight, searchQuery]);

  // Open Add Airman modal with all fields completely blank
  const handleOpenAddModal = () => {
    setNewName('');
    setNewRank('');
    setNewTrade('');
    setNewFlight('');
    setNewBdNo('');
    setAddError(null);
    setShowAddModal(true);
  };

  // Handle clicking a row to edit
  const handleRowClick = (airman: Airman) => {
    setEditingAirman(airman);
    setEditBdNo(airman.bdNo || '');
    setEditRank(airman.rank);
    setEditName(airman.name);
    setEditTrade(airman.trade || '');
    setEditFlight(airman.flight || 'Admin');
  };

  // Save edited airman
  const handleSaveEditAirman = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAirman || !editName.trim()) return;

    // Preserve the current disposal chosen from outside
    const currDisp = airmanDisposalMap.get(editingAirman.id) || (editingAirman.currentDuty || '-');

    const updated: Airman = {
      ...editingAirman,
      bdNo: editBdNo.trim(),
      rank: editRank,
      name: editName.trim(), // short name
      trade: editTrade.trim(),
      flight: editFlight,
    };

    onUpdateAirmanFull(updated, currDisp);
    setEditingAirman(null);
  };

  // Submit new airman - ALL OPTIONS MUST BE FILLED & BD NO MUST BE EXACTLY 6 DIGITS
  const handleAddNewAirmanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const cleanBd = newBdNo.trim();
    const cleanName = newName.trim();

    if (!cleanBd) {
      setAddError('BD Number is required and must be 6 digits.');
      return;
    }
    if (!/^\d{6}$/.test(cleanBd)) {
      setAddError('BD Number must be exactly 6 digits (numbers only, e.g. 474455).');
      return;
    }
    if (!newRank) {
      setAddError('Please select a Rank.');
      return;
    }
    if (!cleanName) {
      setAddError('Please enter a Short Name.');
      return;
    }
    if (!newTrade) {
      setAddError('Please select a Trade.');
      return;
    }
    if (!newFlight) {
      setAddError('Please select a Flight.');
      return;
    }

    onAddAirman({
      name: cleanName,
      rank: newRank as Rank,
      trade: newTrade,
      flight: newFlight,
      bdNo: cleanBd,
      unit: unitName,
      status: 'on_parade',
    });

    setNewName('');
    setNewRank('');
    setNewTrade('');
    setNewFlight('');
    setNewBdNo('');
    setShowAddModal(false);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 pb-12">
      {/* Nominal Roll Modern Surface */}
      <div className="bg-[#0b1424] border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/60 bg-[#0e192d]/50">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-slate-100 tracking-wide">
                Nominal Roll — {unitName}
              </h2>
              <p className="text-[11px] text-slate-400">Personnel registry & duty disposition</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium px-2.5 py-1 rounded-full bg-slate-800/50">
              {filteredAirmen.length} of {airmen.length} Airmen
            </span>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer shadow-sm hover:shadow"
              title="Add New Airman to Nominal Roll"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Airman</span>
            </button>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <div>
            {/* Modern Seamless Controls Bar (No nested box) */}
            <div className="px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800/50 bg-[#070e1b]/40">
              {/* Flight Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                <span className="text-xs text-slate-400 font-semibold mr-1 shrink-0">Flight:</span>
                <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800/60">
                  {flightOptions.map((flt) => (
                    <button
                      key={flt}
                      onClick={() => setSelectedFlight(flt)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        selectedFlight === flt
                          ? 'bg-blue-600 text-white shadow font-semibold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      {flt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minimal Modern Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, trade, BD..."
                  className="w-full bg-slate-900/50 border border-slate-800/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/80 transition-colors"
                />
              </div>
            </div>

            {/* Modern Table (No vertical box borders) */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-slate-900/30 text-slate-400 text-[11px] font-semibold tracking-wider">
                    <th className="py-3 px-4 w-14 text-center">
                      Ser
                    </th>
                    <th className="py-3 px-4 w-28">
                      BD No
                    </th>
                    <th className="py-3 px-4 w-20">
                      Rank
                    </th>
                    <th className="py-3 px-4">
                      Name
                    </th>
                    <th className="py-3 px-4">
                      Trade
                    </th>
                    <th className="py-3 px-4">
                      Flight
                    </th>
                    <th className="py-3 px-4 w-56 text-right sm:text-left">
                      Disposal / Duty
                    </th>
                  </tr>
                </thead>
                <tbody className="text-slate-200 divide-y divide-slate-800/40">
                  {filteredAirmen.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 italic">
                        No airmen match the selected filters
                      </td>
                    </tr>
                  ) : (
                    filteredAirmen.map((airman, index) => {
                      const currentDispVal = airmanDisposalMap.get(airman.id) || (airman.currentDuty || '-');
                      const hasDisposal = currentDispVal !== '-';

                      return (
                        <tr
                          key={airman.id}
                          onClick={() => handleRowClick(airman)}
                          className="hover:bg-slate-800/35 transition-colors cursor-pointer group"
                          title="Click row to edit personnel details"
                        >
                          {/* Ser No */}
                          <td className="py-3 px-4 text-center text-slate-500 text-xs">
                            {index + 1}
                          </td>

                          {/* BD No */}
                          <td className="py-3 px-4 text-emerald-400 font-semibold text-xs tracking-wide">
                            {airman.bdNo || '—'}
                          </td>

                          {/* Rank */}
                          <td className="py-3 px-4 font-bold text-slate-200 text-xs">
                            {airman.rank}
                          </td>

                          {/* Name (Short Name) */}
                          <td className="py-3 px-4 font-semibold text-white text-xs">
                            <div className="flex items-center justify-between gap-1.5 pr-2">
                              <span>{airman.name}</span>
                              <Edit3 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </td>

                          {/* Trade */}
                          <td className="py-3 px-4 text-slate-400 text-xs">
                            {airman.trade || 'GD'}
                          </td>

                          {/* Flight */}
                          <td className="py-3 px-4 text-slate-400 text-xs">
                            {airman.flight || 'Admin'}
                          </td>

                          {/* Disposal Dropdown (Searchable + Persistent Custom Disposals with Cross button) */}
                          <td
                            className="py-2.5 px-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DisposalDropdown
                              value={currentDispVal}
                              hasDisposal={hasDisposal}
                              savedCustomDisposals={activeCustomDisposals}
                              onSelect={(val) => onUpdateAirmanDisposal(airman.id, val)}
                              onOpenCustomModal={() => {
                                setCustomModalAirman(airman);
                                setCustomDisposalInput('');
                              }}
                              onDeleteCustomDisposal={onDeleteCustomDisposal}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Airman Modal (Opened by clicking any row) */}
      {editingAirman && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0b1424] border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl p-5 text-slate-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm text-slate-100">
                  Edit Airman: {editingAirman.rank} {editingAirman.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingAirman(null)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAirman} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">BD Number *</label>
                    <span className="text-[10px] text-slate-500 font-sans">{editBdNo.length}/6</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={editBdNo}
                    onChange={(e) => setEditBdNo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="e.g. 474455"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500 font-sans"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Must be 6 digits</p>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Rank *</label>
                  <select
                    value={editRank}
                    onChange={(e) => setEditRank(e.target.value as Rank)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Cpl">Cpl</option>
                    <option value="LAC">LAC</option>
                    <option value="AC">AC</option>
                    <option value="AC-1">AC-1</option>
                    <option value="AC-2">AC-2</option>
                    <option value="Sgt">Sgt</option>
                    <option value="Flt Sgt">Flt Sgt</option>
                    <option value="WO">WO</option>
                    <option value="MWO">MWO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">
                  Name (Short Name only, e.g. Rasel, Akash, Omar) *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Rasel"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Trade *</label>
                  <select
                    required
                    value={editTrade}
                    onChange={(e) => setEditTrade(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {!BAF_TRADES.includes(editTrade) && editTrade && (
                      <option value={editTrade}>{editTrade}</option>
                    )}
                    {BAF_TRADES.map((t) => (
                      <option key={t} value={t} className="bg-[#0b1424] text-slate-200">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Flight *</label>
                  <select
                    value={editFlight}
                    onChange={(e) => setEditFlight(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {BAF_FLIGHTS.map((f) => (
                      <option key={f} value={f} className="bg-[#0b1424] text-slate-200">
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteAirman(editingAirman.id);
                    setEditingAirman(null);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-900/80 rounded border border-rose-800/80 transition-colors cursor-pointer font-medium"
                  title="Delete this airman permanently"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Airman</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAirman(null)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded cursor-pointer shadow transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Airman Modal (Default a kono option fillup thakbe na, All options must be filled, BD No must be 6 digits) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0b1424] border border-slate-700 w-full max-w-md rounded-xl shadow-2xl p-5 text-slate-200">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-100">Add Airman to Nominal Roll</h3>
                <p className="text-[11px] text-slate-400">
                  All fields must be filled. BD Number must be exactly 6 digits.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {addError && (
              <div className="mb-3 p-2.5 rounded bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddNewAirmanSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                {/* BD Number (Must be exactly 6 digits) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-semibold">
                      BD Number <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-sans">
                      {newBdNo.length}/6
                    </span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    placeholder="e.g. 474455"
                    value={newBdNo}
                    onChange={(e) => {
                      setNewBdNo(e.target.value.replace(/\D/g, '').slice(0, 6));
                      setAddError(null);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-sans"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Must be 6 digits</p>
                </div>

                {/* Rank Dropdown (Cpl, LAC, AC) */}
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">
                    Rank <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={newRank}
                    onChange={(e) => {
                      setNewRank(e.target.value);
                      setAddError(null);
                    }}
                    className={`w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer ${
                      !newRank ? 'text-slate-500' : 'text-slate-100 font-semibold'
                    }`}
                  >
                    <option value="" disabled>
                      Select Rank *
                    </option>
                    <option value="Cpl" className="bg-[#0b1424] text-slate-200">Cpl</option>
                    <option value="LAC" className="bg-[#0b1424] text-slate-200">LAC</option>
                    <option value="AC" className="bg-[#0b1424] text-slate-200">AC</option>
                    <option value="AC-1" className="bg-[#0b1424] text-slate-200">AC-1</option>
                    <option value="AC-2" className="bg-[#0b1424] text-slate-200">AC-2</option>
                    <option value="Sgt" className="bg-[#0b1424] text-slate-200">Sgt</option>
                  </select>
                </div>
              </div>

              {/* Name (Short Name only) */}
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">
                  Name (Short Name only, e.g. Shakil) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shakil"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setAddError(null);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Trade Dropdown matching Pic 3 */}
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">
                    Trade <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={newTrade}
                    onChange={(e) => {
                      setNewTrade(e.target.value);
                      setAddError(null);
                    }}
                    className={`w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer ${
                      !newTrade ? 'text-slate-500' : 'text-slate-100 font-semibold'
                    }`}
                  >
                    <option value="" disabled>
                      Select Trade *
                    </option>
                    {BAF_TRADES.map((t) => (
                      <option key={t} value={t} className="bg-[#0b1424] text-slate-200">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Flight Dropdown */}
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">
                    Flight <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={newFlight}
                    onChange={(e) => {
                      setNewFlight(e.target.value);
                      setAddError(null);
                    }}
                    className={`w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer ${
                      !newFlight ? 'text-slate-500' : 'text-slate-100 font-semibold'
                    }`}
                  >
                    <option value="" disabled>
                      Select Flight *
                    </option>
                    {BAF_FLIGHTS.map((f) => (
                      <option key={f} value={f} className="bg-[#0b1424] text-slate-200">
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded cursor-pointer shadow transition-all"
                >
                  Add Airman
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Disposal Modal (Triggered when selecting Custom at bottom of Disposal dropdown) */}
      {customModalAirman && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0b1424] border border-slate-700 w-full max-w-sm rounded-xl shadow-2xl p-5 text-slate-200">
            <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-100">Custom Disposal</h3>
                <p className="text-[11px] text-slate-400">
                  {customModalAirman.rank} {customModalAirman.name}
                </p>
              </div>
              <button
                onClick={() => setCustomModalAirman(null)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = customDisposalInput.trim();
                if (!trimmed || !customModalAirman) return;
                onUpdateAirmanDisposal(customModalAirman.id, trimmed);
                setCustomModalAirman(null);
                setCustomDisposalInput('');
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">
                  Disposal / Duty Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={customDisposalInput}
                  onChange={(e) => setCustomDisposalInput(e.target.value)}
                  placeholder="e.g. Escort Duty, Mess Duty"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  This will add a new column before Total Out Parade.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCustomModalAirman(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded cursor-pointer shadow transition-all"
                >
                  Add Disposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
