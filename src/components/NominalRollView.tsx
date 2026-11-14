import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  ChevronUp,
  ChevronDown,
  Plus,
  Search,
  Edit3,
  Trash2,
  Check,
  X,
  AlertCircle,
  FileSpreadsheet,
  Upload,
  Download,
} from 'lucide-react';
import { Airman, DayState, Rank } from '../types/nightCount';
import { DISPOSAL_OPTIONS, BAF_TRADES, BAF_FLIGHTS, BAF_RANKS_SELECT } from '../data/initialData';
import {
  loadSavedCustomDisposals,
  getUnitAirmen,
  getAllExistingBdUnitMap,
  findExistingBdConflict,
} from '../utils/storage';
import {
  ParsedExcelAirmanRow,
  buildAirmenFromParsedRows,
  downloadSampleAirmenExcel,
  parseAirmenExcelFile,
} from '../utils/excelImport';

interface NominalRollViewProps {
  unitName?: string;
  dayState: DayState;
  onUpdateAirmanDisposal: (airmanId: string, disposalVal: string) => void;
  onUpdateAirmanFull: (updatedAirman: Airman, disposalVal: string) => void;
  onAddAirman: (airman: Omit<Airman, 'id'>) => void;
  onAddAirmenBulk: (airmen: Omit<Airman, 'id'>[]) => void;
  onDeleteAirman: (airmanId: string) => void;
  onDeleteCustomDisposal: (customName: string) => void;
  onRequireAuth?: (onSuccess: () => void) => void;
  canEditDisposals?: boolean;
  canManageNominalRoll?: boolean;
  canDeleteAirman?: boolean;
}

interface DisposalDropdownProps {
  value: string;
  hasDisposal: boolean;
  savedCustomDisposals: string[];
  onSelect: (val: string) => void;
  onOpenCustomModal: () => void;
  onDeleteCustomDisposal: (customName: string) => void;
  onBeforeOpen?: (proceed: () => void) => void;
}

const DisposalDropdown: React.FC<DisposalDropdownProps> = ({
  value,
  hasDisposal,
  savedCustomDisposals,
  onSelect,
  onOpenCustomModal,
  onDeleteCustomDisposal,
  onBeforeOpen,
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
          if (isOpen) {
            setIsOpen(false);
            return;
          }
          const openMenu = () => {
            setDispSearch('');
            updatePosition();
            setIsOpen(true);
          };
          if (onBeforeOpen) {
            onBeforeOpen(openMenu);
          } else {
            openMenu();
          }
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
  onAddAirmenBulk,
  onDeleteAirman,
  onDeleteCustomDisposal,
  onRequireAuth,
  canEditDisposals = true,
  canManageNominalRoll = true,
  canDeleteAirman = true,
}) => {
  const [selectedFlight, setSelectedFlight] = useState<string>('All');
  const [selectedTrade, setSelectedTrade] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');

  // Edit Airman Modal state
  const [editingAirman, setEditingAirman] = useState<Airman | null>(null);
  const [editBdNo, setEditBdNo] = useState('');
  const [editRank, setEditRank] = useState<Rank>('LAC');
  const [editName, setEditName] = useState('');
  const [editTrade, setEditTrade] = useState('');
  const [editFlight, setEditFlight] = useState('GCS');
  const [isCustomEditTrade, setIsCustomEditTrade] = useState(false);
  const [isCustomEditFlight, setIsCustomEditFlight] = useState(false);
  const [focusedEditField, setFocusedEditField] = useState<
    'bdNo' | 'rank' | 'name' | 'trade' | 'flight' | null
  >(null);
  const [editError, setEditError] = useState<string | null>(null);

  // New airman form state - DEFAULT A KONO OPTION FILLUP THAKBE NA
  const [newName, setNewName] = useState('');
  const [newRank, setNewRank] = useState<string>('');
  const [newTrade, setNewTrade] = useState<string>('');
  const [newFlight, setNewFlight] = useState<string>('');
  const [newBdNo, setNewBdNo] = useState('');
  const [isCustomNewTrade, setIsCustomNewTrade] = useState(false);
  const [isCustomNewFlight, setIsCustomNewFlight] = useState(false);
  const [focusedAddField, setFocusedAddField] = useState<
    'bdNo' | 'rank' | 'name' | 'trade' | 'flight' | null
  >(null);
  const [addError, setAddError] = useState<string | null>(null);

  const getModalFloatLabelClass = (isFieldFocused: boolean, value: string) => {
    const isFloating = isFieldFocused || value.length > 0;
    return `absolute left-3.5 pointer-events-none transition-all duration-150 uppercase tracking-wider font-bold z-10 ${
      isFloating
        ? `top-1 -translate-y-1/2 px-1.5 bg-[#0b1424] text-[10px] ${
            isFieldFocused ? 'text-emerald-400' : 'text-slate-400'
          }`
        : 'top-[calc(50%+2px)] -translate-y-1/2 text-xs text-slate-400'
    }`;
  };

  // Bulk Excel import state
  const [bulkRows, setBulkRows] = useState<ParsedExcelAirmanRow[]>([]);
  const [bulkFileName, setBulkFileName] = useState<string>('');
  const [bulkError, setBulkError] = useState<string | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

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

  // Dynamic Trades & Flights (preset + any custom values present in the unit)
  const availableTrades = useMemo(() => {
    const set = new Set<string>(BAF_TRADES);
    airmen.forEach((a) => {
      if (a.trade?.trim()) set.add(a.trade.trim());
    });
    return Array.from(set);
  }, [airmen]);

  const availableFlights = useMemo(() => {
    const set = new Set<string>(BAF_FLIGHTS);
    airmen.forEach((a) => {
      if (a.flight?.trim()) set.add(a.flight.trim());
    });
    return Array.from(set);
  }, [airmen]);

  // Flights filter options: strictly ONLY flights present in this unit's Nominal Roll
  const nominalRollFlights = useMemo(() => {
    const present = new Set<string>();
    const customList: string[] = [];
    airmen.forEach((a) => {
      const f = a.flight?.trim();
      if (!f || present.has(f)) return;
      present.add(f);
      if (!BAF_FLIGHTS.includes(f)) {
        customList.push(f);
      }
    });
    const orderedPresets = BAF_FLIGHTS.filter((f) => present.has(f));
    return [...orderedPresets, ...customList];
  }, [airmen]);

  // Office has Flights only if at least one airman has a real Flight (not blank / N/A / -)
  const officeHasFlights = useMemo(() => {
    return nominalRollFlights.some((f) => {
      const norm = f.trim().toUpperCase();
      return norm !== '' && norm !== 'N/A' && norm !== '-';
    });
  }, [nominalRollFlights]);

  // Trades filter options for offices without Flights
  const nominalRollTrades = useMemo(() => {
    const present = new Set<string>();
    const customList: string[] = [];
    airmen.forEach((a) => {
      const t = a.trade?.trim();
      if (!t || present.has(t)) return;
      present.add(t);
      if (!BAF_TRADES.includes(t)) {
        customList.push(t);
      }
    });
    const orderedPresets = BAF_TRADES.filter((t) => present.has(t));
    return [...orderedPresets, ...customList];
  }, [airmen]);

  useEffect(() => {
    setSelectedFlight('All');
    setSelectedTrade('All');
  }, [unitName]);

  useEffect(() => {
    if (selectedFlight !== 'All' && !nominalRollFlights.includes(selectedFlight)) {
      setSelectedFlight('All');
    }
  }, [selectedFlight, nominalRollFlights]);

  useEffect(() => {
    if (selectedTrade !== 'All' && !nominalRollTrades.includes(selectedTrade)) {
      setSelectedTrade('All');
    }
  }, [selectedTrade, nominalRollTrades]);

  const flightOptions = useMemo(() => ['All', ...nominalRollFlights], [nominalRollFlights]);
  const tradeFilterOptions = useMemo(() => ['All', ...nominalRollTrades], [nominalRollTrades]);

  // Filter airmen by Flight (or Trade when office has no Flight) and Search
  const filteredAirmen = useMemo(() => {
    return airmen.filter((airman) => {
      if (officeHasFlights) {
        if (selectedFlight !== 'All' && airman.flight !== selectedFlight) {
          return false;
        }
      } else {
        if (selectedTrade !== 'All' && (airman.trade || '').trim() !== selectedTrade) {
          return false;
        }
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
  }, [airmen, officeHasFlights, selectedFlight, selectedTrade, searchQuery]);

  // Open Add Airman modal with all fields completely blank
  const handleOpenAddModal = () => {
    const openNow = () => {
      setAddMode('single');
      setNewName('');
      setNewRank('');
      setNewTrade('');
      setNewFlight('');
      setNewBdNo('');
      setIsCustomNewTrade(false);
      setIsCustomNewFlight(false);
      setFocusedAddField(null);
      setAddError(null);
      setBulkRows([]);
      setBulkFileName('');
      setBulkError(null);
      setShowAddModal(true);
    };
    if (onRequireAuth) {
      onRequireAuth(openNow);
    } else {
      openNow();
    }
  };

  // Handle Excel / CSV file selection for bulk upload
  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkError(null);
    setBulkFileName(file.name);
    try {
      const existingBdUnitMap = getAllExistingBdUnitMap(dayState);
      const parsed = await parseAirmenExcelFile(file, existingBdUnitMap);
      setBulkRows(parsed);
    } catch (err) {
      setBulkRows([]);
      setBulkError(err instanceof Error ? err.message : 'Failed to read Excel file.');
    } finally {
      if (excelInputRef.current) {
        excelInputRef.current.value = '';
      }
    }
  };

  const validBulkRows = useMemo(() => bulkRows.filter((r) => !r.error), [bulkRows]);

  const handleBulkImportSubmit = () => {
    if (validBulkRows.length === 0) return;
    const toAdd = buildAirmenFromParsedRows(validBulkRows, unitName);
    onAddAirmenBulk(toAdd);
    setBulkRows([]);
    setBulkFileName('');
    setBulkError(null);
    setShowAddModal(false);
  };

  // Handle clicking a row to edit
  const handleRowClick = (airman: Airman) => {
    if (!canManageNominalRoll) return;
    const openEditNow = () => {
      setEditingAirman(airman);
      setEditBdNo(airman.bdNo || '');
      setEditRank(airman.rank);
      setEditName(airman.name);
      setEditTrade(airman.trade || '');
      setEditFlight(airman.flight || 'N/A');
      setIsCustomEditTrade(false);
      setIsCustomEditFlight(false);
      setFocusedEditField(null);
      setEditError(null);
    };
    if (onRequireAuth) {
      onRequireAuth(openEditNow);
    } else {
      openEditNow();
    }
  };

  // Save edited airman
  const handleSaveEditAirman = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAirman) return;
    setEditError(null);

    const cleanBd = editBdNo.trim();
    const cleanName = editName.trim();
    const cleanTrade = editTrade.trim();
    const cleanFlight = editFlight.trim() || 'N/A';

    if (!/^\d{6}$/.test(cleanBd)) {
      setEditError('BD must be exactly 6 digits (numbers only, e.g. 474455).');
      return;
    }

    const bdConflict = findExistingBdConflict(dayState, cleanBd, editingAirman.id);
    if (bdConflict) {
      setEditError(
        `BD ${cleanBd} already exists in ${bdConflict.unit} (${bdConflict.airman.rank} ${bdConflict.airman.name}). Same BD cannot be in two offices.`
      );
      return;
    }

    if (!cleanName) {
      setEditError('Name is required.');
      return;
    }

    // Preserve the current disposal chosen from outside
    const currDisp = airmanDisposalMap.get(editingAirman.id) || (editingAirman.currentDuty || '-');

    const updated: Airman = {
      ...editingAirman,
      bdNo: cleanBd,
      rank: editRank,
      name: cleanName, // short name
      trade: cleanTrade,
      flight: cleanFlight,
    };

    onUpdateAirmanFull(updated, currDisp);
    setEditingAirman(null);
  };

  // Submit new airman - ALL OPTIONS MUST BE FILLED & BD MUST BE EXACTLY 6 DIGITS & UNIQUE ACROSS ALL OFFICES
  const handleAddNewAirmanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const cleanBd = newBdNo.trim();
    const cleanName = newName.trim();
    const cleanTrade = newTrade.trim();
    const cleanFlight = newFlight.trim();

    if (!cleanBd) {
      setAddError('BD is required and must be 6 digits.');
      return;
    }
    if (!/^\d{6}$/.test(cleanBd)) {
      setAddError('BD must be exactly 6 digits (numbers only, e.g. 474455).');
      return;
    }

    const bdConflict = findExistingBdConflict(dayState, cleanBd);
    if (bdConflict) {
      setAddError(
        `BD ${cleanBd} already exists in ${bdConflict.unit} (${bdConflict.airman.rank} ${bdConflict.airman.name}). Same BD cannot be in two offices.`
      );
      return;
    }

    if (!newRank) {
      setAddError('Please select a Rank.');
      return;
    }
    if (!cleanName) {
      setAddError('Please enter Name.');
      return;
    }
    if (!cleanTrade) {
      setAddError('Please select or enter a Trade.');
      return;
    }
    if (!cleanFlight) {
      setAddError('Please select or enter a Flight.');
      return;
    }

    onAddAirman({
      name: cleanName,
      rank: newRank as Rank,
      trade: cleanTrade,
      flight: cleanFlight,
      bdNo: cleanBd,
      unit: unitName,
      status: 'on_parade',
    });

    setNewName('');
    setNewRank('');
    setNewTrade('');
    setNewFlight('');
    setNewBdNo('');
    setIsCustomNewTrade(false);
    setIsCustomNewFlight(false);
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

            {canManageNominalRoll && (
              <button
                onClick={handleOpenAddModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer shadow-sm hover:shadow"
                title="Add New Airman to Nominal Roll"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Airman</span>
              </button>
            )}

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
              {/* Flight Filter Tabs (or Trade Filter Tabs when office has no Flights) */}
              {officeHasFlights ? (
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  <span className="text-xs text-slate-400 font-semibold mr-1 shrink-0">Flight:</span>
                  <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800/60">
                    {flightOptions.map((flt) => (
                      <button
                        key={flt}
                        onClick={() => setSelectedFlight(flt)}
                        className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
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
              ) : (
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  <span className="text-xs text-slate-400 font-semibold mr-1 shrink-0">Trade:</span>
                  <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-lg border border-slate-800/60">
                    {tradeFilterOptions.map((trd) => (
                      <button
                        key={trd}
                        onClick={() => setSelectedTrade(trd)}
                        className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                          selectedTrade === trd
                            ? 'bg-blue-600 text-white shadow font-semibold'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        }`}
                      >
                        {trd}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                            {airman.flight || 'N/A'}
                          </td>

                          {/* Disposal Dropdown (Searchable + Persistent Custom Disposals with Cross button) */}
                          <td
                            className="py-2.5 px-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {canEditDisposals ? (
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
                                onBeforeOpen={onRequireAuth}
                              />
                            ) : (
                              <span
                                className={`inline-block py-1 px-2.5 rounded-lg text-xs ${
                                  hasDisposal
                                    ? 'bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/30'
                                    : 'text-slate-400'
                                }`}
                              >
                                {currentDispVal}
                              </span>
                            )}
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
              {editError && (
                <div className="p-2.5 rounded bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="relative pt-1">
                  <label
                    htmlFor="edit-airman-bd"
                    className={getModalFloatLabelClass(focusedEditField === 'bdNo', editBdNo)}
                  >
                    BD *
                  </label>
                  <input
                    id="edit-airman-bd"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={editBdNo}
                    onFocus={() => setFocusedEditField('bdNo')}
                    onBlur={() => setFocusedEditField((prev) => (prev === 'bdNo' ? null : prev))}
                    onChange={(e) => {
                      setEditBdNo(e.target.value.replace(/\D/g, '').slice(0, 6));
                      setEditError(null);
                    }}
                    className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-11 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors border tabular-nums ${
                      focusedEditField === 'bdNo' ? 'border-emerald-500' : 'border-slate-700/80'
                    }`}
                  />
                  <span className="absolute right-3 top-[calc(50%+2px)] -translate-y-1/2 text-[10px] text-slate-400 tabular-nums pointer-events-none">
                    {editBdNo.length}/6
                  </span>
                </div>

                <div className="relative pt-1">
                  <label
                    htmlFor="edit-airman-rank"
                    className={getModalFloatLabelClass(focusedEditField === 'rank', editRank)}
                  >
                    Rank *
                  </label>
                  <select
                    id="edit-airman-rank"
                    value={editRank}
                    onFocus={() => setFocusedEditField('rank')}
                    onBlur={() => setFocusedEditField((prev) => (prev === 'rank' ? null : prev))}
                    onChange={(e) => setEditRank(e.target.value as Rank)}
                    className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-7 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors cursor-pointer border ${
                      focusedEditField === 'rank' ? 'border-emerald-500' : 'border-slate-700/80'
                    }`}
                  >
                    {BAF_RANKS_SELECT.map((r) => (
                      <option key={r} value={r} className="bg-[#0b1424] text-slate-200">
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="relative pt-1">
                <label
                  htmlFor="edit-airman-name"
                  className={getModalFloatLabelClass(focusedEditField === 'name', editName)}
                >
                  Name *
                </label>
                <input
                  id="edit-airman-name"
                  type="text"
                  required
                  value={editName}
                  onFocus={() => setFocusedEditField('name')}
                  onBlur={() => setFocusedEditField((prev) => (prev === 'name' ? null : prev))}
                  onChange={(e) => setEditName(e.target.value)}
                  className={`w-full bg-[#08101e] rounded-xl px-3.5 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors border ${
                    focusedEditField === 'name' ? 'border-emerald-500' : 'border-slate-700/80'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="relative pt-1">
                  <label
                    htmlFor="edit-airman-trade"
                    className={getModalFloatLabelClass(focusedEditField === 'trade', editTrade)}
                  >
                    Trade *
                  </label>
                  {isCustomEditTrade ? (
                    <>
                      <input
                        id="edit-airman-trade"
                        type="text"
                        required
                        value={editTrade}
                        onFocus={() => setFocusedEditField('trade')}
                        onBlur={() => setFocusedEditField((prev) => (prev === 'trade' ? null : prev))}
                        onChange={(e) => setEditTrade(e.target.value)}
                        className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-11 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors border ${
                          focusedEditField === 'trade' ? 'border-emerald-500' : 'border-slate-700/80'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomEditTrade(false);
                          setFocusedEditField(null);
                        }}
                        className="absolute right-2.5 top-[calc(50%+2px)] -translate-y-1/2 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                      >
                        List
                      </button>
                    </>
                  ) : (
                    <select
                      id="edit-airman-trade"
                      required
                      value={editTrade}
                      onFocus={() => setFocusedEditField('trade')}
                      onBlur={() => setFocusedEditField((prev) => (prev === 'trade' ? null : prev))}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomEditTrade(true);
                          setEditTrade('');
                        } else {
                          setEditTrade(e.target.value);
                        }
                      }}
                      className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-7 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors cursor-pointer border ${
                        focusedEditField === 'trade' ? 'border-emerald-500' : 'border-slate-700/80'
                      }`}
                    >
                      <option value="" disabled hidden></option>
                      {!availableTrades.includes(editTrade) && editTrade && (
                        <option value={editTrade}>{editTrade}</option>
                      )}
                      {availableTrades.map((t) => (
                        <option key={t} value={t} className="bg-[#0b1424] text-slate-200">
                          {t}
                        </option>
                      ))}
                      <option value="__CUSTOM__" className="bg-[#0b1424] text-emerald-400 font-semibold">
                        + Custom Trade...
                      </option>
                    </select>
                  )}
                </div>

                <div className="relative pt-1">
                  <label
                    htmlFor="edit-airman-flight"
                    className={getModalFloatLabelClass(focusedEditField === 'flight', editFlight)}
                  >
                    Flight *
                  </label>
                  {isCustomEditFlight ? (
                    <>
                      <input
                        id="edit-airman-flight"
                        type="text"
                        required
                        value={editFlight}
                        onFocus={() => setFocusedEditField('flight')}
                        onBlur={() => setFocusedEditField((prev) => (prev === 'flight' ? null : prev))}
                        onChange={(e) => setEditFlight(e.target.value)}
                        className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-11 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors border ${
                          focusedEditField === 'flight' ? 'border-emerald-500' : 'border-slate-700/80'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomEditFlight(false);
                          setFocusedEditField(null);
                        }}
                        className="absolute right-2.5 top-[calc(50%+2px)] -translate-y-1/2 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                      >
                        List
                      </button>
                    </>
                  ) : (
                    <select
                      id="edit-airman-flight"
                      value={editFlight}
                      onFocus={() => setFocusedEditField('flight')}
                      onBlur={() => setFocusedEditField((prev) => (prev === 'flight' ? null : prev))}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomEditFlight(true);
                          setEditFlight('');
                        } else {
                          setEditFlight(e.target.value);
                        }
                      }}
                      className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-7 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors cursor-pointer border ${
                        focusedEditField === 'flight' ? 'border-emerald-500' : 'border-slate-700/80'
                      }`}
                    >
                      <option value="" disabled hidden></option>
                      {!availableFlights.includes(editFlight) && editFlight && (
                        <option value={editFlight}>{editFlight}</option>
                      )}
                      {availableFlights.map((f) => (
                        <option key={f} value={f} className="bg-[#0b1424] text-slate-200">
                          {f}
                        </option>
                      ))}
                      <option value="__CUSTOM__" className="bg-[#0b1424] text-emerald-400 font-semibold">
                        + Custom Flight...
                      </option>
                    </select>
                  )}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-slate-800">
                {canDeleteAirman ? (
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
                ) : (
                  <span className="text-[11px] text-slate-500">
                    Delete disabled by Owner policy
                  </span>
                )}

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

      {/* Add Airman Modal (Single Airman + Bulk Excel Upload) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className={`bg-[#0b1424] border border-slate-700 w-full rounded-xl shadow-2xl p-5 text-slate-200 transition-all ${
              addMode === 'bulk' ? 'max-w-2xl' : 'max-w-md'
            }`}
          >
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-100">Add Airman to Nominal Roll</h3>
                <p className="text-[11px] text-slate-400">
                  {addMode === 'single'
                    ? 'All fields must be filled. BD must be exactly 6 digits.'
                    : 'Upload Excel (.xlsx, .xls) or CSV to add multiple airmen at once.'}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Single vs Bulk Excel Mode Switcher */}
            <div className="inline-flex items-center gap-1 bg-[#070e1b] border border-slate-800 p-1 rounded-lg mb-4">
              <button
                type="button"
                onClick={() => {
                  setAddMode('single');
                  setAddError(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  addMode === 'single'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Single Airman</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddMode('bulk');
                  setBulkError(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  addMode === 'bulk'
                    ? 'bg-emerald-600 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Bulk Upload (Excel)</span>
              </button>
            </div>

            {addMode === 'single' ? (
              <>
                {addError && (
                  <div className="mb-3 p-2.5 rounded bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{addError}</span>
                  </div>
                )}

                <form onSubmit={handleAddNewAirmanSubmit} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    {/* BD (Must be exactly 6 digits) */}
                    <div className="relative pt-1">
                      <label
                        htmlFor="add-airman-bd"
                        className={getModalFloatLabelClass(focusedAddField === 'bdNo', newBdNo)}
                      >
                        BD *
                      </label>
                      <input
                        id="add-airman-bd"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        value={newBdNo}
                        onFocus={() => setFocusedAddField('bdNo')}
                        onBlur={() => setFocusedAddField((prev) => (prev === 'bdNo' ? null : prev))}
                        onChange={(e) => {
                          setNewBdNo(e.target.value.replace(/\D/g, '').slice(0, 6));
                          setAddError(null);
                        }}
                        className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-11 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors border tabular-nums ${
                          focusedAddField === 'bdNo' ? 'border-emerald-500' : 'border-slate-700/80'
                        }`}
                      />
                      <span className="absolute right-3 top-[calc(50%+2px)] -translate-y-1/2 text-[10px] text-slate-400 tabular-nums pointer-events-none">
                        {newBdNo.length}/6
                      </span>
                    </div>

                    {/* Rank Dropdown (Cpl, LAC, AC-1, AC-2) */}
                    <div className="relative pt-1">
                      <label
                        htmlFor="add-airman-rank"
                        className={getModalFloatLabelClass(focusedAddField === 'rank', newRank)}
                      >
                        Rank *
                      </label>
                      <select
                        id="add-airman-rank"
                        required
                        value={newRank}
                        onFocus={() => setFocusedAddField('rank')}
                        onBlur={() => setFocusedAddField((prev) => (prev === 'rank' ? null : prev))}
                        onChange={(e) => {
                          setNewRank(e.target.value);
                          setAddError(null);
                        }}
                        className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-7 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors cursor-pointer border ${
                          focusedAddField === 'rank' ? 'border-emerald-500' : 'border-slate-700/80'
                        }`}
                      >
                        <option value="" disabled hidden></option>
                        {BAF_RANKS_SELECT.map((r) => (
                          <option key={r} value={r} className="bg-[#0b1424] text-slate-200">
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="relative pt-1">
                    <label
                      htmlFor="add-airman-name"
                      className={getModalFloatLabelClass(focusedAddField === 'name', newName)}
                    >
                      Name *
                    </label>
                    <input
                      id="add-airman-name"
                      type="text"
                      required
                      value={newName}
                      onFocus={() => setFocusedAddField('name')}
                      onBlur={() => setFocusedAddField((prev) => (prev === 'name' ? null : prev))}
                      onChange={(e) => {
                        setNewName(e.target.value);
                        setAddError(null);
                      }}
                      className={`w-full bg-[#08101e] rounded-xl px-3.5 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors border ${
                        focusedAddField === 'name' ? 'border-emerald-500' : 'border-slate-700/80'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Trade (Preset + Custom) */}
                    <div className="relative pt-1">
                      <label
                        htmlFor="add-airman-trade"
                        className={getModalFloatLabelClass(focusedAddField === 'trade', newTrade)}
                      >
                        Trade *
                      </label>
                      {isCustomNewTrade ? (
                        <>
                          <input
                            id="add-airman-trade"
                            type="text"
                            required
                            value={newTrade}
                            onFocus={() => setFocusedAddField('trade')}
                            onBlur={() =>
                              setFocusedAddField((prev) => (prev === 'trade' ? null : prev))
                            }
                            onChange={(e) => {
                              setNewTrade(e.target.value);
                              setAddError(null);
                            }}
                            className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-11 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors border ${
                              focusedAddField === 'trade' ? 'border-emerald-500' : 'border-slate-700/80'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomNewTrade(false);
                              setNewTrade('');
                              setFocusedAddField(null);
                            }}
                            className="absolute right-2.5 top-[calc(50%+2px)] -translate-y-1/2 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                          >
                            List
                          </button>
                        </>
                      ) : (
                        <select
                          id="add-airman-trade"
                          required
                          value={newTrade}
                          onFocus={() => setFocusedAddField('trade')}
                          onBlur={() =>
                            setFocusedAddField((prev) => (prev === 'trade' ? null : prev))
                          }
                          onChange={(e) => {
                            if (e.target.value === '__CUSTOM__') {
                              setIsCustomNewTrade(true);
                              setNewTrade('');
                            } else {
                              setNewTrade(e.target.value);
                            }
                            setAddError(null);
                          }}
                          className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-7 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors cursor-pointer border ${
                            focusedAddField === 'trade' ? 'border-emerald-500' : 'border-slate-700/80'
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

                    {/* Flight (Preset + Custom) */}
                    <div className="relative pt-1">
                      <label
                        htmlFor="add-airman-flight"
                        className={getModalFloatLabelClass(focusedAddField === 'flight', newFlight)}
                      >
                        Flight *
                      </label>
                      {isCustomNewFlight ? (
                        <>
                          <input
                            id="add-airman-flight"
                            type="text"
                            required
                            value={newFlight}
                            onFocus={() => setFocusedAddField('flight')}
                            onBlur={() =>
                              setFocusedAddField((prev) => (prev === 'flight' ? null : prev))
                            }
                            onChange={(e) => {
                              setNewFlight(e.target.value);
                              setAddError(null);
                            }}
                            className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-11 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors border ${
                              focusedAddField === 'flight' ? 'border-emerald-500' : 'border-slate-700/80'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomNewFlight(false);
                              setNewFlight('');
                              setFocusedAddField(null);
                            }}
                            className="absolute right-2.5 top-[calc(50%+2px)] -translate-y-1/2 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                          >
                            List
                          </button>
                        </>
                      ) : (
                        <select
                          id="add-airman-flight"
                          required
                          value={newFlight}
                          onFocus={() => setFocusedAddField('flight')}
                          onBlur={() =>
                            setFocusedAddField((prev) => (prev === 'flight' ? null : prev))
                          }
                          onChange={(e) => {
                            if (e.target.value === '__CUSTOM__') {
                              setIsCustomNewFlight(true);
                              setNewFlight('');
                            } else {
                              setNewFlight(e.target.value);
                            }
                            setAddError(null);
                          }}
                          className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-7 py-3 text-xs font-semibold text-slate-100 focus:outline-none transition-colors cursor-pointer border ${
                            focusedAddField === 'flight' ? 'border-emerald-500' : 'border-slate-700/80'
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
              </>
            ) : (
              <div className="space-y-3.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-[#070e1b] border border-slate-800">
                  <div className="text-[11px] text-slate-300">
                    <span className="font-semibold text-white">Columns:</span>{' '}
                    <span className="text-slate-300 font-semibold">Ser No</span>,{' '}
                    <span className="text-emerald-400 font-semibold">BD</span>,{' '}
                    <span className="text-emerald-400 font-semibold">Rank</span>,{' '}
                    <span className="text-emerald-400 font-semibold">Name</span>,{' '}
                    <span className="text-emerald-400 font-semibold">Trade</span>,{' '}
                    <span className="text-emerald-400 font-semibold">Flight</span>
                  </div>
                  <button
                    type="button"
                    onClick={downloadSampleAirmenExcel}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>Sample Excel</span>
                  </button>
                </div>

                {/* File Input */}
                <label className="flex flex-col items-center justify-center gap-1.5 p-5 border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-xl bg-[#070e1b]/60 cursor-pointer transition-colors">
                  <Upload className="w-5 h-5 text-emerald-400" />
                  <span className="font-semibold text-slate-200">
                    {bulkFileName ? bulkFileName : 'Click to choose Excel (.xlsx, .xls) or CSV file'}
                  </span>
                  <span className="text-[11px] text-slate-400 text-center">
                    Any Trade or Flight in your Excel file will be imported &amp; sorted by Rank &amp; BD seniority
                  </span>
                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelFileChange}
                    className="hidden"
                  />
                </label>

                {bulkError && (
                  <div className="p-2.5 rounded bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{bulkError}</span>
                  </div>
                )}

                {bulkRows.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-400 font-semibold">
                        {validBulkRows.length} valid airmen ready to import (auto-sorted by Rank &amp; BD)
                      </span>
                      {bulkRows.length - validBulkRows.length > 0 && (
                        <span className="text-amber-400 font-semibold">
                          {bulkRows.length - validBulkRows.length} row(s) skipped due to errors
                        </span>
                      )}
                    </div>

                    <div className="max-h-56 overflow-auto border border-slate-800 rounded-lg bg-[#070e1b]">
                      <table className="w-full text-[11px] text-left border-collapse">
                        <thead className="bg-slate-900/90 text-slate-400 sticky top-0">
                          <tr className="border-b border-slate-800">
                            <th className="py-2 px-2.5">Ser No</th>
                            <th className="py-2 px-2.5">BD</th>
                            <th className="py-2 px-2.5">Rank</th>
                            <th className="py-2 px-2.5">Name</th>
                            <th className="py-2 px-2.5">Trade</th>
                            <th className="py-2 px-2.5">Flight</th>
                            <th className="py-2 px-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {bulkRows.map((row) => (
                            <tr
                              key={row.rowNumber}
                              className={row.error ? 'bg-rose-950/20 text-rose-300' : 'text-slate-200'}
                            >
                              <td className="py-1.5 px-2.5 text-slate-400">{row.serNo || row.rowNumber - 1}</td>
                              <td className="py-1.5 px-2.5 font-semibold">{row.bdNo || '-'}</td>
                              <td className="py-1.5 px-2.5">{row.rank || row.rawRank || '-'}</td>
                              <td className="py-1.5 px-2.5">{row.name || '-'}</td>
                              <td className="py-1.5 px-2.5">{row.trade || '-'}</td>
                              <td className="py-1.5 px-2.5">{row.flight || '-'}</td>
                              <td className="py-1.5 px-2.5">
                                {row.error ? (
                                  <span className="text-rose-400 font-medium">{row.error}</span>
                                ) : (
                                  <span className="text-emerald-400 font-semibold">Valid</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={validBulkRows.length === 0}
                    onClick={handleBulkImportSubmit}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 font-bold rounded cursor-pointer shadow transition-all"
                  >
                    Import {validBulkRows.length > 0 ? `${validBulkRows.length} ` : ''}Airmen
                  </button>
                </div>
              </div>
            )}
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
