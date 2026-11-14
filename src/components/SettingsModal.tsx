import React, { useState, useEffect } from 'react';
import {
  Settings,
  History,
  Database,
  Megaphone,
  Building2,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  RefreshCw,
  Trash2,
  CloudUpload,
  CloudDownload,
  Plus,
  CheckCircle2,
  AlertCircle,
  Shield,
  UserCog,
  UserPlus,
  Save,
  Palette,
  Monitor,
  Sun,
  Moon,
  Lock,
} from 'lucide-react';
import {
  Airman,
  DayState,
  LoginHistoryEntry,
  OperatorProfile,
  Rank,
  RolePermissionKey,
  RolePermissionsConfig,
  ThemePreference,
  UserRole,
  WingConfig,
} from '../types/nightCount';
import {
  BAF_ALL_RANKS,
  BAF_FLIGHTS,
  BAF_TRADES,
  FLYING_WING_SQUADRONS,
} from '../data/initialData';
import {
  ALL_PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  findExistingBdConflict,
  getAllAirmenAcrossUnits,
  getAllConfiguredUnits,
} from '../utils/storage';

export type SettingsTabId =
  | 'theme'
  | 'wings'
  | 'users'
  | 'permissions'
  | 'history'
  | 'sync'
  | 'notice';

interface SettingsModalProps {
  isOpen: boolean;
  initialTab?: SettingsTabId;
  onClose: () => void;
  operator: OperatorProfile | null;
  operatorRole: UserRole | 'GUEST';
  themePref: ThemePreference;
  onChangeThemePref: (pref: ThemePreference) => void;
  rolePermissions: RolePermissionsConfig;
  onSaveRolePermissions: (next: RolePermissionsConfig) => void;
  canManageWings: boolean;
  canManageUsers: boolean;
  canManageCloudAndNotice: boolean;
  loginHistory: LoginHistoryEntry[];
  onRefreshLoginHistory: () => Promise<void>;
  onClearLoginHistory: () => void;
  onSyncNowToCloud: () => Promise<void>;
  onPullLatestFromCloud: () => Promise<void>;
  appNotice: string;
  onSaveAppNotice: (notice: string) => void;
  onRequireAuth: (onSuccess: () => void) => void;
  dayState: DayState;
  wings: WingConfig[];
  onAddWing: (name: string, shortName: string) => { ok: boolean; error?: string };
  onDeleteWing: (wingId: string) => void;
  onAddUnitToWing: (wingId: string, unitName: string) => { ok: boolean; error?: string };
  onDeleteUnitFromWing: (wingId: string, unitName: string) => void;
  onOpenUnitNominalRoll: (unitName: string) => void;
  onOpenUnitState: (unitName: string) => void;
  onAddAirmanFromSettings: (airman: Omit<Airman, 'id'>) => void;
  onDeleteAirmanFromSettings: (unitName: string, airmanId: string) => void;
  onUpdateUserProfile: (
    unitName: string,
    airmanId: string,
    updates: {
      rank?: Rank;
      name?: string;
      bdNo?: string;
      trade?: string;
      flight?: string;
      role?: UserRole;
      adminPin?: string;
    }
  ) => void;
}

const CORE_UNITS_SET = new Set(FLYING_WING_SQUADRONS.map((u) => u.toLowerCase()));

const NAV_ITEMS: {
  id: SettingsTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'theme', label: 'Theme & Appearance', icon: Palette },
  { id: 'wings', label: 'Wings & Units', icon: Building2 },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'permissions', label: 'Access Control', icon: Lock },
  { id: 'history', label: 'Login History', icon: History },
  { id: 'sync', label: 'Database Cloud Sync', icon: Database },
  { id: 'notice', label: 'App Notice', icon: Megaphone },
];

const PERMISSION_GROUPS: {
  title: string;
  subtitle: string;
  items: { key: RolePermissionKey; label: string; desc: string }[];
}[] = [
  {
    title: 'State & Consolidated Views',
    subtitle: 'Control who can view and edit squadron counts & unit disposals',
    items: [
      {
        key: 'viewConsolidatedState',
        label: 'Consolidated Wing State',
        desc: 'View wing consolidated summary table & strength forecast',
      },
      {
        key: 'editQuickSqnCount',
        label: 'Quick Edit Sqn Count',
        desc: 'Modify squadron strength & disposal counts via Quick Edit page',
      },
      {
        key: 'viewUnitDetails',
        label: 'Unit Night Count State',
        desc: 'Open individual Squadron/Unit Night Count detail views',
      },
      {
        key: 'editUnitDisposals',
        label: 'Edit Unit Disposals & Remarks',
        desc: 'Toggle parade status, remove disposals & update unit remarks',
      },
    ],
  },
  {
    title: 'Nominal Roll, Reports & Logs',
    subtitle: 'Manage personnel roster actions, print exports, signatures & logs',
    items: [
      {
        key: 'manageNominalRoll',
        label: 'Manage Nominal Roll (Add / Edit / Disposal)',
        desc: 'Add airmen, bulk import, edit airman details & assign disposals',
      },
      {
        key: 'deleteNominalRollAirman',
        label: 'Delete Airman from Nominal Roll',
        desc: 'Allow removing airman entries from a Squadron Nominal Roll',
      },
      {
        key: 'editPreparedBy',
        label: 'Prepared By Signature',
        desc: 'Edit duty NCO / clerk Prepared By signature details',
      },
      {
        key: 'exportPrintReport',
        label: 'Print & Export Reports',
        desc: 'Generate and print official consolidated or unit reports',
      },
      {
        key: 'viewUpdateLog',
        label: 'State Update Log',
        desc: 'View audit log showing who updated Night Count state',
      },
    ],
  },
  {
    title: 'Settings & Administration',
    subtitle: 'Restrict Settings panels, Wing/Unit creation, Directory & Cloud Sync',
    items: [
      {
        key: 'accessSettings',
        label: 'Open Settings Panel',
        desc: 'Allow opening Settings from the sidebar (Theme, View Info)',
      },
      {
        key: 'manageWingsAndUnits',
        label: 'Manage Wings & Squadrons/Units',
        desc: 'Add or remove Wings and Squadrons/Units in Settings',
      },
      {
        key: 'manageUsers',
        label: 'Manage User Directory (Add / Edit / Remove)',
        desc: 'Add, edit profile/PIN, or remove users in User Management',
      },
      {
        key: 'manageCloudAndNotice',
        label: 'Cloud Sync, App Notice & Login History',
        desc: 'Manual Cloud sync, publish App Notice, and clear Login History',
      },
    ],
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  initialTab = 'theme',
  onClose,
  operator,
  operatorRole,
  themePref,
  onChangeThemePref,
  rolePermissions,
  onSaveRolePermissions,
  canManageWings,
  canManageUsers,
  canManageCloudAndNotice,
  loginHistory,
  onRefreshLoginHistory,
  onClearLoginHistory,
  onSyncNowToCloud,
  onPullLatestFromCloud,
  appNotice,
  onSaveAppNotice,
  onRequireAuth,
  dayState,
  wings,
  onAddWing,
  onDeleteWing,
  onAddUnitToWing,
  onDeleteUnitFromWing,
  onOpenUnitNominalRoll,
  onOpenUnitState,
  onAddAirmanFromSettings,
  onDeleteAirmanFromSettings,
  onUpdateUserProfile,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [historyQuery, setHistoryQuery] = useState('');
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);
  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false);

  // User Management state
  const [userQuery, setUserQuery] = useState('');
  const [userFlightFilter, setUserFlightFilter] = useState<string>('ALL');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [userUnitFilter, setUserUnitFilter] = useState<string>('ALL');
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [newUserUnit, setNewUserUnit] = useState<string>('155 UASU BAF');
  const [newUserRank, setNewUserRank] = useState<Rank>('LAC');
  const [newUserName, setNewUserName] = useState('');
  const [newUserBdNo, setNewUserBdNo] = useState('');
  const [newUserTrade, setNewUserTrade] = useState<string>(BAF_TRADES[0]);
  const [newUserFlight, setNewUserFlight] = useState<string>(BAF_FLIGHTS[0]);
  const [newUserRole, setNewUserRole] = useState<UserRole>('USER');
  const [newUserAdminPin, setNewUserAdminPin] = useState('');
  const [userActionFeedback, setUserActionFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  // Selected User Profile View & Edit state
  const [selectedUserRef, setSelectedUserRef] = useState<{ id: string; unit: string } | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editRank, setEditRank] = useState<Rank>('LAC');
  const [editName, setEditName] = useState('');
  const [editBdNo, setEditBdNo] = useState('');
  const [editTrade, setEditTrade] = useState('');
  const [editFlight, setEditFlight] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('USER');
  const [editAdminPin, setEditAdminPin] = useState('');
  const [profileFeedback, setProfileFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  // Access Control state
  const [selectedPermRole, setSelectedPermRole] = useState<'SUPER_ADMIN' | 'USER' | 'GUEST'>(
    'SUPER_ADMIN'
  );
  const [permFeedback, setPermFeedback] = useState<string | null>(null);

  // Wings & Units state
  const [wingNameInput, setWingNameInput] = useState('');
  const [wingShortInput, setWingShortInput] = useState('');
  const [targetWingId, setTargetWingId] = useState<string>(wings[0]?.id || 'flying-wing');
  const [unitNameInput, setUnitNameInput] = useState('');
  const [wingFeedback, setWingFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  const [noticeDraft, setNoticeDraft] = useState(appNotice);
  const [noticeSavedFeedback, setNoticeSavedFeedback] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setNoticeDraft(appNotice);
      setConfirmClearHistory(false);
      setConfirmDeleteUserId(null);
      setSelectedUserRef(null);
      setIsEditingProfile(false);
      setProfileFeedback(null);
      setSyncFeedback(null);
      setWingFeedback(null);
      setUserActionFeedback(null);
      setNoticeSavedFeedback(false);
      setPermFeedback(null);
      if (wings.length > 0 && !wings.some((w) => w.id === targetWingId)) {
        setTargetWingId(wings[0].id);
      }
    }
  }, [isOpen, initialTab, appNotice, wings, targetWingId]);

  if (!isOpen) return null;

  const isOwner = operatorRole === 'OWNER';
  const canEditUsers = isOwner || canManageUsers;
  const canEditWings = isOwner || canManageWings;
  const canEditCloudAndNotice = isOwner || canManageCloudAndNotice;

  const activeNav = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];
  const allConfiguredUnits = getAllConfiguredUnits(wings);

  const getWingForUnit = (unitName: string): WingConfig | undefined =>
    wings.find((w) => w.units.some((u) => u.toLowerCase() === unitName.toLowerCase()));

  // Overall Users aggregated across ALL Squadrons / Units
  const allUsers = getAllAirmenAcrossUnits(dayState, wings);
  const distinctFlights = Array.from(
    new Set([
      ...BAF_FLIGHTS,
      ...allUsers.map((u) => (u.flight || '').trim()).filter(Boolean),
    ])
  );

  const filteredUsers = allUsers.filter((u) => {
    if (userUnitFilter !== 'ALL' && u.unit !== userUnitFilter) {
      return false;
    }
    if (userFlightFilter !== 'ALL' && (u.flight || '') !== userFlightFilter) {
      return false;
    }
    const effectiveRole: UserRole = u.role || 'USER';
    if (userRoleFilter !== 'ALL' && effectiveRole !== userRoleFilter) {
      return false;
    }
    const q = userQuery.trim().toLowerCase();
    if (!q) return true;
    const wingLabel = getWingForUnit(u.unit)?.name || '';
    const wingShort = getWingForUnit(u.unit)?.shortName || '';
    return (
      (u.bdNo || '').toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      u.rank.toLowerCase().includes(q) ||
      (u.trade || '').toLowerCase().includes(q) ||
      (u.flight || '').toLowerCase().includes(q) ||
      u.unit.toLowerCase().includes(q) ||
      wingLabel.toLowerCase().includes(q) ||
      wingShort.toLowerCase().includes(q) ||
      effectiveRole.toLowerCase().includes(q) ||
      (u.currentDuty || '').toLowerCase().includes(q)
    );
  });

  const filteredHistory = loginHistory.filter((entry) => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      entry.bdNo.toLowerCase().includes(q) ||
      entry.name.toLowerCase().includes(q) ||
      entry.rank.toLowerCase().includes(q) ||
      entry.flight.toLowerCase().includes(q) ||
      entry.mode.toLowerCase().includes(q) ||
      entry.displayTime.toLowerCase().includes(q)
    );
  });

  const handleRefreshHistory = async () => {
    setIsRefreshingHistory(true);
    try {
      await onRefreshLoginHistory();
    } finally {
      setIsRefreshingHistory(false);
    }
  };

  const handleAddWingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = wingNameInput.trim();
    if (!cleanName) {
      setWingFeedback({ type: 'err', text: 'Please enter a Wing name.' });
      return;
    }
    onRequireAuth(() => {
      const res = onAddWing(cleanName, wingShortInput.trim());
      if (!res.ok) {
        setWingFeedback({ type: 'err', text: res.error || 'Could not add Wing.' });
        return;
      }
      setWingFeedback({ type: 'ok', text: `Added Wing "${cleanName}" and synced to Cloud.` });
      setWingNameInput('');
      setWingShortInput('');
    });
  };

  const handleAddUnitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUnit = unitNameInput.trim();
    if (!cleanUnit) {
      setWingFeedback({ type: 'err', text: 'Please enter a Squadron / Unit name.' });
      return;
    }
    onRequireAuth(() => {
      const res = onAddUnitToWing(targetWingId, cleanUnit);
      if (!res.ok) {
        setWingFeedback({ type: 'err', text: res.error || 'Could not add Sqn/Unit.' });
        return;
      }
      const parentWing = wings.find((w) => w.id === targetWingId)?.name || 'Wing';
      setWingFeedback({
        type: 'ok',
        text: `Added "${cleanUnit}" under ${parentWing}.`,
      });
      setUnitNameInput('');
    });
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newUserName.trim();
    const cleanBd = newUserBdNo.replace(/\D/g, '').slice(0, 6);
    if (!cleanName) {
      setUserActionFeedback({ type: 'err', text: 'Enter airman name.' });
      return;
    }
    if (!/^\d{6}$/.test(cleanBd)) {
      setUserActionFeedback({ type: 'err', text: 'USER ID (BD No) must be exactly 6 digits.' });
      return;
    }
    const conflict = findExistingBdConflict(dayState, cleanBd);
    if (conflict) {
      setUserActionFeedback({
        type: 'err',
        text: `BD/${cleanBd} already assigned to ${conflict.airman.rank} ${conflict.airman.name} (${conflict.unit}).`,
      });
      return;
    }

    const cleanPin = newUserAdminPin.trim();
    const assignedRole: UserRole = isOwner ? newUserRole : 'USER';
    onRequireAuth(() => {
      onAddAirmanFromSettings({
        rank: newUserRank,
        name: cleanName,
        bdNo: cleanBd,
        trade: newUserTrade,
        flight: newUserFlight,
        unit: newUserUnit,
        role: assignedRole,
        ...(cleanPin ? { adminPin: cleanPin } : {}),
        status: 'on_parade',
      });
      setUserActionFeedback({
        type: 'ok',
        text: `Added ${newUserRank} ${cleanName} (BD/${cleanBd}) to ${newUserUnit}.`,
      });
      setNewUserName('');
      setNewUserBdNo('');
      setNewUserRole('USER');
      setNewUserAdminPin('');
      setShowAddUserForm(false);
    });
  };

  const selectedUser = selectedUserRef
    ? allUsers.find((u) => u.id === selectedUserRef.id && u.unit === selectedUserRef.unit) ||
      allUsers.find((u) => u.id === selectedUserRef.id) ||
      null
    : null;

  const openUserProfile = (user: Airman) => {
    setSelectedUserRef({ id: user.id, unit: user.unit });
    setIsEditingProfile(false);
    setConfirmDeleteUserId(null);
    setProfileFeedback(null);
  };

  const startEditingProfile = (user: Airman) => {
    setEditRank(user.rank);
    setEditName(user.name);
    setEditBdNo(user.bdNo || '');
    setEditTrade(user.trade || '');
    setEditFlight(user.flight || '');
    setEditRole(user.role || 'USER');
    setEditAdminPin(user.adminPin || '');
    setProfileFeedback(null);
    setIsEditingProfile(true);
  };

  const handleSaveProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const cleanName = editName.trim();
    const cleanBd = editBdNo.replace(/\D/g, '').slice(0, 6);
    const cleanPin = editAdminPin.trim();

    if (!cleanName) {
      setProfileFeedback({ type: 'err', text: 'Name cannot be empty.' });
      return;
    }
    if (!/^\d{6}$/.test(cleanBd)) {
      setProfileFeedback({ type: 'err', text: 'USER ID (BD No) must be exactly 6 digits.' });
      return;
    }
    const conflict = findExistingBdConflict(dayState, cleanBd, selectedUser.id);
    if (conflict) {
      setProfileFeedback({
        type: 'err',
        text: `BD/${cleanBd} is already assigned to ${conflict.airman.rank} ${conflict.airman.name} (${conflict.unit}).`,
      });
      return;
    }
    if (cleanPin && cleanPin.length < 4) {
      setProfileFeedback({
        type: 'err',
        text: 'Admin Login Portal PIN must be at least 4 characters (or leave blank to clear).',
      });
      return;
    }

    onRequireAuth(() => {
      onUpdateUserProfile(selectedUser.unit, selectedUser.id, {
        rank: editRank,
        name: cleanName,
        bdNo: cleanBd,
        trade: editTrade.trim(),
        flight: editFlight.trim(),
        ...(isOwner ? { role: editRole } : {}),
        adminPin: cleanPin,
      });
      setIsEditingProfile(false);
      setProfileFeedback({
        type: 'ok',
        text: isOwner
          ? 'User Role, Admin Login PIN & profile details saved.'
          : 'Admin Login PIN & profile details saved.',
      });
    });
  };

  const handleToggleRolePermission = (key: RolePermissionKey) => {
    if (!isOwner) return;
    const nextConfig: RolePermissionsConfig = {
      ...rolePermissions,
      [selectedPermRole]: {
        ...rolePermissions[selectedPermRole],
        [key]: !rolePermissions[selectedPermRole][key],
      },
    };
    onSaveRolePermissions(nextConfig);
    setPermFeedback(`Updated ${selectedPermRole} permissions & synced to Cloud.`);
  };

  const handleApplyPermissionPreset = (mode: 'all' | 'viewOnly' | 'default') => {
    if (!isOwner) return;
    let updatedRoleMap = { ...rolePermissions[selectedPermRole] };
    if (mode === 'all') {
      ALL_PERMISSION_KEYS.forEach((k) => {
        updatedRoleMap[k] = true;
      });
    } else if (mode === 'viewOnly') {
      ALL_PERMISSION_KEYS.forEach((k) => {
        updatedRoleMap[k] =
          k === 'viewConsolidatedState' ||
          k === 'viewUnitDetails' ||
          k === 'viewUpdateLog' ||
          k === 'exportPrintReport';
      });
    } else {
      updatedRoleMap = { ...DEFAULT_ROLE_PERMISSIONS[selectedPermRole] };
    }
    onSaveRolePermissions({
      ...rolePermissions,
      [selectedPermRole]: updatedRoleMap,
    });
    setPermFeedback(
      `Applied ${mode === 'all' ? 'Allow All' : mode === 'viewOnly' ? 'View Only' : 'Default'} preset to ${selectedPermRole}.`
    );
  };

  const handleUploadSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      await onSyncNowToCloud();
      setSyncFeedback({ type: 'ok', text: `Synced ${dayState.date} & shared settings to Cloud.` });
    } catch (err) {
      setSyncFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Cloud sync failed.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      await onPullLatestFromCloud();
      setSyncFeedback({ type: 'ok', text: `Pulled latest Cloud state for ${dayState.date}.` });
    } catch (err) {
      setSyncFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Cloud download failed.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveNoticeClick = () => {
    onRequireAuth(() => {
      onSaveAppNotice(noticeDraft.trim());
      setNoticeSavedFeedback(true);
      setTimeout(() => setNoticeSavedFeedback(false), 2500);
    });
  };

  const handleClearNoticeClick = () => {
    onRequireAuth(() => {
      setNoticeDraft('');
      onSaveAppNotice('');
      setNoticeSavedFeedback(true);
      setTimeout(() => setNoticeSavedFeedback(false), 2500);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0d1728] border border-[#1f2f4d] rounded-2xl w-full max-w-5xl h-[90vh] max-h-[700px] flex flex-col sm:flex-row overflow-hidden shadow-2xl shadow-black/70"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Navigation Column */}
        <aside className="w-full sm:w-56 bg-[#09111f] border-b sm:border-b-0 sm:border-r border-[#1a2944] flex flex-col shrink-0">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#152238]">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-white tracking-tight">Settings</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              aria-label="Close Settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex sm:flex-col gap-1.5 p-2.5 overflow-x-auto sm:overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    if (item.id !== 'users') {
                      setSelectedUserRef(null);
                      setIsEditingProfile(false);
                    }
                  }}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 sm:w-full ${
                    isSelected
                      ? 'bg-[#161f3d] text-indigo-300 border border-indigo-500/45 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-[#111d33] border border-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? 'text-indigo-400' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  <ChevronRight
                    className={`hidden sm:block w-3.5 h-3.5 shrink-0 ${
                      isSelected ? 'text-indigo-400' : 'text-slate-500'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Content Column */}
        <section className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#18263f] shrink-0">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {activeNav.label}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="hidden sm:inline-flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              aria-label="Close Settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* TAB: THEME & APPEARANCE (Matches Pic 2 style) */}
            {activeTab === 'theme' && (
              <div className="space-y-4">
                <div className="bg-[#101c31] border border-[#1d2e4c] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-2.5 text-sm font-bold text-white">
                    <Palette className="w-4 h-4 text-indigo-400" />
                    <span>Theme Preference</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(
                      [
                        { id: 'system' as const, label: 'System Theme', icon: Monitor },
                        { id: 'light' as const, label: 'Light Mode', icon: Sun },
                        { id: 'dark' as const, label: 'Dark Mode', icon: Moon },
                      ] as const
                    ).map((opt) => {
                      const ThemeIcon = opt.icon;
                      const active = themePref === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onChangeThemePref(opt.id)}
                          className={`flex flex-col items-center justify-center gap-2.5 px-4 py-5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            active
                              ? 'bg-[#161e3e] border-indigo-500 text-indigo-300 shadow-[0_0_18px_rgba(99,102,241,0.22)]'
                              : 'bg-[#09111f] border-[#1e3150] text-slate-300 hover:text-white hover:border-[#2e456e]'
                          }`}
                        >
                          <ThemeIcon
                            className={`w-5 h-5 ${active ? 'text-indigo-400' : 'text-slate-400'}`}
                          />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    System Theme follows your device preference automatically. Light Mode and Dark
                    Mode apply immediately across the workspace.
                  </p>
                </div>
              </div>
            )}

            {/* TAB: WINGS & SQUADRONS/UNITS */}
            {activeTab === 'wings' && (
              <>
                {!canEditWings && (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium border bg-amber-950/35 border-amber-500/35 text-amber-200">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      View Only: Wing &amp; Squadron management is restricted for your role ({operatorRole}).
                    </span>
                  </div>
                )}
                {wingFeedback && (
                  <div
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium border ${
                      wingFeedback.type === 'ok'
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    {wingFeedback.type === 'ok' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{wingFeedback.text}</span>
                  </div>
                )}

                {/* Add Wing Form */}
                {canEditWings && (
                  <form
                    onSubmit={handleAddWingSubmit}
                    className="bg-[#101c31] border border-[#1d2e4c] rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span>Add New Wing</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={wingNameInput}
                        onChange={(e) => setWingNameInput(e.target.value)}
                        placeholder="Wing Name (e.g. Maintenance Wing)"
                        className="sm:col-span-2 bg-[#09111f] border border-[#1e3150] focus:border-emerald-500/60 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
                      />
                      <input
                        type="text"
                        value={wingShortInput}
                        onChange={(e) => setWingShortInput(e.target.value)}
                        placeholder="Short (e.g. MT WG)"
                        maxLength={24}
                        className="bg-[#09111f] border border-[#1e3150] focus:border-emerald-500/60 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 uppercase outline-none"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Wing</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Add Sqn/Unit Form */}
                {canEditWings && (
                  <form
                    onSubmit={handleAddUnitSubmit}
                    className="bg-[#101c31] border border-[#1d2e4c] rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Building2 className="w-4 h-4 text-sky-400" />
                      <span>Add Squadron / Unit</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        value={targetWingId}
                        onChange={(e) => setTargetWingId(e.target.value)}
                        className="bg-[#09111f] border border-[#1e3150] focus:border-emerald-500/60 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      >
                        {wings.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.shortName})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={unitNameInput}
                        onChange={(e) => setUnitNameInput(e.target.value)}
                        placeholder="Sqn / Unit Name (e.g. 205 SQN BAF)"
                        className="sm:col-span-2 bg-[#09111f] border border-[#1e3150] focus:border-emerald-500/60 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Sqn / Unit</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Existing Wings & Squadrons List */}
                <div className="space-y-3">
                  {wings.map((wing) => {
                    const isDefaultWing = wing.id === 'flying-wing';
                    return (
                      <div
                        key={wing.id}
                        className="bg-[#101c31] border border-[#1d2e4c] rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-xs sm:text-sm font-bold text-white truncate">
                              {wing.name}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#072a1d] border border-emerald-500/35 text-[10px] font-bold text-emerald-300">
                              {wing.shortName}
                            </span>
                            <span className="text-[11px] text-slate-400 tabular-nums">
                              ({wing.units.length} units)
                            </span>
                          </div>
                          {!isDefaultWing && canEditWings && (
                            <button
                              type="button"
                              onClick={() => onRequireAuth(() => onDeleteWing(wing.id))}
                              title={`Remove ${wing.name}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-950/70 text-rose-300 border border-rose-700/40 text-[11px] font-semibold cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove Wing</span>
                            </button>
                          )}
                        </div>

                        {wing.units.length === 0 ? (
                          <div className="text-xs text-slate-400 italic">
                            No Squadrons/Units assigned to this Wing yet.
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {wing.units.map((unitName) => {
                              const isCore = CORE_UNITS_SET.has(unitName.toLowerCase());
                              return (
                                <div
                                  key={`${wing.id}-${unitName}`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#09111f] border border-[#1e3150] text-xs text-slate-200"
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onOpenUnitState(unitName);
                                      onClose();
                                    }}
                                    className="hover:text-emerald-300 font-medium transition-colors cursor-pointer"
                                    title={`Open ${unitName}`}
                                  >
                                    {unitName}
                                  </button>
                                  {!isCore && canEditWings && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onRequireAuth(() =>
                                          onDeleteUnitFromWing(wing.id, unitName)
                                        )
                                      }
                                      title={`Remove ${unitName}`}
                                      className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* TAB: USER MANAGEMENT (DIRECTORY LIST OR USER PROFILE DETAILS) */}
            {activeTab === 'users' && (
              <>
                {selectedUser ? (
                  /* USER PROFILE DETAILS VIEW (MATCHING REFERENCE SCREENSHOT) */
                  <div className="space-y-4">
                    {/* Profile Top Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUserRef(null);
                            setIsEditingProfile(false);
                            setConfirmDeleteUserId(null);
                            setProfileFeedback(null);
                          }}
                          title="Back to User Directory"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#14233d] transition-colors cursor-pointer shrink-0"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="min-w-0">
                          <div className="text-sm sm:text-base font-extrabold tracking-wide text-white uppercase tabular-nums truncate">
                            BD/{selectedUser.bdNo || '-'}
                          </div>
                          <div className="text-xs font-semibold text-slate-300 truncate">
                            {selectedUser.rank} {selectedUser.name}
                          </div>
                        </div>
                      </div>

                      {canEditUsers && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditingProfile) {
                                setIsEditingProfile(false);
                                setProfileFeedback(null);
                              } else {
                                startEditingProfile(selectedUser);
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                              isEditingProfile
                                ? 'bg-[#16233b] border-slate-600 text-slate-200 hover:bg-[#1e3050]'
                                : 'bg-[#072a1d] hover:bg-[#093827] border-emerald-500/40 text-emerald-300'
                            }`}
                          >
                            <Settings className="w-3.5 h-3.5" />
                            <span>{isEditingProfile ? 'Cancel Edit' : 'Edit Profile'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirmDeleteUserId !== selectedUser.id) {
                                setConfirmDeleteUserId(selectedUser.id);
                              } else {
                                onRequireAuth(() => {
                                  const removedLabel = `${selectedUser.rank} ${selectedUser.name}`;
                                  const removedUnit = selectedUser.unit;
                                  onDeleteAirmanFromSettings(removedUnit, selectedUser.id);
                                  setConfirmDeleteUserId(null);
                                  setSelectedUserRef(null);
                                  setIsEditingProfile(false);
                                  setUserActionFeedback({
                                    type: 'ok',
                                    text: `Removed ${removedLabel} from ${removedUnit}.`,
                                  });
                                });
                              }
                            }}
                            title={
                              confirmDeleteUserId === selectedUser.id
                                ? 'Click again to confirm delete'
                                : `Remove ${selectedUser.rank} ${selectedUser.name}`
                            }
                            className={`inline-flex items-center gap-1.5 p-2 rounded-xl border transition-colors cursor-pointer ${
                              confirmDeleteUserId === selectedUser.id
                                ? 'bg-rose-600 text-white border-rose-500 px-3 text-xs font-bold'
                                : 'bg-rose-950/40 hover:bg-rose-950/70 border-rose-700/45 text-rose-400'
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
                            {confirmDeleteUserId === selectedUser.id && <span>Confirm Delete</span>}
                          </button>
                        </div>
                      )}
                    </div>

                    {profileFeedback && (
                      <div
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium border ${
                          profileFeedback.type === 'ok'
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                            : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                        }`}
                      >
                        {profileFeedback.type === 'ok' ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0" />
                        )}
                        <span>{profileFeedback.text}</span>
                      </div>
                    )}

                    {/* Profile Details Card */}
                    {isEditingProfile && canEditUsers ? (
                      <form
                        onSubmit={handleSaveProfileSubmit}
                        className="bg-[#091223] border border-emerald-500/40 rounded-2xl p-5 space-y-5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-sm font-bold text-white">
                            <UserCog className="w-4 h-4 text-emerald-400" />
                            <span>
                              Edit Profile Details{isOwner ? ', Role & Admin PIN' : ' & Admin PIN'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                              USER ID (6-Digit BD No)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={editBdNo}
                              onChange={(e) =>
                                setEditBdNo(e.target.value.replace(/\D/g, '').slice(0, 6))
                              }
                              className="w-full bg-[#060d1b] border border-[#1e3150] focus:border-emerald-500/60 rounded-xl px-3 py-2 text-xs font-semibold text-white tabular-nums outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                              RANK
                            </label>
                            <select
                              value={editRank}
                              onChange={(e) => setEditRank(e.target.value as Rank)}
                              className="w-full bg-[#060d1b] border border-[#1e3150] focus:border-emerald-500/60 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none"
                            >
                              {BAF_ALL_RANKS.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                              NAME
                            </label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full bg-[#060d1b] border border-[#1e3150] focus:border-emerald-500/60 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                              TRADE
                            </label>
                            <input
                              type="text"
                              value={editTrade}
                              onChange={(e) => setEditTrade(e.target.value)}
                              placeholder="e.g. E&I Fitt"
                              list="settings-edit-trades"
                              className="w-full bg-[#060d1b] border border-[#1e3150] focus:border-emerald-500/60 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none"
                            />
                            <datalist id="settings-edit-trades">
                              {BAF_TRADES.map((t) => (
                                <option key={`dl-tr-${t}`} value={t} />
                              ))}
                            </datalist>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                              FLIGHT
                            </label>
                            <input
                              type="text"
                              value={editFlight}
                              onChange={(e) => setEditFlight(e.target.value)}
                              placeholder="e.g. Avionics"
                              list="settings-edit-flights"
                              className="w-full bg-[#060d1b] border border-[#1e3150] focus:border-emerald-500/60 rounded-xl px-3 py-2 text-xs font-semibold text-white outline-none"
                            />
                            <datalist id="settings-edit-flights">
                              {distinctFlights.map((fl) => (
                                <option key={`dl-fl-${fl}`} value={fl} />
                              ))}
                            </datalist>
                          </div>
                        </div>

                        <div className="border-t border-[#182844] pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                              SYSTEM ROLE {!isOwner && <span className="text-amber-400">(Owner Only)</span>}
                            </label>
                            <select
                              value={editRole}
                              disabled={!isOwner}
                              onChange={(e) => setEditRole(e.target.value as UserRole)}
                              className="w-full bg-[#060d1b] border border-[#1e3150] focus:border-emerald-500/60 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="USER">USER</option>
                              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                              <option value="OWNER">OWNER</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                              ADMIN LOGIN PORTAL PIN
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={12}
                                value={editAdminPin}
                                onChange={(e) =>
                                  setEditAdminPin(e.target.value.replace(/\s/g, '').slice(0, 12))
                                }
                                placeholder="e.g. 1124 (blank = no PIN)"
                                className="flex-1 bg-[#060d1b] border border-[#1e3150] focus:border-emerald-500/60 rounded-xl px-3 py-2 text-xs font-bold text-white tabular-nums outline-none"
                              />
                              {editAdminPin && (
                                <button
                                  type="button"
                                  onClick={() => setEditAdminPin('')}
                                  className="px-2.5 py-2 rounded-xl bg-[#14233d] hover:bg-[#1b2e4f] text-slate-300 text-[11px] font-semibold cursor-pointer"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingProfile(false);
                              setProfileFeedback(null);
                            }}
                            className="px-4 py-2 rounded-xl bg-[#14233d] hover:bg-[#1b2e4f] text-slate-300 text-xs font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00b853] hover:bg-[#00a349] text-slate-950 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Changes</span>
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="bg-[#091223] border border-[#1d2e4c] rounded-2xl p-5 space-y-5">
                        <div className="flex items-center gap-2 text-sm font-bold text-white">
                          <UserCog className="w-4 h-4 text-emerald-400" />
                          <span>Profile Details</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              USER ID
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-white tabular-nums mt-0.5">
                              {selectedUser.bdNo || '-'}
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              RANK
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                              {selectedUser.rank}
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              NAME
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                              {selectedUser.name}
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              TRADE
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                              {selectedUser.trade || '-'}
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              FLIGHT
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-white mt-0.5">
                              {selectedUser.flight || '-'}
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              SQN / UNIT
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                onOpenUnitNominalRoll(selectedUser.unit);
                                onClose();
                              }}
                              title={`Open ${selectedUser.unit} Nominal Roll`}
                              className="text-xs sm:text-sm font-bold text-sky-300 hover:text-sky-200 hover:underline mt-0.5 cursor-pointer text-left"
                            >
                              {selectedUser.unit}
                            </button>
                          </div>

                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              WING
                            </div>
                            <div className="text-xs sm:text-sm font-bold text-emerald-300 mt-0.5">
                              {getWingForUnit(selectedUser.unit)?.shortName ||
                                getWingForUnit(selectedUser.unit)?.name ||
                                'FLG WG'}
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-[#182844] pt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              SYSTEM ROLE
                            </div>
                            <div className="text-xs sm:text-sm font-extrabold text-white uppercase mt-0.5">
                              {selectedUser.role || 'USER'}
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              ADMIN LOGIN PORTAL PIN
                            </div>
                            <div className="text-xs sm:text-sm font-extrabold text-white tabular-nums mt-0.5">
                              {selectedUser.adminPin ? selectedUser.adminPin : 'Not Set'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bottom Close Button */}
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUserRef(null);
                          setIsEditingProfile(false);
                          setConfirmDeleteUserId(null);
                          setProfileFeedback(null);
                        }}
                        className="px-5 py-2 rounded-xl bg-[#16233b] hover:bg-[#1e3050] text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ) : (
                  /* USER DIRECTORY TABLE VIEW (WITHOUT STATUS & ACTIONS COLUMNS) */
                  <>
                    {/* Top Directory Header Bar */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="shrink-0">
                        <div className="text-sm sm:text-base font-extrabold tracking-wide text-white uppercase leading-tight">
                          USER DIRECTORY
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 tabular-nums">
                          Manage {allUsers.length} total users
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[130px] sm:w-36 sm:flex-none">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={userQuery}
                            onChange={(e) => setUserQuery(e.target.value)}
                            placeholder="Search ID, Name..."
                            className="w-full bg-[#09111f] border border-[#1e3150] focus:border-emerald-500/60 rounded-lg pl-8 pr-2.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none"
                          />
                        </div>

                        <select
                          value={userUnitFilter}
                          onChange={(e) => setUserUnitFilter(e.target.value)}
                          aria-label="Filter by Sqn/Unit"
                          className="bg-[#09111f] border border-[#1e3150] rounded-lg px-2 py-2 text-xs text-slate-100 outline-none"
                        >
                          <option value="ALL">All Units</option>
                          {allConfiguredUnits.map((unitName) => (
                            <option key={`f-u-${unitName}`} value={unitName}>
                              {unitName}
                            </option>
                          ))}
                        </select>

                        <select
                          value={userFlightFilter}
                          onChange={(e) => setUserFlightFilter(e.target.value)}
                          aria-label="Filter by Flight"
                          className="bg-[#09111f] border border-[#1e3150] rounded-lg px-2 py-2 text-xs text-slate-100 outline-none"
                        >
                          <option value="ALL">All Flights</option>
                          {distinctFlights.map((fl) => (
                            <option key={`f-fl-${fl}`} value={fl}>
                              {fl}
                            </option>
                          ))}
                        </select>

                        <select
                          value={userRoleFilter}
                          onChange={(e) => setUserRoleFilter(e.target.value)}
                          aria-label="Filter by Role"
                          className="bg-[#09111f] border border-[#1e3150] rounded-lg px-2 py-2 text-xs text-slate-100 outline-none"
                        >
                          <option value="ALL">All Roles</option>
                          <option value="OWNER">OWNER</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                          <option value="USER">USER</option>
                        </select>

                        {canEditUsers && (
                          <button
                            type="button"
                            onClick={() => setShowAddUserForm((p) => !p)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#00b853] hover:bg-[#00a349] text-slate-950 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Add New User</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {userActionFeedback && (
                      <div
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium border ${
                          userActionFeedback.type === 'ok'
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                            : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                        }`}
                      >
                        {userActionFeedback.type === 'ok' ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0" />
                        )}
                        <span>{userActionFeedback.text}</span>
                      </div>
                    )}

                    {/* Inline Add New User Form */}
                    {showAddUserForm && (
                      <form
                        onSubmit={handleAddUserSubmit}
                        className="bg-[#101c31] border border-emerald-500/40 rounded-xl p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">
                            Add New User to Directory &amp; Nominal Roll
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowAddUserForm(false)}
                            className="text-slate-400 hover:text-white cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                              Sqn / Unit
                            </label>
                            <select
                              value={newUserUnit}
                              onChange={(e) => setNewUserUnit(e.target.value)}
                              className="w-full bg-[#09111f] border border-[#1e3150] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                            >
                              {allConfiguredUnits.map((unitName) => (
                                <option key={`add-u-${unitName}`} value={unitName}>
                                  {unitName}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                              Rank
                            </label>
                            <select
                              value={newUserRank}
                              onChange={(e) => setNewUserRank(e.target.value as Rank)}
                              className="w-full bg-[#09111f] border border-[#1e3150] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                            >
                              {BAF_ALL_RANKS.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                              USER ID (6-Digit BD No)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={6}
                              value={newUserBdNo}
                              onChange={(e) =>
                                setNewUserBdNo(e.target.value.replace(/\D/g, '').slice(0, 6))
                              }
                              placeholder="e.g. 474455"
                              className="w-full bg-[#09111f] border border-[#1e3150] rounded-lg px-2.5 py-1.5 text-xs text-white tabular-nums outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={newUserName}
                              onChange={(e) => setNewUserName(e.target.value)}
                              placeholder="e.g. Rasel"
                              className="w-full bg-[#09111f] border border-[#1e3150] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                              Trade
                            </label>
                            <select
                              value={newUserTrade}
                              onChange={(e) => setNewUserTrade(e.target.value)}
                              className="w-full bg-[#09111f] border border-[#1e3150] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                            >
                              {BAF_TRADES.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                              Flight
                            </label>
                            <select
                              value={newUserFlight}
                              onChange={(e) => setNewUserFlight(e.target.value)}
                              className="w-full bg-[#09111f] border border-[#1e3150] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                            >
                              {BAF_FLIGHTS.map((f) => (
                                <option key={f} value={f}>
                                  {f}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                              Role {!isOwner && <span className="text-amber-400">(Owner Only)</span>}
                            </label>
                            <select
                              value={isOwner ? newUserRole : 'USER'}
                              disabled={!isOwner}
                              onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                              className="w-full bg-[#09111f] border border-[#1e3150] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none disabled:opacity-50"
                            >
                              <option value="USER">USER</option>
                              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                              <option value="OWNER">OWNER</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                              Admin Login Portal PIN (Optional)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={12}
                              value={newUserAdminPin}
                              onChange={(e) =>
                                setNewUserAdminPin(e.target.value.replace(/\s/g, '').slice(0, 12))
                              }
                              placeholder="Optional PIN (e.g. 1124)"
                              className="w-full bg-[#09111f] border border-[#1e3150] rounded-lg px-2.5 py-1.5 text-xs text-white tabular-nums outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAddUserForm(false)}
                            className="px-3 py-1.5 rounded-lg bg-[#14233d] text-slate-300 text-xs font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                          >
                            Save User
                          </button>
                        </div>
                      </form>
                    )}

                    {/* User Directory Table (6 columns: SER NO, USER ID, NAME, SQN/UNIT, WING, ROLE) */}
                    <div className="border border-[#1d2e4c] rounded-xl bg-[#0b1526] overflow-x-auto">
                      <table className="w-full text-center border-collapse min-w-[600px]">
                        <thead>
                          <tr className="bg-[#121f36] border-b border-[#1d2e4c] text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="py-3 px-3">SER NO</th>
                            <th className="py-3 px-3">USER ID</th>
                            <th className="py-3 px-3">NAME</th>
                            <th className="py-3 px-3">SQN/UNIT</th>
                            <th className="py-3 px-3">WING</th>
                            <th className="py-3 px-3">ROLE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#17253e] text-xs">
                          {filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-8 text-slate-400">
                                No matching users found in Directory.
                              </td>
                            </tr>
                          ) : (
                            filteredUsers.map((user, idx) => {
                              const userRole: UserRole = user.role || 'USER';
                              const wingInfo = getWingForUnit(user.unit);
                              const wingDisplay = wingInfo?.shortName || wingInfo?.name || 'FLG WG';
                              const roleBadgeStyle =
                                userRole === 'OWNER'
                                  ? 'bg-purple-600/30 border-purple-500/50 text-purple-300'
                                  : userRole === 'SUPER_ADMIN'
                                    ? 'bg-amber-700/35 border-amber-500/50 text-amber-300'
                                    : 'bg-[#1a2742] border-[#2c3f66] text-slate-300';

                              return (
                                <tr
                                  key={user.id}
                                  onClick={() => openUserProfile(user)}
                                  title="Click to view or edit Role & Admin Login PIN"
                                  className="hover:bg-[#101e35] transition-colors cursor-pointer"
                                >
                                  <td className="py-3 px-3 text-slate-400 tabular-nums font-medium">
                                    {idx + 1}
                                  </td>
                                  <td className="py-3 px-3 font-bold text-white tabular-nums">
                                    {user.bdNo || '-'}
                                  </td>
                                  <td className="py-3 px-3 font-medium text-slate-200 whitespace-nowrap">
                                    {user.rank} {user.name}
                                  </td>
                                  <td className="py-3 px-3 font-semibold text-sky-300 whitespace-nowrap">
                                    {user.unit}
                                  </td>
                                  <td className="py-3 px-3 font-semibold text-emerald-300 whitespace-nowrap">
                                    {wingDisplay}
                                  </td>
                                  <td className="py-3 px-3">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded border text-[10px] font-bold tracking-wide uppercase ${roleBadgeStyle}`}
                                    >
                                      {userRole}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}

            {/* TAB: ACCESS CONTROL (OWNER-ONLY ROLE LIMITATION SWITCHES) */}
            {activeTab === 'permissions' && (
              <div className="space-y-4">
                <div
                  className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs ${
                    isOwner
                      ? 'bg-[#082218] border-emerald-500/40 text-emerald-200'
                      : 'bg-amber-950/35 border-amber-500/40 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isOwner ? (
                      <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold">
                        {isOwner
                          ? 'Owner Access Control Unlocked (BD/474455 Authority)'
                          : `Owner-Only Controls Locked (${operatorRole})`}
                      </div>
                      <div className="text-[11px] opacity-85 mt-0.5">
                        {isOwner
                          ? 'Toggle Switch On/Off to set exact feature limitations for each role. OWNER always keeps unrestricted access.'
                          : 'Only an account with OWNER role can modify role access limitations.'}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-purple-600/30 border border-purple-500/50 text-[10px] font-extrabold text-purple-200 uppercase tracking-wider">
                    OWNER: Full Access
                  </span>
                </div>

                {/* Role selector tabs & presets */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#101c31] border border-[#1d2e4c] rounded-xl p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'SUPER_ADMIN' as const, label: 'SUPER_ADMIN', badge: 'amber' },
                        { id: 'USER' as const, label: 'USER', badge: 'slate' },
                        { id: 'GUEST' as const, label: 'GUEST', badge: 'sky' },
                      ] as const
                    ).map((rTab) => {
                      const isSel = selectedPermRole === rTab.id;
                      const enabledCount = ALL_PERMISSION_KEYS.filter(
                        (k) => rolePermissions[rTab.id]?.[k]
                      ).length;
                      return (
                        <button
                          key={rTab.id}
                          type="button"
                          onClick={() => {
                            setSelectedPermRole(rTab.id);
                            setPermFeedback(null);
                          }}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                            isSel
                              ? 'bg-[#161f3d] border-indigo-500/60 text-white shadow-sm'
                              : 'bg-[#09111f] border-[#1e3150] text-slate-400 hover:text-white'
                          }`}
                        >
                          <span>{rTab.label}</span>
                          <span className="px-1.5 py-0.5 rounded bg-black/35 text-[10px] tabular-nums text-emerald-300">
                            {enabledCount}/{ALL_PERMISSION_KEYS.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {isOwner && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleApplyPermissionPreset('all')}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold cursor-pointer"
                      >
                        Switch All On
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPermissionPreset('viewOnly')}
                        className="px-2.5 py-1.5 rounded-lg bg-[#0c172b] hover:bg-[#142544] border border-[#243b61] text-slate-200 text-[11px] font-bold cursor-pointer"
                      >
                        View Only
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPermissionPreset('default')}
                        className="px-2.5 py-1.5 rounded-lg bg-[#0c172b] hover:bg-[#142544] border border-[#243b61] text-slate-300 text-[11px] font-bold cursor-pointer"
                      >
                        Reset Default
                      </button>
                    </div>
                  )}
                </div>

                {permFeedback && (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{permFeedback}</span>
                  </div>
                )}

                {/* Permission Switch Groups */}
                <div className="space-y-3">
                  {PERMISSION_GROUPS.map((group) => (
                    <div
                      key={group.title}
                      className="bg-[#101c31] border border-[#1d2e4c] rounded-xl overflow-hidden"
                    >
                      <div className="px-4 py-3 bg-[#0d1729] border-b border-[#182844]">
                        <div className="text-xs font-bold text-white">{group.title}</div>
                        <div className="text-[11px] text-slate-400">{group.subtitle}</div>
                      </div>
                      <div className="divide-y divide-[#17253e]">
                        {group.items.map((item) => {
                          const enabled = Boolean(rolePermissions[selectedPermRole]?.[item.key]);
                          return (
                            <div
                              key={item.key}
                              className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-[#122039]/60 transition-colors"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-white">
                                  {item.label}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {item.desc}
                                </div>
                              </div>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={enabled}
                                aria-label={`Toggle ${item.label} for ${selectedPermRole}`}
                                disabled={!isOwner}
                                onClick={() => handleToggleRolePermission(item.key)}
                                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
                                  isOwner ? 'cursor-pointer' : 'cursor-not-allowed opacity-55'
                                } ${
                                  enabled
                                    ? 'bg-emerald-500 border-emerald-400'
                                    : 'bg-[#09111f] border-[#263c63]'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                    enabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: LOGIN HISTORY */}
            {activeTab === 'history' && (
              <>
                <div className="bg-[#101c31] border border-[#1d2e4c] rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                    <span>Currently Active (1)</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#072a1d] border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                    {operator
                      ? `${operator.rank} ${operator.name} - (Portal)${operator.flight ? ` - ${operator.flight}` : ''}`
                      : 'Guest Session - (Portal) - View Only'}
                  </div>
                </div>

                {/* Search + Refresh + Clear */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={historyQuery}
                      onChange={(e) => setHistoryQuery(e.target.value)}
                      placeholder="Search logs by BD No, Name, Rank, Flight..."
                      className="w-full bg-[#09111f] border border-[#1e3150] focus:border-emerald-500/60 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshHistory}
                    disabled={isRefreshingHistory}
                    title="Refresh Login History from Cloud"
                    className="p-2 rounded-xl bg-[#101c31] hover:bg-[#172845] border border-[#1e3150] text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${isRefreshingHistory ? 'animate-spin' : ''}`}
                    />
                  </button>
                  {canEditCloudAndNotice && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirmClearHistory) {
                          setConfirmClearHistory(true);
                        } else {
                          onRequireAuth(() => {
                            onClearLoginHistory();
                            setConfirmClearHistory(false);
                          });
                        }
                      }}
                      title={
                        confirmClearHistory ? 'Click again to confirm clear' : 'Clear Login History'
                      }
                      className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                        confirmClearHistory
                          ? 'bg-rose-600 text-white border-rose-500'
                          : 'bg-rose-950/30 hover:bg-rose-950/60 border-rose-700/40 text-rose-400'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {confirmClearHistory && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-rose-950/40 border border-rose-700/40 text-xs text-rose-200">
                    <span>Click trash icon again to clear all login history.</span>
                    <button
                      type="button"
                      onClick={() => setConfirmClearHistory(false)}
                      className="text-slate-300 hover:text-white underline cursor-pointer ml-2"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {filteredHistory.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 bg-[#0a1322] border border-[#18263f] rounded-xl">
                    No login history recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-[#101c31] border border-[#1c2d4b] hover:border-[#2a426b] rounded-xl px-4 py-3 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-white truncate">
                              {entry.rank ? `${entry.rank} ` : ''}
                              {entry.name}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#182742] border border-[#283f69] text-[10px] font-bold text-slate-200 uppercase tracking-wide">
                              {entry.mode}
                            </span>
                            {entry.trade && (
                              <span className="px-2 py-0.5 rounded bg-[#142036] border border-[#223557] text-[10px] font-medium text-slate-300">
                                {entry.trade}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-emerald-400 tabular-nums">
                            {entry.bdNo === 'GUEST' ? 'GUEST ACCESS' : `BD/${entry.bdNo}`}
                            {entry.flight ? ` • ${entry.flight}` : ''}
                          </div>
                          <div className="text-[11px] text-slate-400 tabular-nums">
                            {entry.displayTime}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* TAB: DATABASE CLOUD SYNC */}
            {activeTab === 'sync' && (
              <div className="space-y-4">
                {!canEditCloudAndNotice && (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium border bg-amber-950/35 border-amber-500/35 text-amber-200">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Cloud Sync actions are restricted for your role ({operatorRole}).</span>
                  </div>
                )}
                <div className="bg-[#101c31] border border-[#1d2e4c] rounded-xl p-4 space-y-2">
                  <div className="text-xs font-bold text-white">Firestore Cloud Synchronization</div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Night Count changes for{' '}
                    <span className="text-emerald-400 font-semibold">{dayState.date}</span>{' '}
                    automatically sync to Firebase Firestore within 8 seconds. Use the controls
                    below for immediate manual upload or refresh from Cloud.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleUploadSync}
                    disabled={isSyncing || !canEditCloudAndNotice}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    <CloudUpload className="w-4 h-4" />
                    <span>{isSyncing ? 'Syncing...' : 'Upload & Sync Now'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePullSync}
                    disabled={isSyncing || !canEditCloudAndNotice}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#13223a] hover:bg-[#1a2e4f] text-slate-100 border border-[#243b61] text-xs font-bold transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    <CloudDownload className="w-4 h-4 text-sky-400" />
                    <span>{isSyncing ? 'Fetching...' : 'Refresh from Cloud'}</span>
                  </button>
                </div>

                {syncFeedback && (
                  <div
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium border ${
                      syncFeedback.type === 'ok'
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    {syncFeedback.type === 'ok' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{syncFeedback.text}</span>
                  </div>
                )}
              </div>
            )}

            {/* TAB: APP NOTICE */}
            {activeTab === 'notice' && (
              <div className="space-y-4">
                {!canEditCloudAndNotice && (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium border bg-amber-950/35 border-amber-500/35 text-amber-200">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Editing App Notice is restricted for your role ({operatorRole}).</span>
                  </div>
                )}
                <div className="bg-[#101c31] border border-[#1d2e4c] rounded-xl p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-white mb-1">
                      Unit / Wing Notice Banner
                    </label>
                    <p className="text-[11px] text-slate-400">
                      Displays a shared notice banner across the top of the Night Count workspace
                      for all duty personnel (synced via Cloud).
                    </p>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={500}
                    disabled={!canEditCloudAndNotice}
                    value={noticeDraft}
                    onChange={(e) => setNoticeDraft(e.target.value)}
                    placeholder="Enter operational notice (leave empty to hide banner)..."
                    className="w-full bg-[#09111f] border border-[#1e3150] focus:border-emerald-500/60 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none resize-none disabled:opacity-60"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      {noticeDraft.length}/500
                    </span>
                    {canEditCloudAndNotice && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleClearNoticeClick}
                          className="px-3 py-1.5 rounded-lg bg-[#14223a] hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-[#22375a] text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Clear Notice
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveNoticeClick}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          Save Notice
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {noticeSavedFeedback && (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Notice updated and scheduled for Cloud sync.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
