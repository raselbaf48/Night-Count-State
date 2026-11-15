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
  ChevronDown,
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
  Edit3,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  Airman,
  DayState,
  LoginHistoryEntry,
  OperatorProfile,
  PermissionLevel,
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
  canManageRolePermission,
  findExistingBdConflict,
  getAllAirmenAcrossUnits,
  getAllConfiguredUnits,
  getRolePermissionLevel,
  hasRolePermission,
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
  isGuestView?: boolean;
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
  onAddUnitToWing: (wingId: string, unitName: string) => { ok: boolean; error?: string };
  onUpdateUnitConfig: (
    oldWingId: string,
    oldUnitName: string,
    newWingId: string,
    newUnitName: string
  ) => { ok: boolean; error?: string };
  onDeleteUnitFromWing: (wingId: string, unitName: string) => void;
  onOpenUnitNominalRoll: (unitName: string) => void;
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
  restrictedUnitName?: string;
}

const CORE_UNITS_SET = new Set(FLYING_WING_SQUADRONS.map((u) => u.toLowerCase()));

const NAV_ITEMS: {
  id: SettingsTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permKey: RolePermissionKey;
}[] = [
  { id: 'theme', label: 'Theme & Appearance', icon: Palette, permKey: 'settingsTheme' },
  { id: 'wings', label: 'Wings & Units', icon: Building2, permKey: 'manageWingsAndUnits' },
  { id: 'users', label: 'User Management', icon: Users, permKey: 'manageUsers' },
  { id: 'permissions', label: 'Access Control', icon: Lock, permKey: 'settingsPermissions' },
  { id: 'history', label: 'Login History', icon: History, permKey: 'settingsHistory' },
  { id: 'sync', label: 'Database Cloud Sync', icon: Database, permKey: 'manageCloudAndNotice' },
  { id: 'notice', label: 'App Notice', icon: Megaphone, permKey: 'settingsNotice' },
];

interface PermissionChildNode {
  key: RolePermissionKey;
  label: string;
  desc: string;
  allowedLevels: PermissionLevel[];
}

interface PermissionMenuNode {
  key: RolePermissionKey;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedLevels: PermissionLevel[];
  children: PermissionChildNode[];
}

const SIDEBAR_PERMISSION_TREE: PermissionMenuNode[] = [
  {
    key: 'menuOverview',
    label: 'Overview (Wing Consolidated)',
    desc: 'Sidebar Overview section for Wing Consolidated State, Prepared By, Export & Logs',
    icon: Shield,
    allowedLevels: ['hide', 'view', 'manage'],
    children: [
      {
        key: 'viewConsolidatedState',
        label: 'Consolidated Wing State',
        desc: 'Wing consolidated summary table & strength forecast',
        allowedLevels: ['hide', 'view', 'manage'],
      },
      {
        key: 'editQuickSqnCount',
        label: 'Quick Edit Sqn Count',
        desc: 'Quick edit squadron strength & disposal counts from Consolidated table',
        allowedLevels: ['hide', 'view', 'manage'],
      },
      {
        key: 'editPreparedBy',
        label: 'Prepared By Signature',
        desc: 'View or edit Prepared By signature block below Consolidated State',
        allowedLevels: ['hide', 'view', 'manage'],
      },
      {
        key: 'exportPrintReport',
        label: 'Print & Export (Doc / JPG)',
        desc: 'View = Print Preview & Print only; Manage = Full Print, Export Doc & JPG',
        allowedLevels: ['hide', 'view', 'manage'],
      },
      {
        key: 'viewUpdateLog',
        label: 'Wing State Update Log',
        desc: 'View audit log showing who updated Consolidated Wing state',
        allowedLevels: ['hide', 'view'],
      },
    ],
  },
  {
    key: 'menuSquadrons',
    label: 'Squadrons / Units',
    desc: 'Sidebar Squadrons / Units section for individual Sqn Night Count State & Nominal Roll',
    icon: Building2,
    allowedLevels: ['hide', 'view', 'manage'],
    children: [
      {
        key: 'viewUnitDetails',
        label: 'Unit Night Count State',
        desc: 'Open individual Squadron/Unit Night Count detail tables',
        allowedLevels: ['hide', 'view', 'manage'],
      },
      {
        key: 'editUnitDisposals',
        label: 'Unit Disposals & Remarks',
        desc: 'Toggle parade status, clear disposals & edit unit remarks',
        allowedLevels: ['hide', 'view', 'manage'],
      },
      {
        key: 'manageNominalRoll',
        label: 'Nominal Roll (Add / Edit / Disposal)',
        desc: 'View Nominal Roll or Add/Import/Edit airmen & assign disposals',
        allowedLevels: ['hide', 'view', 'manage'],
      },
      {
        key: 'deleteNominalRollAirman',
        label: 'Delete Airman from Nominal Roll',
        desc: 'Remove airman entries from a Squadron Nominal Roll',
        allowedLevels: ['hide', 'view', 'manage'],
      },
      {
        key: 'viewUnitUpdateLog',
        label: 'Unit Update Log',
        desc: 'View per-unit Update Log tab inside Squadron/Unit views',
        allowedLevels: ['hide', 'view'],
      },
    ],
  },
  {
    key: 'accessSettings',
    label: 'Settings',
    desc: 'Sidebar Settings menu & sub-pages (Theme, Wings, Users, Access Control, Sync, Notice)',
    icon: Settings,
    allowedLevels: ['hide', 'view', 'manage'],
    children: [
      {
        key: 'settingsTheme',
        label: 'Theme & Appearance',
        desc: 'View or switch between System, Light & Dark themes',
        allowedLevels: ['hide', 'view', 'manage'],
      },
      {
        key: 'manageWingsAndUnits',
        label: 'Wings & Units',
        desc: 'View wings/units or Manage (Add / Rename / Remove units)',
        allowedLevels: ['hide', 'view', 'manage'],
      },
      {
        key: 'manageUsers',
        label: 'User Management',
        desc: 'View User Directory or Add / Edit Profile / PIN / Remove users',
        allowedLevels: ['hide', 'view', 'manage'],
      },
      {
        key: 'settingsPermissions',
        label: 'Access Control',
        desc: 'View role access rules (Editing always stays Owner-only)',
        allowedLevels: ['hide', 'view'],
      },
      {
        key: 'settingsHistory',
        label: 'Login History',
        desc: 'View Login History or Clear history records',
        allowedLevels: ['hide', 'view', 'manage'],
      },
      {
        key: 'manageCloudAndNotice',
        label: 'Database Cloud Sync',
        desc: 'View/Refresh Cloud status or Upload & Sync state to Cloud',
        allowedLevels: ['hide', 'view', 'manage'],
      },
      {
        key: 'settingsNotice',
        label: 'App Notice',
        desc: 'View current operational notice or Publish / Clear App Notice',
        allowedLevels: ['hide', 'view', 'manage'],
      },
    ],
  },
];

type ConfigurableRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'GUEST';

const ROLE_ACCESS_GUIDE: Record<
  ConfigurableRole,
  {
    headline: string;
    scopeBadge: string;
    plainSummary: string;
    workflowSteps: string[];
  }
> = {
  USER: {
    headline: 'USER — শুধুমাত্র নিজের অফিসের Nominal Roll Manage',
    scopeBadge: 'Own Office Nominal Roll Only',
    plainSummary:
      'User শুধুমাত্র নিজের অফিস/Sqn-এর Nominal Roll ম্যানেজ করতে পারবে (Add, Edit ও Disposal আপডেট)। নিজের Wing-এর Consolidated State শুধু দেখতে ও প্রিন্ট করতে পারবে, তবে Quick Edit Sqn Count বা অন্য অফিসের কোনো ডেটা অ্যাক্সেস করতে পারবে না।',
    workflowSteps: [
      'Own Office Only: শুধু নিজের Sqn/Unit-এর Nominal Roll-এ Airman Add/Edit ও Disposal দিতে পারবে।',
      'Overview View-Only: নিজের Wing-এর Consolidated State ও Update Log শুধু দেখতে ও Print/Export করতে পারবে।',
      'No Cross-Office / Quick Edit: অন্য অফিসের State, Quick Edit Sqn Count, Prepared By বা Admin সেটিংস লুকানো থাকবে।',
    ],
  },
  ADMIN: {
    headline: 'ADMIN — নিজের অফিসের Nominal Roll + নিজের Wing-এর Quick Edit Sqn Count',
    scopeBadge: 'Own Office Nominal Roll + Own Wing Quick Edit',
    plainSummary:
      'Admin নিজের অফিস/Sqn-এর Nominal Roll ম্যানেজ করতে পারবে এবং পাশাপাশি নিজের Wing-এর সব Sqn/Unit-এর Quick Edit Sqn Count করতে পারবে। নিজের Wing-এর অন্যান্য অফিসের State দেখতে পারবে, কিন্তু অন্য অফিসের Nominal Roll এডিট করতে পারবে না।',
    workflowSteps: [
      'Own Office Nominal Roll: শুধু নিজের অফিসের Nominal Roll (Add, Edit, Delete ও Disposal) ম্যানেজ করতে পারবে।',
      'Own Wing Quick Edit Sqn Count: নিজের Wing-এর Consolidated State থেকে যেকোনো Sqn-এর Quick Edit Count করতে পারবে।',
      'Other Wing Squadrons View-Only: নিজের Wing-এর অন্য Sqn-এর State/Nominal Roll শুধু দেখতে পারবে (অন্য Wing ও অন্য অফিসের Nominal Roll এডিট লক থাকবে)।',
    ],
  },
  SUPER_ADMIN: {
    headline: 'SUPER_ADMIN — সকল Wing ও সকল Sqn/Unit পরিচালনা',
    scopeBadge: 'All Wings & All Units',
    plainSummary:
      'Super Admin সব Wing এবং সব Sqn/Unit-এর Consolidated State, Quick Edit Sqn Count, Nominal Roll, User Management, Cloud Sync ও App Notice ম্যানেজ করতে পারবে। শুধুমাত্র Access Control পরিবর্তন ও Role নির্ধারণ Owner-এর জন্য সংরক্ষিত।',
    workflowSteps: [
      'All Wings & Units: সকল Wing-এর Consolidated State ও সব Sqn-এর Nominal Roll পূর্ণ নিয়ন্ত্রণ।',
      'System Operations: Wings/Units, Users, Login History, Cloud Sync ও App Notice পরিচালনা।',
      'Owner Reserve: Access Control পরিবর্তন ও নতুন Role নির্ধারণ শুধুমাত্র Owner করতে পারবে।',
    ],
  },
  GUEST: {
    headline: 'GUEST — Format-Only Preview (ডেটাবিহীন ডেমো)',
    scopeBadge: 'Format Preview Only',
    plainSummary:
      'Guest মোডে লগইন করলে কোনো আসল পার্সোনেল ডেটা, BD নম্বর বা অফিস কাউন্ট দেখাবে না—শুধু অ্যাপের সব টেবিল ও প্রিন্ট ফরম্যাট দেখানো হবে যাতে যে কেউ সিস্টেমটি কীভাবে কাজ করে তা সহজে বুঝতে পারে।',
    workflowSteps: [
      'No Real Data Shown: কোনো Airman-এর নাম, BD বা অফিসের প্রকৃত সংখ্যা লোড বা প্রদর্শিত হয় না।',
      'Read-Only Preview: Consolidated State, Unit State ও Nominal Roll-এর কাঠামো ও Print ফরম্যাট দেখা যায়।',
    ],
  },
};

function getRolePermissionScopeHint(
  role: ConfigurableRole,
  key: RolePermissionKey
): string | null {
  if (role === 'USER') {
    if (
      key === 'manageNominalRoll' ||
      key === 'editUnitDisposals' ||
      key === 'deleteNominalRollAirman' ||
      key === 'viewUnitDetails' ||
      key === 'viewUnitUpdateLog' ||
      key === 'menuSquadrons'
    ) {
      return 'Own Office Only';
    }
    if (
      key === 'menuOverview' ||
      key === 'viewConsolidatedState' ||
      key === 'viewUpdateLog'
    ) {
      return 'Own Wing Only';
    }
  }
  if (role === 'ADMIN') {
    if (
      key === 'manageNominalRoll' ||
      key === 'editUnitDisposals' ||
      key === 'deleteNominalRollAirman'
    ) {
      return 'Own Office Only';
    }
    if (
      key === 'menuOverview' ||
      key === 'viewConsolidatedState' ||
      key === 'editQuickSqnCount' ||
      key === 'editPreparedBy' ||
      key === 'viewUpdateLog' ||
      key === 'menuSquadrons' ||
      key === 'viewUnitDetails' ||
      key === 'viewUnitUpdateLog'
    ) {
      return 'Own Wing Scope';
    }
  }
  return null;
}

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
  isGuestView = false,
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
  onAddUnitToWing,
  onUpdateUnitConfig,
  onDeleteUnitFromWing,
  onOpenUnitNominalRoll,
  onAddAirmanFromSettings,
  onDeleteAirmanFromSettings,
  onUpdateUserProfile,
  restrictedUnitName,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState<boolean>(initialTab !== 'theme');
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
  const [selectedPermRole, setSelectedPermRole] = useState<
    'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'GUEST'
  >('SUPER_ADMIN');
  const [expandedMenuGroups, setExpandedMenuGroups] = useState<Record<string, boolean>>({
    menuOverview: true,
    menuSquadrons: true,
    accessSettings: true,
  });
  const [permFeedback, setPermFeedback] = useState<string | null>(null);

  // Wings & Units state
  const [isWingManageMode, setIsWingManageMode] = useState(false);
  const [showAddUnitForm, setShowAddUnitForm] = useState(false);
  const [editingUnitRef, setEditingUnitRef] = useState<{
    wingId: string;
    unitName: string;
  } | null>(null);
  const [editUnitNameInput, setEditUnitNameInput] = useState('');
  const [editUnitWingId, setEditUnitWingId] = useState<string>(wings[0]?.id || 'flying-wing');
  const [targetWingId, setTargetWingId] = useState<string>(wings[0]?.id || 'flying-wing');
  const [selectedWingViewId, setSelectedWingViewId] = useState<string>(
    wings[0]?.id || 'flying-wing'
  );
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

  const isOwner = operatorRole === 'OWNER';
  const visibleNavItems = isOwner
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => hasRolePermission(operatorRole, item.permKey, rolePermissions));

  useEffect(() => {
    if (isOpen) {
      const nextInitialTab = visibleNavItems.some((n) => n.id === initialTab)
        ? initialTab
        : visibleNavItems[0]?.id || 'theme';
      setActiveTab(nextInitialTab);
      setIsMobileDetailOpen(nextInitialTab !== 'theme');
      setNoticeDraft(appNotice);
      setConfirmClearHistory(false);
      setConfirmDeleteUserId(null);
      setSelectedUserRef(null);
      setIsEditingProfile(false);
      setProfileFeedback(null);
      setSyncFeedback(null);
      setIsWingManageMode(false);
      setShowAddUnitForm(false);
      setEditingUnitRef(null);
      setWingFeedback(null);
      setUserActionFeedback(null);
      setNoticeSavedFeedback(false);
      setPermFeedback(null);
    }
    // Only reset modal state when opening or when initialTab/role changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialTab, operatorRole]);

  useEffect(() => {
    if (wings.length > 0) {
      if (!wings.some((w) => w.id === targetWingId)) {
        setTargetWingId(wings[0].id);
      }
      if (!wings.some((w) => w.id === selectedWingViewId)) {
        setSelectedWingViewId(wings[0].id);
      }
    }
  }, [wings, targetWingId, selectedWingViewId]);

  if (!isOpen) return null;

  const canEditTheme = isOwner || canManageRolePermission(operatorRole, 'settingsTheme', rolePermissions);
  const canEditUsers =
    !isGuestView &&
    (isOwner ||
      (canManageUsers && canManageRolePermission(operatorRole, 'manageUsers', rolePermissions)));
  const canEditWings =
    !isGuestView &&
    (isOwner ||
      (canManageWings &&
        canManageRolePermission(operatorRole, 'manageWingsAndUnits', rolePermissions)));
  const canClearHistory =
    !isGuestView &&
    (isOwner || canManageRolePermission(operatorRole, 'settingsHistory', rolePermissions));
  const canUploadCloudSync =
    !isGuestView &&
    (isOwner ||
      (canManageCloudAndNotice &&
        canManageRolePermission(operatorRole, 'manageCloudAndNotice', rolePermissions)));
  const canPullCloudSync =
    !isGuestView &&
    (isOwner || hasRolePermission(operatorRole, 'manageCloudAndNotice', rolePermissions));
  const canEditAppNotice =
    !isGuestView &&
    (isOwner || canManageRolePermission(operatorRole, 'settingsNotice', rolePermissions));

  const resolvedActiveTab: SettingsTabId | null = visibleNavItems.some((n) => n.id === activeTab)
    ? activeTab
    : visibleNavItems[0]?.id || null;
  const activeNav = resolvedActiveTab
    ? visibleNavItems.find((n) => n.id === resolvedActiveTab) || visibleNavItems[0]
    : null;
  const allConfiguredUnits = getAllConfiguredUnits(wings);

  const getWingForUnit = (unitName: string): WingConfig | undefined =>
    wings.find((w) => w.units.some((u) => u.toLowerCase() === unitName.toLowerCase()));

  // Overall Users aggregated across configured Squadrons / Units (scoped to unit for USER, or Wing for ADMIN)
  const rawAllUsers = getAllAirmenAcrossUnits(dayState, wings);
  const configuredUnitSet = new Set(allConfiguredUnits.map((u) => u.toLowerCase()));
  const allUsers = restrictedUnitName
    ? rawAllUsers.filter((u) => u.unit.toLowerCase() === restrictedUnitName.toLowerCase())
    : operatorRole === 'ADMIN'
      ? rawAllUsers.filter((u) => configuredUnitSet.has(u.unit.toLowerCase()))
      : rawAllUsers;
  const effectiveNewUserUnit = allConfiguredUnits.includes(newUserUnit)
    ? newUserUnit
    : allConfiguredUnits[0] || newUserUnit;
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
      setSelectedWingViewId(targetWingId);
      setShowAddUnitForm(false);
    });
  };

  const handleSaveEditUnitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnitRef) return;
    const cleanName = editUnitNameInput.trim();
    if (!cleanName) {
      setWingFeedback({ type: 'err', text: 'Please enter a Squadron / Unit name.' });
      return;
    }
    onRequireAuth(() => {
      const res = onUpdateUnitConfig(
        editingUnitRef.wingId,
        editingUnitRef.unitName,
        editUnitWingId,
        cleanName
      );
      if (!res.ok) {
        setWingFeedback({ type: 'err', text: res.error || 'Could not update Sqn/Unit.' });
        return;
      }
      const targetWingName = wings.find((w) => w.id === editUnitWingId)?.name || 'Wing';
      setWingFeedback({
        type: 'ok',
        text: `Updated "${cleanName}" under ${targetWingName} and synced to Cloud.`,
      });
      setSelectedWingViewId(editUnitWingId);
      setEditingUnitRef(null);
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
        unit: effectiveNewUserUnit,
        role: assignedRole,
        ...(cleanPin ? { adminPin: cleanPin } : {}),
        status: 'on_parade',
      });
      setUserActionFeedback({
        type: 'ok',
        text: `Added ${newUserRank} ${cleanName} (BD/${cleanBd}) to ${effectiveNewUserUnit}.`,
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

  const toggleExpandMenuGroup = (menuKey: RolePermissionKey) => {
    setExpandedMenuGroups((prev) => ({
      ...prev,
      [menuKey]: !(prev[menuKey] ?? true),
    }));
  };

  const handleSetPermissionLevel = (
    key: RolePermissionKey,
    level: PermissionLevel,
    parentKey?: RolePermissionKey
  ) => {
    if (!isOwner) return;
    const updatedRoleMap = { ...rolePermissions[selectedPermRole] };
    updatedRoleMap[key] = level;

    // Parent menu node synchronization
    const parentNode = SIDEBAR_PERMISSION_TREE.find((m) => m.key === key);
    if (parentNode) {
      if (level === 'view') {
        parentNode.children.forEach((child) => {
          if (updatedRoleMap[child.key] === 'manage') {
            updatedRoleMap[child.key] = 'view';
          }
        });
      } else if (level === 'manage') {
        // Ensure parent expansion opens so Owner can fine-tune sub-options if desired
        setExpandedMenuGroups((prev) => ({ ...prev, [key]: true }));
        parentNode.children.forEach((child) => {
          if (updatedRoleMap[child.key] === 'hide') {
            updatedRoleMap[child.key] = child.allowedLevels.includes('manage') ? 'manage' : 'view';
          }
        });
      }
    }

    // If enabling a child while parent menu is hidden, promote parent menu automatically
    if (parentKey && level !== 'hide' && updatedRoleMap[parentKey] === 'hide') {
      updatedRoleMap[parentKey] = level === 'manage' ? 'manage' : 'view';
    } else if (parentKey && level === 'manage' && updatedRoleMap[parentKey] === 'view') {
      updatedRoleMap[parentKey] = 'manage';
    }

    const nextConfig: RolePermissionsConfig = {
      ...rolePermissions,
      [selectedPermRole]: updatedRoleMap,
    };
    onSaveRolePermissions(nextConfig);
    setPermFeedback(`Updated ${selectedPermRole} permissions & synced to Cloud.`);
  };

  const handleApplyPermissionPreset = (mode: 'manageAll' | 'viewAll' | 'hideAll' | 'default') => {
    if (!isOwner) return;
    let updatedRoleMap = { ...rolePermissions[selectedPermRole] };
    if (mode === 'manageAll') {
      SIDEBAR_PERMISSION_TREE.forEach((menu) => {
        updatedRoleMap[menu.key] = 'manage';
        menu.children.forEach((child) => {
          updatedRoleMap[child.key] = child.allowedLevels.includes('manage') ? 'manage' : 'view';
        });
      });
    } else if (mode === 'viewAll') {
      ALL_PERMISSION_KEYS.forEach((k) => {
        updatedRoleMap[k] = 'view';
      });
    } else if (mode === 'hideAll') {
      ALL_PERMISSION_KEYS.forEach((k) => {
        updatedRoleMap[k] = 'hide';
      });
    } else {
      updatedRoleMap = { ...DEFAULT_ROLE_PERMISSIONS[selectedPermRole] };
    }
    onSaveRolePermissions({
      ...rolePermissions,
      [selectedPermRole]: updatedRoleMap,
    });
    const presetLabel =
      mode === 'manageAll'
        ? 'All Manage'
        : mode === 'viewAll'
          ? 'All View'
          : mode === 'hideAll'
            ? 'All Hide'
            : 'Default';
    setPermFeedback(`Applied ${presetLabel} preset to ${selectedPermRole}.`);
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
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 animate-backdrop-fade"
      onClick={onClose}
    >
      <div
        className="bg-[#0d1728] border border-[#1f2f4d] rounded-2xl w-full max-w-5xl h-[90vh] max-h-[700px] flex flex-col sm:flex-row overflow-hidden shadow-2xl shadow-black/70 animate-modal-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Navigation Column (On mobile: vertical full menu list first; hidden when a sub-page is open) */}
        <aside
          className={`${
            isMobileDetailOpen ? 'hidden sm:flex' : 'flex flex-1 sm:flex-initial animate-slide-left'
          } w-full sm:w-56 bg-[#09111f] sm:border-r border-[#1a2944] flex-col shrink-0 overflow-hidden`}
        >
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#152238] shrink-0">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-white tracking-tight">Settings</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="sm:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              aria-label="Close Settings"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-2 sm:gap-1.5 p-3 sm:p-2.5 overflow-y-auto">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isSelected = resolvedActiveTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileDetailOpen(true);
                    if (item.id !== 'users') {
                      setSelectedUserRef(null);
                      setIsEditingProfile(false);
                    }
                    if (item.id !== 'wings') {
                      setIsWingManageMode(false);
                      setShowAddUnitForm(false);
                      setEditingUnitRef(null);
                    }
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-3.5 sm:px-3 py-3 sm:py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#101c31] border-[#1d2e4c] text-slate-200 hover:border-emerald-500/45 sm:bg-[#161f3d] sm:text-indigo-300 sm:border-indigo-500/45 sm:shadow-sm'
                      : 'bg-[#101c31] border-[#1d2e4c] text-slate-200 hover:text-white hover:border-emerald-500/45 sm:bg-transparent sm:border-transparent sm:text-slate-300 sm:hover:bg-[#111d33]'
                  }`}
                >
                  <span className="flex items-center gap-3 sm:gap-2.5 min-w-0">
                    <span
                      className={`p-1.5 sm:p-0 rounded-lg bg-[#09111f] sm:bg-transparent border border-[#1e3150] sm:border-0 shrink-0 ${
                        isSelected ? 'sm:text-indigo-400 text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </span>
                  <ChevronRight
                    className={`w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0 ${
                      isSelected ? 'text-slate-400 sm:text-indigo-400' : 'text-slate-500'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Content Column (On mobile: visible ONLY after selecting an option, with Back button) */}
        <section
          className={`${
            isMobileDetailOpen ? 'flex animate-slide-right' : 'hidden sm:flex'
          } flex-1 flex-col min-w-0 overflow-hidden`}
        >
          <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-[#18263f] shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setIsMobileDetailOpen(false);
                  setIsWingManageMode(false);
                  setShowAddUnitForm(false);
                  setEditingUnitRef(null);
                }}
                className="sm:hidden inline-flex items-center justify-center p-1.5 -ml-1 rounded-lg bg-[#101c31] border border-[#1d2e4c] text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                aria-label="Back to Settings Menu"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                {activeNav?.label || 'Settings'}
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {resolvedActiveTab === 'wings' && canEditWings && (
                <button
                  type="button"
                  onClick={() => {
                    setWingFeedback(null);
                    setIsWingManageMode((prev) => {
                      if (prev) {
                        setShowAddUnitForm(false);
                        setEditingUnitRef(null);
                      }
                      return !prev;
                    });
                  }}
                  title={
                    isWingManageMode
                      ? 'Turn off Sqn / Unit Manage Mode'
                      : 'Manage Squadrons / Units (Add / Edit / Remove)'
                  }
                  aria-label="Toggle Squadron and Unit management"
                  aria-pressed={isWingManageMode}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isWingManageMode
                      ? 'bg-[#072a1d] border-emerald-500 text-emerald-300 shadow-sm'
                      : 'bg-[#101c31] border-[#1d2e4c] text-slate-300 hover:text-white hover:border-emerald-500/50'
                  }`}
                >
                  <Settings
                    className={`w-4 h-4 transition-transform duration-300 ${
                      isWingManageMode ? 'rotate-90 text-emerald-400' : ''
                    }`}
                  />
                  <span className="hidden sm:inline">
                    {isWingManageMode ? 'Manage On' : 'Manage'}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                aria-label="Close Settings"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div key={resolvedActiveTab || 'none'} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 animate-tab-enter">
            {!resolvedActiveTab && (
              <div className="bg-[#101c31] border border-amber-500/35 rounded-2xl p-6 text-center space-y-2">
                <Lock className="w-7 h-7 text-amber-400 mx-auto" />
                <div className="text-sm font-bold text-white">No Settings Panels Available</div>
                <div className="text-xs text-slate-400">
                  All Settings sub-options are currently set to Hide for {operatorRole}.
                </div>
              </div>
            )}

            {/* TAB: THEME & APPEARANCE */}
            {resolvedActiveTab === 'theme' && (
              <div className="space-y-4">
                <div className="bg-[#101c31] border border-[#1d2e4c] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 text-sm font-bold text-white">
                      <Palette className="w-4 h-4 text-indigo-400" />
                      <span>Theme Preference</span>
                    </div>
                    {!canEditTheme && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-600/25 border border-sky-500/40 text-sky-300 text-[10px] font-bold uppercase">
                        <Eye className="w-3 h-3" />
                        View Only
                      </span>
                    )}
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
                          disabled={!canEditTheme}
                          onClick={() => canEditTheme && onChangeThemePref(opt.id)}
                          className={`flex flex-col items-center justify-center gap-2.5 px-4 py-5 rounded-xl border text-xs font-bold transition-all ${
                            canEditTheme ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                          } ${
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
            {resolvedActiveTab === 'wings' && (() => {
              const selectedWing =
                wings.find((w) => w.id === selectedWingViewId) || wings[0] || null;
              const showWingManageControls = canEditWings && isWingManageMode;

              return (
                <div className="space-y-4">
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

                  {/* Add Sqn / Unit Action (Only visible when Gear Icon Manage Mode is ON) */}
                  {showWingManageControls && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-medium text-emerald-300">
                          Manage Mode Active — Add, rename, change Wing, or remove Squadrons / Units
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setWingFeedback(null);
                            setEditingUnitRef(null);
                            if (selectedWing) {
                              setTargetWingId(selectedWing.id);
                            }
                            setShowAddUnitForm((prev) => !prev);
                          }}
                          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            showAddUnitForm
                              ? 'bg-[#161f3d] border-indigo-500 text-indigo-300 shadow-sm'
                              : 'bg-[#101c31] border-[#1d2e4c] text-slate-200 hover:border-indigo-500/50 hover:text-sky-300'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5 text-sky-400" />
                          <span>Add Sqn / Unit</span>
                        </button>
                      </div>

                      {showAddUnitForm && (
                        <form
                          onSubmit={handleAddUnitSubmit}
                          className="bg-[#101c31] border border-indigo-500/40 rounded-xl p-4 space-y-3 animate-tab-enter"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-white">
                              <Building2 className="w-4 h-4 text-sky-400" />
                              <span>Add Squadron / Unit</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowAddUnitForm(false)}
                              className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                              aria-label="Close Add Sqn/Unit form"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <select
                              value={targetWingId}
                              onChange={(e) => setTargetWingId(e.target.value)}
                              aria-label="Target Wing"
                              className="bg-[#09111f] border border-[#1e3150] focus:border-emerald-500/60 rounded-lg px-3 py-2 text-xs text-white outline-none"
                            >
                              {wings.map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={unitNameInput}
                              onChange={(e) => setUnitNameInput(e.target.value)}
                              placeholder="Sqn / Unit (e.g. 205 SQN BAF)"
                              autoFocus
                              className="sm:col-span-2 bg-[#09111f] border border-[#1e3150] focus:border-emerald-500/60 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setShowAddUnitForm(false)}
                              className="px-3 py-1.5 rounded-lg bg-[#14233d] hover:bg-[#1b2e4f] text-slate-300 text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Save Sqn / Unit</span>
                            </button>
                          </div>
                        </form>
                      )}

                      {editingUnitRef && (
                        <form
                          onSubmit={handleSaveEditUnitSubmit}
                          className="bg-[#101c31] border border-emerald-500/45 rounded-xl p-4 space-y-3 animate-tab-enter"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-xs font-bold text-white min-w-0">
                              <Edit3 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="truncate">
                                Edit Sqn / Unit ({editingUnitRef.unitName})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setEditingUnitRef(null)}
                              className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer shrink-0"
                              aria-label="Close Edit Sqn/Unit form"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <input
                              type="text"
                              value={editUnitNameInput}
                              onChange={(e) => setEditUnitNameInput(e.target.value)}
                              placeholder="Sqn / Unit Name"
                              autoFocus
                              className="sm:col-span-2 bg-[#09111f] border border-[#1e3150] focus:border-emerald-500/60 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
                            />
                            <select
                              value={editUnitWingId}
                              onChange={(e) => setEditUnitWingId(e.target.value)}
                              aria-label="Select Wing"
                              className="bg-[#09111f] border border-[#1e3150] focus:border-emerald-500/60 rounded-lg px-3 py-2 text-xs text-white outline-none"
                            >
                              {wings.map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingUnitRef(null)}
                              className="px-3 py-1.5 rounded-lg bg-[#14233d] hover:bg-[#1b2e4f] text-slate-300 text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Save Changes</span>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* Interactive Wing Selector Bar (Horizontal) + Selected Wing's Squadrons Below */}
                  <div className="bg-[#101c31] border border-[#1d2e4c] rounded-2xl p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-white">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        <span>Select Wing ({wings.length})</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {showWingManageControls
                          ? 'Click any Sqn / Unit below to change its Name or Wing'
                          : 'View Only • Click a Wing to view its Squadrons / Units'}
                      </span>
                    </div>

                    {/* 2x2 Grid on Mobile (opore 2 ta niche 2 ta), Horizontal wrap on larger screens */}
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2">
                      {wings.map((wing) => {
                        const isActiveWing = selectedWing?.id === wing.id;
                        return (
                          <button
                            key={wing.id}
                            type="button"
                            onClick={() => {
                              setSelectedWingViewId(wing.id);
                              if (canEditWings) {
                                setTargetWingId(wing.id);
                              }
                            }}
                            className={`w-full sm:w-auto flex items-center justify-between gap-1.5 px-2.5 sm:px-3 py-2.5 sm:py-2 rounded-xl border text-[11px] sm:text-xs font-bold transition-all cursor-pointer ${
                              isActiveWing
                                ? 'bg-[#072a1d] border-emerald-500/70 text-emerald-300 shadow-sm'
                                : 'bg-[#09111f] border-[#1e3150] text-slate-300 hover:text-white hover:border-[#2e456e]'
                            }`}
                          >
                            <span className="flex items-center gap-1.5 min-w-0">
                              <Shield
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isActiveWing ? 'text-emerald-400' : 'text-slate-400'
                                }`}
                              />
                              <span className="truncate">{wing.name}</span>
                            </span>
                            <span className="text-[10px] sm:text-[11px] text-slate-400 tabular-nums shrink-0">
                              ({wing.units.length})
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected Wing's Squadrons / Units Below */}
                    {selectedWing && (
                      <div
                        key={selectedWing.id}
                        className="border-t border-[#182844] pt-4 space-y-3 animate-tab-enter"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
                            <span className="text-xs sm:text-sm font-bold text-white truncate">
                              {selectedWing.name}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                            {selectedWing.units.length}{' '}
                            {selectedWing.units.length === 1 ? 'Squadron / Unit' : 'Squadrons / Units'}
                          </span>
                        </div>

                        {selectedWing.units.length === 0 ? (
                          <div className="text-xs text-slate-400 italic py-3 px-3 rounded-xl bg-[#09111f] border border-[#1e3150]">
                            No Squadrons/Units assigned to {selectedWing.name} yet.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {selectedWing.units.map((unitName) => {
                              const isCore = CORE_UNITS_SET.has(unitName.toLowerCase());
                              const isBeingEdited =
                                editingUnitRef?.wingId === selectedWing.id &&
                                editingUnitRef?.unitName.toLowerCase() === unitName.toLowerCase();
                              return (
                                <div
                                  key={`${selectedWing.id}-${unitName}`}
                                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-colors ${
                                    isBeingEdited
                                      ? 'bg-[#072a1d] border-emerald-500 text-emerald-200'
                                      : 'bg-[#09111f] border-[#1e3150]'
                                  }`}
                                >
                                  {showWingManageControls ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setWingFeedback(null);
                                        setShowAddUnitForm(false);
                                        setEditingUnitRef({
                                          wingId: selectedWing.id,
                                          unitName,
                                        });
                                        setEditUnitNameInput(unitName);
                                        setEditUnitWingId(selectedWing.id);
                                      }}
                                      className="flex-1 flex items-center gap-2 min-w-0 text-left text-xs font-semibold text-slate-200 hover:text-emerald-300 transition-colors cursor-pointer"
                                      title={`Edit ${unitName} (Name / Wing)`}
                                    >
                                      <Building2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                      <span className="truncate">{unitName}</span>
                                      <Edit3 className="w-3 h-3 text-emerald-400 shrink-0 ml-auto" />
                                    </button>
                                  ) : (
                                    <div className="flex-1 flex items-center gap-2 min-w-0 text-left text-xs font-semibold text-slate-200 select-none">
                                      <Building2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                      <span className="truncate">{unitName}</span>
                                    </div>
                                  )}
                                  {!isCore && showWingManageControls && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onRequireAuth(() => {
                                          if (isBeingEdited) {
                                            setEditingUnitRef(null);
                                          }
                                          onDeleteUnitFromWing(selectedWing.id, unitName);
                                        })
                                      }
                                      title={`Remove ${unitName}`}
                                      className="p-0.5 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
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
                    )}
                  </div>
                </div>
              );
            })()}

            {/* TAB: USER MANAGEMENT (DIRECTORY LIST OR USER PROFILE DETAILS) */}
            {resolvedActiveTab === 'users' && (
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
                              <option value="OWNER">OWNER</option>
                              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                              <option value="ADMIN">ADMIN</option>
                              <option value="USER">USER</option>
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
                          <option value="ADMIN">ADMIN</option>
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
                              value={effectiveNewUserUnit}
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
                              <option value="OWNER">OWNER</option>
                              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                              <option value="ADMIN">ADMIN</option>
                              <option value="USER">USER</option>
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
                                    : userRole === 'ADMIN'
                                      ? 'bg-sky-600/25 border-sky-500/50 text-sky-300'
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

            {/* TAB: ACCESS CONTROL (SIDEBAR MENU TREE WITH HIDE / VIEW / MANAGE) */}
            {resolvedActiveTab === 'permissions' && (
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
                          ? 'Set Hide, View, or Manage for every Sidebar menu and expand arrows to customize nested sub-options. OWNER always keeps full Manage access.'
                          : 'Only an account with OWNER role can modify role access permissions.'}
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-purple-600/30 border border-purple-500/50 text-[10px] font-extrabold text-purple-200 uppercase tracking-wider">
                    OWNER: Full Manage
                  </span>
                </div>

                {/* Role selector tabs & presets */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#101c31] border border-[#1d2e4c] rounded-xl p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'SUPER_ADMIN' as const, label: 'SUPER_ADMIN' },
                        { id: 'ADMIN' as const, label: 'ADMIN' },
                        { id: 'USER' as const, label: 'USER' },
                        { id: 'GUEST' as const, label: 'GUEST' },
                      ] as const
                    ).map((rTab) => {
                      const isSel = selectedPermRole === rTab.id;
                      const activeCount = ALL_PERMISSION_KEYS.filter(
                        (k) => getRolePermissionLevel(rTab.id, k, rolePermissions) !== 'hide'
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
                            {activeCount}/{ALL_PERMISSION_KEYS.length}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {isOwner && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleApplyPermissionPreset('manageAll')}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600/25 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold cursor-pointer"
                      >
                        All Manage
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPermissionPreset('viewAll')}
                        className="px-2.5 py-1.5 rounded-lg bg-sky-600/25 hover:bg-sky-950/60 border border-sky-500/40 text-sky-300 text-[11px] font-bold cursor-pointer"
                      >
                        All View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyPermissionPreset('hideAll')}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-600/25 hover:bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[11px] font-bold cursor-pointer"
                      >
                        All Hide
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

                {/* Clear Role Scope & Live Permission Breakdown Card */}
                {(() => {
                  const roleGuide = ROLE_ACCESS_GUIDE[selectedPermRole];
                  const childNodes = SIDEBAR_PERMISSION_TREE.flatMap((menu) =>
                    menu.children.map((child) => ({
                      ...child,
                      menuLabel: menu.label.split(' (')[0],
                      effectiveLevel: getRolePermissionLevel(
                        selectedPermRole,
                        child.key,
                        rolePermissions
                      ),
                      scopeHint: getRolePermissionScopeHint(selectedPermRole, child.key),
                    }))
                  );
                  const manageItems = childNodes.filter((c) => c.effectiveLevel === 'manage');
                  const viewItems = childNodes.filter((c) => c.effectiveLevel === 'view');
                  const hiddenItems = childNodes.filter((c) => c.effectiveLevel === 'hide');

                  return (
                    <div className="bg-[#0d1729] border border-indigo-500/35 rounded-xl p-4 space-y-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs sm:text-sm font-extrabold text-white">
                              {roleGuide.headline}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold uppercase tracking-wide">
                              {roleGuide.scopeBadge}
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-300 mt-1.5 leading-relaxed">
                            {roleGuide.plainSummary}
                          </p>
                        </div>
                      </div>

                      {/* Key Scope Rules */}
                      <div className="bg-[#09111f] border border-[#1d2e4c] rounded-lg px-3 py-2.5 space-y-1">
                        {roleGuide.workflowSteps.map((step, idx) => (
                          <div
                            key={`${selectedPermRole}-rule-${idx}`}
                            className="flex items-start gap-2 text-[11px] text-slate-300 leading-relaxed"
                          >
                            <span className="text-emerald-400 font-bold shrink-0">•</span>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>

                      {/* Live Breakdown Grid (Manage / View Only / Hidden) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        {/* Manage Column */}
                        <div className="bg-[#09111f] border border-emerald-500/30 rounded-lg p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300">
                            <span className="inline-flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Manage ({manageItems.length})</span>
                            </span>
                          </div>
                          {manageItems.length === 0 ? (
                            <div className="text-[11px] text-slate-500 italic">None</div>
                          ) : (
                            <ul className="space-y-1">
                              {manageItems.map((item) => (
                                <li
                                  key={`bd-m-${item.key}`}
                                  className="text-[11px] text-slate-200 flex items-start justify-between gap-1.5"
                                >
                                  <span className="truncate">• {item.label}</span>
                                  {item.scopeHint && (
                                    <span className="text-[9px] font-bold text-emerald-300 shrink-0">
                                      ({item.scopeHint.replace(' Only', '').replace(' Scope', '')})
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* View Only Column */}
                        <div className="bg-[#09111f] border border-sky-500/30 rounded-lg p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-sky-300">
                            <span className="inline-flex items-center gap-1.5">
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Only ({viewItems.length})</span>
                            </span>
                          </div>
                          {viewItems.length === 0 ? (
                            <div className="text-[11px] text-slate-500 italic">None</div>
                          ) : (
                            <ul className="space-y-1">
                              {viewItems.map((item) => (
                                <li
                                  key={`bd-v-${item.key}`}
                                  className="text-[11px] text-slate-300 flex items-start justify-between gap-1.5"
                                >
                                  <span className="truncate">• {item.label}</span>
                                  {item.scopeHint && (
                                    <span className="text-[9px] font-bold text-sky-300 shrink-0">
                                      ({item.scopeHint.replace(' Only', '').replace(' Scope', '')})
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {/* Hidden Column */}
                        <div className="bg-[#09111f] border border-rose-500/25 rounded-lg p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-rose-300">
                            <span className="inline-flex items-center gap-1.5">
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Hide ({hiddenItems.length})</span>
                            </span>
                          </div>
                          {hiddenItems.length === 0 ? (
                            <div className="text-[11px] text-slate-500 italic">None</div>
                          ) : (
                            <ul className="space-y-1">
                              {hiddenItems.map((item) => (
                                <li
                                  key={`bd-h-${item.key}`}
                                  className="text-[11px] text-slate-400 truncate"
                                >
                                  • {item.label}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Expandable Sidebar Menu Tree */}
                <div className="space-y-3">
                  {SIDEBAR_PERMISSION_TREE.map((menu) => {
                    const MenuIcon = menu.icon;
                    const menuLevel = rolePermissions[selectedPermRole]?.[menu.key] || 'hide';
                    const isMenuHidden = menuLevel === 'hide';
                    const isExpanded = expandedMenuGroups[menu.key] ?? true;
                    const activeChildrenCount = isMenuHidden
                      ? 0
                      : menu.children.filter(
                          (child) =>
                            getRolePermissionLevel(selectedPermRole, child.key, rolePermissions) !==
                            'hide'
                        ).length;

                    const renderLevelSelector = (
                      targetKey: RolePermissionKey,
                      currentValue: PermissionLevel,
                      allowedLevels: PermissionLevel[],
                      parentKey?: RolePermissionKey,
                      parentHidden = false
                    ) => {
                      const effectiveDisplay: PermissionLevel = parentHidden
                        ? 'hide'
                        : currentValue;
                      return (
                        <div className="inline-flex items-center p-0.5 rounded-lg bg-[#09111f] border border-[#1e3150] shrink-0">
                          {allowedLevels.map((lvl) => {
                            const isActive = effectiveDisplay === lvl;
                            const labelText =
                              lvl === 'hide' ? 'Hide' : lvl === 'view' ? 'View' : 'Manage';
                            const activeStyle =
                              lvl === 'hide'
                                ? 'bg-rose-600/25 border-rose-500/50 text-rose-300 shadow-sm'
                                : lvl === 'view'
                                  ? 'bg-sky-600/25 border-sky-500/50 text-sky-300 shadow-sm'
                                  : 'bg-emerald-600/25 border-emerald-500/50 text-emerald-300 shadow-sm';
                            return (
                              <button
                                key={`${targetKey}-${lvl}`}
                                type="button"
                                disabled={!isOwner}
                                onClick={() =>
                                  handleSetPermissionLevel(targetKey, lvl, parentKey)
                                }
                                title={`Set ${labelText}`}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all ${
                                  isOwner ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                                } ${
                                  isActive
                                    ? activeStyle
                                    : 'border-transparent text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {lvl === 'hide' && <EyeOff className="w-3 h-3 shrink-0" />}
                                {lvl === 'view' && <Eye className="w-3 h-3 shrink-0" />}
                                {lvl === 'manage' && <Edit3 className="w-3 h-3 shrink-0" />}
                                <span>{labelText}</span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    };

                    return (
                      <div
                        key={menu.key}
                        className="bg-[#101c31] border border-[#1d2e4c] rounded-xl overflow-hidden"
                      >
                        {/* Parent Sidebar Menu Header Row */}
                        <div
                          className={`px-3.5 sm:px-4 py-3 bg-[#0d1729] flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 ${
                            isExpanded ? 'border-b border-[#182844]' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => toggleExpandMenuGroup(menu.key)}
                            className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
                          >
                            <span className="mt-0.5 sm:mt-0 p-1 rounded-lg bg-[#101c31] border border-[#1f3356] text-slate-300 group-hover:text-white group-hover:border-emerald-500/45 transition-colors shrink-0">
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </span>
                            <span className="p-1.5 rounded-lg bg-[#122038] border border-[#223659] text-emerald-400 shrink-0 hidden sm:inline-flex">
                              <MenuIcon className="w-4 h-4" />
                            </span>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs sm:text-[13px] font-bold text-white">
                                  {menu.label}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums border ${
                                    isMenuHidden
                                      ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                                      : 'bg-[#072a1d] border-emerald-500/40 text-emerald-300'
                                  }`}
                                >
                                  {isMenuHidden
                                    ? 'Menu Hidden'
                                    : `${activeChildrenCount}/${menu.children.length} active`}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5 truncate sm:whitespace-normal">
                                {menu.desc}
                              </div>
                            </div>
                          </button>

                          {renderLevelSelector(menu.key, menuLevel, menu.allowedLevels)}
                        </div>

                        {/* Nested Sub-Options under Arrow */}
                        {isExpanded && (
                          <div className="pl-4 sm:pl-6 bg-[#0b1526]">
                            <div className="border-l-2 border-[#1b2e4f] divide-y divide-[#17253e]">
                              {isMenuHidden && (
                                <div className="px-4 py-2 bg-rose-950/20 text-[11px] text-rose-300/90 flex items-center gap-2">
                                  <EyeOff className="w-3.5 h-3.5 shrink-0" />
                                  <span>
                                    Parent menu is set to <strong>Hide</strong>. Select{' '}
                                    <strong>View</strong> or <strong>Manage</strong> on any option
                                    below to activate this menu automatically.
                                  </span>
                                </div>
                              )}
                              {menu.children.map((child) => {
                                const childRawLevel =
                                  rolePermissions[selectedPermRole]?.[child.key] || 'hide';
                                const childScopeHint = getRolePermissionScopeHint(
                                  selectedPermRole,
                                  child.key
                                );
                                return (
                                  <div
                                    key={child.key}
                                    className={`px-3.5 sm:px-4 py-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 hover:bg-[#122039]/60 transition-colors ${
                                      isMenuHidden ? 'opacity-65' : ''
                                    }`}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-xs font-semibold text-white">
                                          {child.label}
                                        </span>
                                        {childScopeHint && (
                                          <span className="px-1.5 py-0.5 rounded bg-[#101c31] border border-[#243b61] text-[10px] font-bold text-amber-300">
                                            {childScopeHint}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[11px] text-slate-400 mt-0.5">
                                        {child.desc}
                                      </div>
                                    </div>
                                    {renderLevelSelector(
                                      child.key,
                                      childRawLevel,
                                      child.allowedLevels,
                                      menu.key,
                                      isMenuHidden
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: LOGIN HISTORY */}
            {resolvedActiveTab === 'history' && (
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
                  {canClearHistory && (
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
            {resolvedActiveTab === 'sync' && (
              <div className="space-y-4">
                {!canUploadCloudSync && (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium border bg-amber-950/35 border-amber-500/35 text-amber-200">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {canPullCloudSync
                        ? `Upload to Cloud is View-Only for your role (${operatorRole}). You can still Refresh from Cloud.`
                        : `Cloud Sync actions are restricted for your role (${operatorRole}).`}
                    </span>
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
                    disabled={isSyncing || !canUploadCloudSync}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    <CloudUpload className="w-4 h-4" />
                    <span>{isSyncing ? 'Syncing...' : 'Upload & Sync Now'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePullSync}
                    disabled={isSyncing || !canPullCloudSync}
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
            {resolvedActiveTab === 'notice' && (
              <div className="space-y-4">
                {!canEditAppNotice && (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium border bg-amber-950/35 border-amber-500/35 text-amber-200">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Editing App Notice is View-Only for your role ({operatorRole}).</span>
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
                    disabled={!canEditAppNotice}
                    value={noticeDraft}
                    onChange={(e) => setNoticeDraft(e.target.value)}
                    placeholder="Enter operational notice (leave empty to hide banner)..."
                    className="w-full bg-[#09111f] border border-[#1e3150] focus:border-emerald-500/60 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none resize-none disabled:opacity-60"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500 tabular-nums">
                      {noticeDraft.length}/500
                    </span>
                    {canEditAppNotice && (
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
