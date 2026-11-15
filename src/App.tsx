/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ControlsBar } from './components/ControlsBar';
import { Sidebar } from './components/Sidebar';
import { SettingsModal, SettingsTabId } from './components/SettingsModal';
import { UnitStateView } from './components/UnitStateView';
import { ConsolidatedWingView } from './components/ConsolidatedWingView';
import { NominalRollView } from './components/NominalRollView';
import { PreparedByModal } from './components/PreparedByModal';
import { PrintReportModal } from './components/PrintReportModal';
import { OperatorAuthModal } from './components/OperatorAuthModal';
import { StateUpdateLogView } from './components/StateUpdateLogView';
import { LoginPortalView, SignUpPayload } from './components/LoginPortalView';
import { DatePickerModal } from './components/DatePickerModal';
import {
  DayState,
  Airman,
  DisposalRecord,
  PreparedByInfo,
  UnitRowState,
  OperatorProfile,
  StateUpdateLogEntry,
  LoginHistoryEntry,
  WingConfig,
  Rank,
  UserRole,
  RolePermissionKey,
  RolePermissionsConfig,
  ThemePreference,
} from './types/nightCount';
import {
  loadDayState,
  saveDayState,
  loadSavedCustomDisposals,
  saveCustomDisposalsList,
  shiftDate,
  syncConsolidated155Row,
  getUnitAirmen,
  setUnitAirmen,
  getUnitRemarks,
  setUnitRemarks,
  loadUiPrefs,
  saveUiPrefs,
  savePreparedByStorage,
  getWingPreparedBy,
  loadHiddenQuickEditDisposals,
  saveHiddenQuickEditDisposals,
  normalizeDayState,
  carryForwardPriorUnitRows,
  sortAirmenBySeniority,
  findExistingBdConflict,
  getAllExistingBdUnitMap,
  loadVerifiedOperator,
  saveVerifiedOperator,
  clearVerifiedOperator,
  loadGuestSession,
  saveGuestSession,
  clearGuestSession,
  loadRecentUserIds,
  saveRecentUserIdsList,
  recordRecentUserId,
  removeRecentUserId,
  mergeRecentUserIds,
  loadLoginHistory,
  saveLoginHistoryList,
  recordLoginHistoryEntry,
  mergeLoginHistoryLists,
  loadAppNotice,
  saveAppNoticeStorage,
  loadWingsConfig,
  saveWingsConfig,
  ensureDayStateHasConfiguredUnits,
  createStateUpdateLog,
  loadRolePermissions,
  saveRolePermissions,
  getUserRoleByBd,
  hasRolePermission,
  canManageRolePermission,
  loadThemePreference,
  saveThemePreference,
} from './utils/storage';
import {
  auth,
  ensureAnonymousAuth,
  onAuthStateChanged,
  testFirestoreConnection,
} from './firebase';
import {
  computeDayFingerprint,
  computeSettingsFingerprint,
  downloadDayFromCloud,
  downloadFromCloudOnEnter,
  uploadDayToCloud,
  uploadSettingsToCloud,
  type CloudSettings,
} from './utils/firebaseSync';
import { createBlankUnitRow, DISPOSAL_OPTIONS, INITIAL_PREPARED_BY } from './data/initialData';
import { FileSpreadsheet, Users, History, Megaphone, X, Lock, UserCheck } from 'lucide-react';
import { OfflineIndicator } from './components/OfflineIndicator';

const CLOUD_UPLOAD_DEBOUNCE_MS = 8000; // Always completes within 10 seconds of data change

export default function App() {
  const initialPrefs = React.useMemo(() => loadUiPrefs(), []);
  const [dateIso, setDateIso] = useState<string>(initialPrefs.dateIso);
  const [activeTab, setActiveTab] = useState<string>(initialPrefs.activeTab);
  const [wingSubTab, setWingSubTab] = useState<'consolidated' | 'log'>('consolidated');
  const [unitSubTab, setUnitSubTab] = useState<'state' | 'nominalRoll' | 'log'>(
    initialPrefs.unitSubTab
  );
  const [dayState, setDayState] = useState<DayState>(() => loadDayState(initialPrefs.dateIso));

  // Modals state
  const [isPreparedByOpen, setIsPreparedByOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Operator Authentication, Guest session, Sidebar & Settings state
  const [verifiedOperator, setVerifiedOperator] = useState<OperatorProfile | null>(() =>
    loadVerifiedOperator()
  );
  const [isGuestSession, setIsGuestSession] = useState<boolean>(() => loadGuestSession());
  const [recentUserIds, setRecentUserIds] = useState<string[]>(() => loadRecentUserIds());
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>(() => loadLoginHistory());
  const [appNotice, setAppNotice] = useState<string>(() => loadAppNotice());
  const [wings, setWings] = useState<WingConfig[]>(() => loadWingsConfig());
  const [activeWingId, setActiveWingId] = useState<string>(() => {
    const configured = loadWingsConfig();
    return (
      configured.find((w) => w.id === 'flying-wing' || w.name === 'Flying Wing')?.id ||
      configured[0]?.id ||
      'flying-wing'
    );
  });
  const [isNoticeDismissed, setIsNoticeDismissed] = useState(false);
  const [themePref, setThemePref] = useState<ThemePreference>(() => loadThemePreference());
  const [rolePermissions, setRolePermissions] = useState<RolePermissionsConfig>(() =>
    loadRolePermissions()
  );

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTabId>('theme');

  const verifiedOperatorRef = React.useRef<OperatorProfile | null>(verifiedOperator);
  const [isOperatorAuthOpen, setIsOperatorAuthOpen] = useState(false);
  const pendingAuthActionRef = React.useRef<(() => void) | null>(null);

  const requireOperatorAuth = React.useCallback((onSuccess: () => void) => {
    if (verifiedOperatorRef.current) {
      onSuccess();
      return;
    }
    pendingAuthActionRef.current = onSuccess;
    setIsOperatorAuthOpen(true);
  }, []);

  const handleOperatorAuthCancel = React.useCallback(() => {
    pendingAuthActionRef.current = null;
    setIsOperatorAuthOpen(false);
  }, []);

  const [isQuickEditActive, setIsQuickEditActive] = useState(false);

  const handleLogout = React.useCallback(() => {
    clearVerifiedOperator();
    clearGuestSession();
    verifiedOperatorRef.current = null;
    pendingAuthActionRef.current = null;
    setVerifiedOperator(null);
    setIsGuestSession(false);
    setIsOperatorAuthOpen(false);
    setIsPreparedByOpen(false);
    setIsPrintOpen(false);
    setIsSettingsOpen(false);
    setIsMobileSidebarOpen(false);
    setIsQuickEditActive(false);
  }, []);

  // Cloud sync refs (ensures zero uploads unless data actually changed)
  const syncedDayHashesRef = React.useRef<Map<string, string>>(new Map());
  const syncedSettingsHashRef = React.useRef<string | null>(null);
  const dirtyDaysRef = React.useRef<Map<string, DayState>>(new Map());
  const dirtySettingsRef = React.useRef<CloudSettings | null>(null);
  const fetchedCloudDatesRef = React.useRef<Set<string>>(new Set());
  const userEditedDatesRef = React.useRef<Set<string>>(new Set());
  const uploadTimerRef = React.useRef<number | null>(null);
  const isFlushingRef = React.useRef<boolean>(false);

  const flushCloudUploads = React.useCallback(async () => {
    if (uploadTimerRef.current !== null) {
      window.clearTimeout(uploadTimerRef.current);
      uploadTimerRef.current = null;
    }
    if (isFlushingRef.current) return;

    const hasDirtyDays = dirtyDaysRef.current.size > 0;
    const hasDirtySettings = dirtySettingsRef.current !== null;
    if (!hasDirtyDays && !hasDirtySettings) return;

    const currentUser = auth.currentUser ?? (await ensureAnonymousAuth());
    if (!currentUser) {
      return;
    }

    isFlushingRef.current = true;
    try {
      const daysToUpload = Array.from(dirtyDaysRef.current.entries());
      for (const [dIso, dState] of daysToUpload) {
        const nextHash = computeDayFingerprint(dState);
        if (syncedDayHashesRef.current.get(dIso) === nextHash) {
          dirtyDaysRef.current.delete(dIso);
          continue;
        }
        await uploadDayToCloud(dState);
        syncedDayHashesRef.current.set(dIso, nextHash);
        dirtyDaysRef.current.delete(dIso);
      }

      if (dirtySettingsRef.current) {
        const pendingSettings = dirtySettingsRef.current;
        const nextSettingsHash = computeSettingsFingerprint(pendingSettings);
        if (syncedSettingsHashRef.current !== nextSettingsHash) {
          await uploadSettingsToCloud(pendingSettings);
          syncedSettingsHashRef.current = nextSettingsHash;
        }
        dirtySettingsRef.current = null;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg !== 'AUTH_REQUIRED' && msg !== 'CLOUD_UNAVAILABLE') {
        console.error('Cloud upload deferred:', err);
      }
    } finally {
      isFlushingRef.current = false;
    }
  }, []);

  const scheduleCloudUpload = React.useCallback(() => {
    if (dirtyDaysRef.current.size === 0 && !dirtySettingsRef.current) {
      if (uploadTimerRef.current !== null) {
        window.clearTimeout(uploadTimerRef.current);
        uploadTimerRef.current = null;
      }
      return;
    }
    if (uploadTimerRef.current !== null) {
      window.clearTimeout(uploadTimerRef.current);
    }
    uploadTimerRef.current = window.setTimeout(() => {
      void flushCloudUploads();
    }, CLOUD_UPLOAD_DEBOUNCE_MS);
  }, [flushCloudUploads]);

  const markDayChangedForCloud = React.useCallback(
    (nextState: DayState) => {
      userEditedDatesRef.current.add(nextState.date);
      const nextHash = computeDayFingerprint(nextState);
      if (syncedDayHashesRef.current.get(nextState.date) === nextHash) {
        dirtyDaysRef.current.delete(nextState.date);
      } else {
        dirtyDaysRef.current.set(nextState.date, nextState);
      }
      scheduleCloudUpload();
    },
    [scheduleCloudUpload]
  );

  const markSettingsChangedForCloud = React.useCallback(
    (
      preparedBy: PreparedByInfo,
      savedCustomDisposals: string[],
      overrides?: {
        recentUserIds?: string[];
        loginHistory?: LoginHistoryEntry[];
        appNotice?: string;
        wings?: WingConfig[];
        rolePermissions?: RolePermissionsConfig;
      }
    ) => {
      const candidate: CloudSettings = {
        preparedBy,
        savedCustomDisposals,
        hiddenQuickEditDisposals: loadHiddenQuickEditDisposals(),
        recentUserIds: overrides?.recentUserIds ?? loadRecentUserIds(),
        loginHistory: overrides?.loginHistory ?? loadLoginHistory(),
        appNotice: overrides?.appNotice ?? loadAppNotice(),
        wings: overrides?.wings ?? loadWingsConfig(),
        rolePermissions: overrides?.rolePermissions ?? loadRolePermissions(),
      };
      const nextHash = computeSettingsFingerprint(candidate);
      if (syncedSettingsHashRef.current === nextHash) {
        dirtySettingsRef.current = null;
      } else {
        dirtySettingsRef.current = candidate;
      }
      scheduleCloudUpload();
    },
    [scheduleCloudUpload]
  );

  const handleGuestLogin = React.useCallback(() => {
    saveGuestSession(true);
    setIsGuestSession(true);
    const defaultWing = wings[0];
    if (defaultWing) {
      setActiveWingId(defaultWing.id);
      setActiveTab(defaultWing.name);
    }
    setWingSubTab('consolidated');
    setUnitSubTab('state');
    setIsPreparedByOpen(false);
    setIsQuickEditActive(false);

    const nextHistory = recordLoginHistoryEntry(
      { bdNo: 'GUEST', rank: '', name: 'Guest User', trade: '', flight: 'View Only' },
      'Guest'
    );
    setLoginHistory(nextHistory);
    markSettingsChangedForCloud(
      dayState.preparedBy,
      dayState.savedCustomDisposals ?? loadSavedCustomDisposals(),
      { loginHistory: nextHistory }
    );
    void flushCloudUploads();
  }, [dayState.preparedBy, dayState.savedCustomDisposals, flushCloudUploads, markSettingsChangedForCloud, wings]);

  const handleOperatorVerified = React.useCallback(
    (operator: OperatorProfile) => {
      const loginMode: LoginHistoryEntry['mode'] = isOperatorAuthOpen ? 'Auth Box' : 'Portal';
      saveVerifiedOperator(operator);
      clearGuestSession();
      setIsGuestSession(false);
      verifiedOperatorRef.current = operator;
      setVerifiedOperator(operator);
      setIsOperatorAuthOpen(false);

      if (loginMode === 'Portal') {
        let operatorUnit = findExistingBdConflict(dayState, operator.bdNo)?.unit || null;
        if (!operatorUnit) {
          const logs = dayState.updateLogs || [];
          for (let i = logs.length - 1; i >= 0; i -= 1) {
            if (logs[i]?.operator?.bdNo?.trim() === operator.bdNo.trim() && logs[i].unitName) {
              operatorUnit = logs[i].unitName;
              break;
            }
          }
        }
        if (operatorUnit) {
          const matchedWing = wings.find((w) =>
            w.units.some((u) => u.toLowerCase() === operatorUnit!.toLowerCase())
          );
          const canonicalUnit =
            matchedWing?.units.find((u) => u.toLowerCase() === operatorUnit!.toLowerCase()) ||
            operatorUnit;
          if (matchedWing) {
            setActiveWingId(matchedWing.id);
          }
          setActiveTab(canonicalUnit);
          setUnitSubTab('state');
          setWingSubTab('consolidated');
          setIsPreparedByOpen(false);
          setIsQuickEditActive(false);
        }
      }

      const nextRecent = recordRecentUserId(operator.bdNo);
      const nextHistory = recordLoginHistoryEntry(operator, loginMode);
      setRecentUserIds(nextRecent);
      setLoginHistory(nextHistory);
      markSettingsChangedForCloud(
        dayState.preparedBy,
        dayState.savedCustomDisposals ?? loadSavedCustomDisposals(),
        { recentUserIds: nextRecent, loginHistory: nextHistory }
      );
      void flushCloudUploads();

      const nextAction = pendingAuthActionRef.current;
      pendingAuthActionRef.current = null;
      if (nextAction) {
        nextAction();
      }
    },
    [dayState, flushCloudUploads, isOperatorAuthOpen, markSettingsChangedForCloud, wings]
  );

  const handleSignUpFromPortal = React.useCallback(
    (payload: SignUpPayload): { ok: boolean; error?: string } => {
      const cleanName = payload.name.trim();
      const cleanBd = payload.bdNo.replace(/\D/g, '').slice(0, 6);
      const targetUnit = payload.unit.trim();
      const targetWing = payload.wing.trim();

      if (!targetUnit) {
        return { ok: false, error: 'Please select or enter Office / Sqn / Unit.' };
      }
      if (!targetWing) {
        return { ok: false, error: 'Please select or enter Wing.' };
      }
      if (!cleanName) {
        return { ok: false, error: 'Please enter your name.' };
      }
      if (!/^\d{6}$/.test(cleanBd)) {
        return { ok: false, error: 'USER ID (BD No) must be exactly 6 digits.' };
      }

      const conflict = findExistingBdConflict(dayState, cleanBd);
      if (conflict) {
        return {
          ok: false,
          error: `USER ID ${cleanBd} is already registered to ${conflict.airman.rank} ${conflict.airman.name} (${conflict.unit}). Please log in instead.`,
        };
      }

      // Ensure selected/custom Wing & Unit exist in wings configuration
      let nextWings = wings;
      let wingsChanged = false;
      const existingUnitWing = wings.find((w) =>
        w.units.some((u) => u.toLowerCase() === targetUnit.toLowerCase())
      );
      const existingTargetWing = wings.find(
        (w) => w.name.toLowerCase() === targetWing.toLowerCase()
      );

      if (!existingTargetWing) {
        const newWing: WingConfig = {
          id: `wing-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          name: targetWing,
          shortName: targetWing.slice(0, 12).toUpperCase(),
          units: existingUnitWing ? [] : [targetUnit],
        };
        nextWings = saveWingsConfig([...wings, newWing]);
        setWings(nextWings);
        wingsChanged = true;
      } else if (!existingUnitWing) {
        nextWings = saveWingsConfig(
          wings.map((w) =>
            w.id === existingTargetWing.id ? { ...w, units: [...w.units, targetUnit] } : w
          )
        );
        setWings(nextWings);
        wingsChanged = true;
      }

      const canonicalUnit =
        existingUnitWing?.units.find((u) => u.toLowerCase() === targetUnit.toLowerCase()) ||
        targetUnit;

      const operatorProfile: OperatorProfile = {
        bdNo: cleanBd,
        rank: payload.rank,
        name: cleanName,
        trade: payload.trade,
        flight: payload.flight,
      };

      const newAirman: Airman = {
        id: `airman-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        rank: payload.rank,
        name: cleanName,
        bdNo: cleanBd,
        trade: payload.trade,
        flight: payload.flight,
        unit: canonicalUnit,
        role: 'USER',
        status: 'on_parade',
      };

      const currentList = getUnitAirmen(dayState, canonicalUnit);
      const updatedList = sortAirmenBySeniority([...currentList, newAirman]);
      const withAirman = ensureDayStateHasConfiguredUnits(
        setUnitAirmen(dayState, canonicalUnit, updatedList),
        nextWings
      );
      const syncedUnits = syncConsolidated155Row(withAirman.consolidatedUnits, withAirman);
      const entry = createStateUpdateLog(
        withAirman.date,
        'Nominal Roll',
        canonicalUnit,
        `Registered & added ${payload.rank} ${cleanName} (BD ${cleanBd}) to ${canonicalUnit} Nominal Roll & User Management`,
        operatorProfile
      );
      const nextLogs = [...(withAirman.updateLogs || []), entry].slice(-500);
      const fullySynced: DayState = {
        ...withAirman,
        consolidatedUnits: syncedUnits,
        updateLogs: nextLogs,
      };

      userEditedDatesRef.current.add(fullySynced.date);
      saveDayState(fullySynced);
      markDayChangedForCloud(fullySynced);
      setDayState(fullySynced);

      const nextRecent = recordRecentUserId(cleanBd);
      setRecentUserIds(nextRecent);
      markSettingsChangedForCloud(
        fullySynced.preparedBy,
        fullySynced.savedCustomDisposals ?? loadSavedCustomDisposals(),
        {
          recentUserIds: nextRecent,
          ...(wingsChanged ? { wings: nextWings } : {}),
        }
      );
      void flushCloudUploads();

      return { ok: true };
    },
    [dayState, flushCloudUploads, markDayChangedForCloud, markSettingsChangedForCloud, wings]
  );

  const handleRemoveRecentUserId = React.useCallback(
    (bdNo: string) => {
      const nextRecent = removeRecentUserId(bdNo);
      setRecentUserIds(nextRecent);
      markSettingsChangedForCloud(
        dayState.preparedBy,
        dayState.savedCustomDisposals ?? loadSavedCustomDisposals(),
        { recentUserIds: nextRecent }
      );
    },
    [dayState.preparedBy, dayState.savedCustomDisposals, markSettingsChangedForCloud]
  );

  // Persist current date, tab, and sub-tab so user's view never resets
  useEffect(() => {
    saveUiPrefs({
      dateIso,
      activeTab,
      unitSubTab: unitSubTab === 'log' ? 'state' : unitSubTab,
    });
  }, [dateIso, activeTab, unitSubTab]);

  // Apply Theme Preference (System / Light / Dark) cleanly on html[data-theme]
  useEffect(() => {
    const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const applyResolvedTheme = () => {
      const resolved: 'light' | 'dark' =
        themePref === 'system'
          ? media && !media.matches
            ? 'light'
            : 'dark'
          : themePref;
      document.documentElement.setAttribute('data-theme', resolved);
      document.documentElement.style.backgroundColor = '';
      document.documentElement.style.color = '';
    };
    applyResolvedTheme();
    if (themePref === 'system' && media) {
      media.addEventListener('change', applyResolvedTheme);
      return () => media.removeEventListener('change', applyResolvedTheme);
    }
    return undefined;
  }, [themePref]);

  const handleChangeThemePref = (pref: ThemePreference) => {
    const saved = saveThemePreference(pref);
    setThemePref(saved);
  };

  // Auth listener & initial Cloud download on entering the app
  useEffect(() => {
    void testFirestoreConnection();
    void ensureAnonymousAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (dirtyDaysRef.current.size > 0 || dirtySettingsRef.current) {
          void flushCloudUploads();
        }
      } else {
        void ensureAnonymousAuth();
      }
    });

    const handleVisibilityOrHide = () => {
      if (document.visibilityState === 'hidden') {
        if (dirtyDaysRef.current.size > 0 || dirtySettingsRef.current) {
          void flushCloudUploads();
        }
      }
    };
    const handleOnline = () => {
      if (dirtyDaysRef.current.size > 0 || dirtySettingsRef.current) {
        void flushCloudUploads();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityOrHide);
    window.addEventListener('pagehide', handleVisibilityOrHide);
    window.addEventListener('online', handleOnline);

    // Download latest state from Cloud when entering the app
    const bootDateIso = initialPrefs.dateIso;
    let cancelled = false;
    (async () => {
      try {
        const result = await downloadFromCloudOnEnter(bootDateIso);
        if (cancelled) return;

        if (result.settings) {
          savePreparedByStorage(result.settings.preparedBy);
          saveCustomDisposalsList(result.settings.savedCustomDisposals);
          saveHiddenQuickEditDisposals(result.settings.hiddenQuickEditDisposals);
          if (Array.isArray(result.settings.recentUserIds) && result.settings.recentUserIds.length > 0) {
            const mergedRecent = mergeRecentUserIds(
              result.settings.recentUserIds,
              loadRecentUserIds()
            );
            saveRecentUserIdsList(mergedRecent);
            setRecentUserIds(mergedRecent);
          }
          if (Array.isArray(result.settings.loginHistory) && result.settings.loginHistory.length > 0) {
            const mergedHistory = mergeLoginHistoryLists(
              result.settings.loginHistory,
              loadLoginHistory()
            );
            saveLoginHistoryList(mergedHistory);
            setLoginHistory(mergedHistory);
          }
          if (typeof result.settings.appNotice === 'string') {
            saveAppNoticeStorage(result.settings.appNotice);
            setAppNotice(result.settings.appNotice);
          }
          if (Array.isArray(result.settings.wings) && result.settings.wings.length > 0) {
            const savedWings = saveWingsConfig(result.settings.wings);
            setWings(savedWings);
          }
          if (result.settings.rolePermissions) {
            const savedPerms = saveRolePermissions(result.settings.rolePermissions);
            setRolePermissions(savedPerms);
          }
          syncedSettingsHashRef.current = computeSettingsFingerprint(result.settings);
        }

        const effectiveWings = loadWingsConfig();
        fetchedCloudDatesRef.current.add(bootDateIso);

        let normalizedPrior: DayState | null = null;
        if (result.priorCloudDayState) {
          normalizedPrior = normalizeDayState(result.priorCloudDayState);
          saveDayState(normalizedPrior);
          syncedDayHashesRef.current.set(
            normalizedPrior.date,
            computeDayFingerprint(normalizedPrior)
          );
        }

        if (result.dayState) {
          const baseCloud = normalizeDayState(result.dayState);
          const normalizedCloud = ensureDayStateHasConfiguredUnits(
            carryForwardPriorUnitRows(baseCloud, normalizedPrior),
            effectiveWings
          );
          if (result.settings) {
            normalizedCloud.preparedBy = result.settings.preparedBy;
            normalizedCloud.savedCustomDisposals = result.settings.savedCustomDisposals;
          }
          saveDayState(normalizedCloud);
          syncedDayHashesRef.current.set(
            normalizedCloud.date,
            computeDayFingerprint(baseCloud)
          );
          if (!userEditedDatesRef.current.has(normalizedCloud.date)) {
            setDayState((curr) =>
              curr.date === normalizedCloud.date ? normalizedCloud : curr
            );
          }
        } else if (normalizedPrior) {
          if (!userEditedDatesRef.current.has(bootDateIso)) {
            const inheritedFromCloud = ensureDayStateHasConfiguredUnits(
              loadDayState(bootDateIso, normalizedPrior),
              effectiveWings
            );
            if (result.settings) {
              inheritedFromCloud.preparedBy = result.settings.preparedBy;
              inheritedFromCloud.savedCustomDisposals = result.settings.savedCustomDisposals;
            }
            syncedDayHashesRef.current.set(
              bootDateIso,
              computeDayFingerprint(inheritedFromCloud)
            );
            setDayState((curr) =>
              curr.date === bootDateIso ? inheritedFromCloud : curr
            );
          }
        }
      } catch (err) {
        console.error('Initial Cloud download failed:', err);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribeAuth();
      document.removeEventListener('visibilitychange', handleVisibilityOrHide);
      window.removeEventListener('pagehide', handleVisibilityOrHide);
      window.removeEventListener('online', handleOnline);
      if (uploadTimerRef.current !== null) {
        window.clearTimeout(uploadTimerRef.current);
      }
    };
  }, [flushCloudUploads, initialPrefs.dateIso]);

  const switchToDate = (nextDateIso: string) => {
    if (!nextDateIso || nextDateIso === dateIso) return;
    const nextState = loadDayState(nextDateIso, dayState);
    if (!syncedDayHashesRef.current.has(nextDateIso) && !dirtyDaysRef.current.has(nextDateIso)) {
      syncedDayHashesRef.current.set(nextDateIso, computeDayFingerprint(nextState));
    }
    setDateIso(nextDateIso);
    setDayState(nextState);

    // Fetch target date from Cloud if not yet downloaded in this session and not locally edited
    if (!fetchedCloudDatesRef.current.has(nextDateIso) && !dirtyDaysRef.current.has(nextDateIso)) {
      fetchedCloudDatesRef.current.add(nextDateIso);
      void downloadDayFromCloud(nextDateIso)
        .then((cloudDay) => {
          if (!cloudDay || userEditedDatesRef.current.has(nextDateIso)) return;
          const baseCloud = normalizeDayState(cloudDay);
          const normalizedCloud = carryForwardPriorUnitRows(baseCloud, dayState);
          saveDayState(normalizedCloud);
          syncedDayHashesRef.current.set(
            nextDateIso,
            computeDayFingerprint(baseCloud)
          );
          setDayState((curr) => (curr.date === nextDateIso ? normalizedCloud : curr));
        })
        .catch((err) => {
          console.error('Failed to download date from Cloud:', err);
        });
    }
  };

  // Persist dayState when updated, record State Update Log, sync unit rows, and schedule 8s Cloud upload ONLY if data changed
  const updateAndSaveState = (
    updater: (prev: DayState) => DayState,
    logMeta?: {
      area: StateUpdateLogEntry['area'];
      unitName: string;
      action: string;
    }
  ) => {
    if (isGuestSession) return;
    setDayState((prev) => {
      const next = updater(prev);
      if (next === prev) return prev;
      const syncedUnits = syncConsolidated155Row(next.consolidatedUnits, next);
      let nextLogs = next.updateLogs ?? prev.updateLogs ?? [];
      const operator = verifiedOperatorRef.current;
      if (logMeta && operator) {
        const entry = createStateUpdateLog(
          next.date,
          logMeta.area,
          logMeta.unitName,
          logMeta.action,
          operator
        );
        nextLogs = [...nextLogs, entry].slice(-500);
      }
      const fullySynced: DayState = {
        ...next,
        consolidatedUnits: syncedUnits,
        updateLogs: nextLogs,
      };
      saveDayState(fullySynced);
      markDayChangedForCloud(fullySynced);
      return fullySynced;
    });
  };

  const handleTabChange = (tab: string, wingId?: string) => {
    setActiveTab(tab);
    const matchingWing = wings.find((w) => w.name === tab || (wingId && w.id === wingId));
    if (matchingWing) {
      setActiveWingId(matchingWing.id);
    } else {
      const parentWing = wings.find((w) =>
        w.units.some((u) => u.toLowerCase() === tab.toLowerCase())
      );
      if (parentWing) setActiveWingId(parentWing.id);
    }
    if (wings.some((w) => w.name === tab)) {
      setWingSubTab('consolidated');
    } else {
      setUnitSubTab('state');
    }
  };

  const handlePrevDate = () => {
    switchToDate(shiftDate(dateIso, -1));
  };

  const handleNextDate = () => {
    switchToDate(shiftDate(dateIso, 1));
  };

  const handleDateChange = (newDateIso: string) => {
    switchToDate(newDateIso);
  };

  const currentRole: UserRole | 'GUEST' = verifiedOperator
    ? getUserRoleByBd(dayState, verifiedOperator.bdNo)
    : 'GUEST';
  const canView = (key: RolePermissionKey): boolean =>
    hasRolePermission(currentRole, key, rolePermissions);
  const canManage = (key: RolePermissionKey): boolean =>
    !isGuestSession && canManageRolePermission(currentRole, key, rolePermissions);

  const loggedInUserUnit = React.useMemo(() => {
    if (!verifiedOperator) return null;
    const match = findExistingBdConflict(dayState, verifiedOperator.bdNo);
    if (match?.unit) return match.unit;
    const logs = dayState.updateLogs || [];
    for (let i = logs.length - 1; i >= 0; i -= 1) {
      if (logs[i]?.operator?.bdNo?.trim() === verifiedOperator.bdNo.trim() && logs[i].unitName) {
        return logs[i].unitName;
      }
    }
    return null;
  }, [dayState, verifiedOperator]);

  const isWingAdmin = currentRole === 'ADMIN' && Boolean(loggedInUserUnit);
  const isRestrictedUser = currentRole === 'USER' && Boolean(loggedInUserUnit);
  const isWingScopedRole = isWingAdmin || isRestrictedUser;

  const visibleWings = React.useMemo(() => {
    if (!isWingScopedRole || !loggedInUserUnit) return wings;
    const parentWing = wings.find((w) =>
      w.units.some((u) => u.toLowerCase() === loggedInUserUnit.toLowerCase())
    );
    if (parentWing) {
      return [parentWing];
    }
    const fallbackWing = wings[0];
    return [
      {
        id: fallbackWing?.id || 'user-wing',
        name: fallbackWing?.name || 'Flying Wing',
        shortName: fallbackWing?.shortName || 'FLG WG',
        units: [loggedInUserUnit],
        preparedBy: fallbackWing?.preparedBy,
      },
    ];
  }, [isWingScopedRole, loggedInUserUnit, wings]);

  const userCanonicalUnit = React.useMemo(() => {
    if (!loggedInUserUnit) return null;
    const userWing = visibleWings[0];
    return (
      userWing?.units.find((u) => u.toLowerCase() === loggedInUserUnit.toLowerCase()) ||
      loggedInUserUnit
    );
  }, [loggedInUserUnit, visibleWings]);

  useEffect(() => {
    if (!isWingScopedRole || !userCanonicalUnit || visibleWings.length === 0) return;
    const userWing = visibleWings[0];
    const isAllowedTab = isWingAdmin
      ? activeTab.toLowerCase() === userWing.name.toLowerCase() ||
        userWing.units.some((u) => u.toLowerCase() === activeTab.toLowerCase())
      : activeTab.toLowerCase() === userWing.name.toLowerCase() ||
        activeTab.toLowerCase() === userCanonicalUnit.toLowerCase();

    if (!isAllowedTab) {
      setActiveWingId(userWing.id);
      setActiveTab(userCanonicalUnit);
      setUnitSubTab('state');
      setWingSubTab('consolidated');
    } else if (activeWingId !== userWing.id) {
      setActiveWingId(userWing.id);
    }
  }, [
    isWingScopedRole,
    isWingAdmin,
    userCanonicalUnit,
    visibleWings,
    activeTab,
    activeWingId,
  ]);

  const guestDisplayDayState: DayState = React.useMemo(
    () => ({
      date: dayState.date,
      formattedDisplayDate: dayState.formattedDisplayDate,
      preparedBy: INITIAL_PREPARED_BY,
      airmen155: [],
      unitAirmen: {},
      disposals: [],
      consolidatedUnits: wings.flatMap((w) => w.units).map((u) => createBlankUnitRow(u)),
      customRemarks: '',
      unitRemarks: {},
      savedCustomDisposals: [],
      updateLogs: [],
      rosterVersion: dayState.rosterVersion,
    }),
    [dayState.date, dayState.formattedDisplayDate, dayState.rosterVersion, wings]
  );
  const viewDayState = isGuestSession ? guestDisplayDayState : dayState;

  const activeWing = visibleWings.find((w) => w.id === activeWingId) || visibleWings[0];
  const activeWingPreparedBy = isGuestSession
    ? INITIAL_PREPARED_BY
    : getWingPreparedBy(activeWing, dayState.preparedBy);
  const isWingView = visibleWings.some((w) => w.name === activeTab);
  const activeUnitName = isWingView
    ? userCanonicalUnit || visibleWings[0]?.units[0] || '155 UASU BAF'
    : activeTab;

  const canEditUnitNominalRoll = React.useCallback(
    (unitName: string): boolean => {
      if (isGuestSession) return false;
      if (!isWingScopedRole || !userCanonicalUnit) return true;
      return unitName.trim().toLowerCase() === userCanonicalUnit.trim().toLowerCase();
    },
    [isGuestSession, isWingScopedRole, userCanonicalUnit]
  );

  const canQuickEditWingUnit = React.useCallback(
    (unitName: string): boolean => {
      if (isGuestSession) return false;
      if (isRestrictedUser) return false;
      if (isWingAdmin) {
        return activeWing.units.some(
          (u) => u.toLowerCase() === unitName.trim().toLowerCase()
        );
      }
      return true;
    },
    [activeWing.units, isGuestSession, isRestrictedUser, isWingAdmin]
  );

  const isOwnOfficeUnit = canEditUnitNominalRoll(activeUnitName);

  // Automatically redirect away from a hidden Sidebar menu to an allowed one
  useEffect(() => {
    const overviewAllowed = hasRolePermission(currentRole, 'menuOverview', rolePermissions);
    const squadronsAllowed = hasRolePermission(currentRole, 'menuSquadrons', rolePermissions);
    if (isWingView && !overviewAllowed && squadronsAllowed) {
      const targetUnit = userCanonicalUnit || activeWing?.units[0];
      if (targetUnit && targetUnit !== activeTab) {
        setActiveTab(targetUnit);
        setUnitSubTab('state');
      }
    } else if (!isWingView && !squadronsAllowed && overviewAllowed && activeWing) {
      if (activeTab !== activeWing.name) {
        setActiveTab(activeWing.name);
        setWingSubTab('consolidated');
      }
    }
  }, [
    currentRole,
    rolePermissions,
    isWingView,
    userCanonicalUnit,
    activeWing,
    activeTab,
  ]);

  // Update Airman Disposal directly from Nominal Roll dropdown
  const handleUpdateAirmanDisposal = (airmanId: string, disposalVal: string) => {
    if (
      (!canManage('manageNominalRoll') && !canManage('editUnitDisposals')) ||
      !canEditUnitNominalRoll(activeUnitName)
    ) {
      return;
    }
    const targetAirman = getUnitAirmen(dayState, activeUnitName).find((a) => a.id === airmanId);
    const targetLabel = targetAirman
      ? `${targetAirman.rank} ${targetAirman.name}${targetAirman.bdNo ? ` (BD ${targetAirman.bdNo})` : ''}`
      : airmanId;
    const actionDesc =
      disposalVal === '-'
        ? `Cleared disposal for ${targetLabel} (On Parade)`
        : `Updated disposal for ${targetLabel} → ${disposalVal}`;

    updateAndSaveState(
      (prev) => {
        const currentUnitAirmen = getUnitAirmen(prev, activeUnitName);
        const airman = currentUnitAirmen.find((a) => a.id === airmanId);
        if (!airman) return prev;

        if (disposalVal === '-') {
          const updatedDisposals = prev.disposals.filter((d) => d.airmanId !== airmanId);
          const updatedAirmen = currentUnitAirmen.map((a) =>
            a.id === airmanId ? { ...a, status: 'on_parade' as const, currentDuty: undefined } : a
          );
          return setUnitAirmen({ ...prev, disposals: updatedDisposals }, activeUnitName, updatedAirmen);
        } else {
          const dispOpt = DISPOSAL_OPTIONS.find((o) => o.value === disposalVal);
          const category = dispOpt ? dispOpt.category : 'custom';
          const isDet = category === 'detTdy';

          const existingIdx = prev.disposals.findIndex((d) => d.airmanId === airmanId);
          let updatedDisposals: DisposalRecord[];

          const newRecord: DisposalRecord = {
            id: existingIdx >= 0 ? prev.disposals[existingIdx].id : `disp-${Date.now()}-${airmanId}`,
            airmanId: airman.id,
            rank: airman.rank,
            name: airman.name,
            unit: activeUnitName,
            category,
            displayCategory: disposalVal,
            detail: disposalVal,
            date: prev.date,
            period: isDet ? 'Temporary' : 'Night',
          };

          if (existingIdx >= 0) {
            updatedDisposals = [...prev.disposals];
            updatedDisposals[existingIdx] = newRecord;
          } else {
            updatedDisposals = [...prev.disposals, newRecord];
          }

          const updatedAirmen = currentUnitAirmen.map((a) =>
            a.id === airmanId
              ? {
                  ...a,
                  status: (isDet ? 'detached' : 'duty') as Airman['status'],
                  currentDuty: disposalVal,
                }
              : a
          );

          const prevSavedCustom = prev.savedCustomDisposals ?? loadSavedCustomDisposals();
          const trimmedCustom = disposalVal.trim();
          const nextSavedCustom =
            category === 'custom' &&
            trimmedCustom &&
            !prevSavedCustom.some((c) => c.toLowerCase() === trimmedCustom.toLowerCase())
              ? [...prevSavedCustom, trimmedCustom]
              : prevSavedCustom;

          if (nextSavedCustom !== prevSavedCustom) {
            saveCustomDisposalsList(nextSavedCustom);
            markSettingsChangedForCloud(prev.preparedBy, nextSavedCustom);
          }

          return setUnitAirmen(
            {
              ...prev,
              disposals: updatedDisposals,
              savedCustomDisposals: nextSavedCustom,
            },
            activeUnitName,
            updatedAirmen
          );
        }
      },
      {
        area: 'Nominal Roll',
        unitName: activeUnitName,
        action: actionDesc,
      }
    );
  };

  // Add a custom disposal name persistently
  const handleAddCustomDisposal = (customName: string) => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    updateAndSaveState(
      (prev) => {
        const prevSavedCustom = prev.savedCustomDisposals ?? loadSavedCustomDisposals();
        if (prevSavedCustom.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
          return prev;
        }
        const nextSavedCustom = [...prevSavedCustom, trimmed];
        saveCustomDisposalsList(nextSavedCustom);
        markSettingsChangedForCloud(prev.preparedBy, nextSavedCustom);
        return {
          ...prev,
          savedCustomDisposals: nextSavedCustom,
        };
      },
      {
        area: 'Custom Disposal',
        unitName: activeWing.name,
        action: `Added custom disposal "${trimmed}"`,
      }
    );
  };

  // Delete a saved custom disposal manually via Cross button
  const handleDeleteCustomDisposal = (customName: string) => {
    updateAndSaveState(
      (prev) => {
        const targetLower = customName.trim().toLowerCase();
        const prevSavedCustom = prev.savedCustomDisposals ?? loadSavedCustomDisposals();
        const nextSavedCustom = prevSavedCustom.filter((c) => c.toLowerCase() !== targetLower);
        saveCustomDisposalsList(nextSavedCustom);
        markSettingsChangedForCloud(prev.preparedBy, nextSavedCustom);

        const affectedAirmanIds = new Set(
          prev.disposals
            .filter(
              (d) =>
                d.category === 'custom' &&
                (d.detail || d.displayCategory || '').trim().toLowerCase() === targetLower
            )
            .map((d) => d.airmanId)
            .filter(Boolean)
        );

        const updatedDisposals = prev.disposals.filter(
          (d) =>
            !(
              d.category === 'custom' &&
              (d.detail || d.displayCategory || '').trim().toLowerCase() === targetLower
            )
        );

        const resetAirmenList = (list: Airman[]) =>
          list.map((a) =>
            affectedAirmanIds.has(a.id)
              ? { ...a, status: 'on_parade' as const, currentDuty: undefined }
              : a
          );

        const nextUnitAirmen: Record<string, Airman[]> = {};
        if (prev.unitAirmen) {
          Object.entries(prev.unitAirmen).forEach(([u, list]) => {
            nextUnitAirmen[u] = resetAirmenList(list);
          });
        }

        const nextConsolidatedUnits = prev.consolidatedUnits.map((u) => {
          if (!u.customDisposals && !u.disposalCounts) return u;
          const nextCustom = u.customDisposals ? { ...u.customDisposals } : undefined;
          const nextCounts = u.disposalCounts ? { ...u.disposalCounts } : undefined;
          if (nextCustom) {
            Object.keys(nextCustom).forEach((k) => {
              if (k.trim().toLowerCase() === targetLower) delete nextCustom[k];
            });
          }
          if (nextCounts) {
            Object.keys(nextCounts).forEach((k) => {
              if (k.trim().toLowerCase() === targetLower) delete nextCounts[k];
            });
          }
          return { ...u, customDisposals: nextCustom, disposalCounts: nextCounts };
        });

        return {
          ...prev,
          savedCustomDisposals: nextSavedCustom,
          disposals: updatedDisposals,
          airmen155: resetAirmenList(prev.airmen155),
          unitAirmen: nextUnitAirmen,
          consolidatedUnits: nextConsolidatedUnits,
        };
      },
      {
        area: 'Custom Disposal',
        unitName: isWingView ? activeWing.name : activeUnitName,
        action: `Deleted custom disposal "${customName.trim()}"`,
      }
    );
  };

  // Remove Disposal Handler
  const handleRemoveDisposal = (disposalId: string) => {
    const dispTarget = dayState.disposals.find((d) => d.id === disposalId);
    const targetUnit = dispTarget?.unit || activeUnitName;
    if (!canManage('editUnitDisposals') || !canEditUnitNominalRoll(targetUnit)) return;
    updateAndSaveState(
      (prev) => {
        const dispToRemove = prev.disposals.find((d) => d.id === disposalId);
        const filteredDisposals = prev.disposals.filter((d) => d.id !== disposalId);

        if (dispToRemove && dispToRemove.airmanId) {
          const unit = dispToRemove.unit || activeUnitName;
          const updatedList = getUnitAirmen(prev, unit).map((a) =>
            a.id === dispToRemove.airmanId
              ? { ...a, status: 'on_parade' as const, currentDuty: undefined }
              : a
          );
          return setUnitAirmen({ ...prev, disposals: filteredDisposals }, unit, updatedList);
        }

        return {
          ...prev,
          disposals: filteredDisposals,
        };
      },
      {
        area: 'Unit State',
        unitName: dispTarget?.unit || activeUnitName,
        action: dispTarget
          ? `Removed disposal (${dispTarget.displayCategory || dispTarget.detail}) for ${dispTarget.rank} ${dispTarget.name}`
          : 'Removed disposal record',
      }
    );
  };

  // Quick toggle parade status
  const handleToggleAirmanParade = (airmanId: string) => {
    if (!canManage('editUnitDisposals') || !canEditUnitNominalRoll(activeUnitName)) return;
    const targetAirman = getUnitAirmen(dayState, activeUnitName).find((a) => a.id === airmanId);
    updateAndSaveState(
      (prev) => {
        const currentUnitAirmen = getUnitAirmen(prev, activeUnitName);
        const airman = currentUnitAirmen.find((a) => a.id === airmanId);
        if (!airman) return prev;

        if (airman.status === 'on_parade') {
          const newDisp: DisposalRecord = {
            id: `disp-${Date.now()}`,
            airmanId: airman.id,
            rank: airman.rank,
            name: airman.name,
            unit: activeUnitName,
            category: 'officeDuty',
            displayCategory: 'Office Duty',
            detail: 'Office Duty',
            date: prev.date,
            period: 'Night',
          };
          const updatedList = currentUnitAirmen.map((a) =>
            a.id === airmanId ? { ...a, status: 'duty' as const, currentDuty: 'Office Duty' } : a
          );
          return setUnitAirmen(
            { ...prev, disposals: [...prev.disposals, newDisp] },
            activeUnitName,
            updatedList
          );
        } else {
          const updatedList = currentUnitAirmen.map((a) =>
            a.id === airmanId ? { ...a, status: 'on_parade' as const, currentDuty: undefined } : a
          );
          return setUnitAirmen(
            { ...prev, disposals: prev.disposals.filter((d) => d.airmanId !== airmanId) },
            activeUnitName,
            updatedList
          );
        }
      },
      {
        area: 'Unit State',
        unitName: activeUnitName,
        action: targetAirman
          ? `Toggled parade status for ${targetAirman.rank} ${targetAirman.name}`
          : 'Toggled parade status',
      }
    );
  };

  // Add new airman to active unit roster (maintaining Rank & BD seniority & cross-unit BD uniqueness)
  const handleAddAirmanToRoster = (newAirmanData: Omit<Airman, 'id'>) => {
    const targetUnit = newAirmanData.unit || activeUnitName;
    if (!canManage('manageNominalRoll') || !canEditUnitNominalRoll(targetUnit)) return;
    updateAndSaveState(
      (prev) => {
        if (newAirmanData.bdNo && findExistingBdConflict(prev, newAirmanData.bdNo)) {
          return prev;
        }
        const currentList = getUnitAirmen(prev, targetUnit);
        const updatedList = sortAirmenBySeniority([
          ...currentList,
          {
            ...newAirmanData,
            unit: targetUnit,
            id: `airman-${Date.now()}`,
          },
        ]);
        return setUnitAirmen(prev, targetUnit, updatedList);
      },
      {
        area: 'Nominal Roll',
        unitName: targetUnit,
        action: `Added airman ${newAirmanData.rank} ${newAirmanData.name} (BD ${newAirmanData.bdNo || '-'})`,
      }
    );
  };

  // Bulk add multiple airmen to active unit roster (maintaining Rank & BD seniority & cross-unit BD uniqueness)
  const handleAddAirmenBulk = (newAirmenList: Omit<Airman, 'id'>[]) => {
    if (newAirmenList.length === 0) return;
    const targetUnit = newAirmenList[0].unit || activeUnitName;
    if (!canManage('manageNominalRoll') || !canEditUnitNominalRoll(targetUnit)) return;
    updateAndSaveState(
      (prev) => {
        const currentList = getUnitAirmen(prev, targetUnit);
        const existingGlobalBds = getAllExistingBdUnitMap(prev);
        const seenBatch = new Set<string>();
        const baseTime = Date.now();
        const created: Airman[] = [];

        newAirmenList.forEach((item, idx) => {
          const cleanBd = (item.bdNo || '').trim();
          if (!cleanBd || existingGlobalBds.has(cleanBd) || seenBatch.has(cleanBd)) {
            return;
          }
          seenBatch.add(cleanBd);
          created.push({
            ...item,
            bdNo: cleanBd,
            unit: item.unit || targetUnit,
            id: `airman-${baseTime}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          });
        });

        if (created.length === 0) return prev;
        const mergedSorted = sortAirmenBySeniority([...currentList, ...created]);
        return setUnitAirmen(prev, targetUnit, mergedSorted);
      },
      {
        area: 'Nominal Roll',
        unitName: targetUnit,
        action: `Imported ${newAirmenList.length} airmen to Nominal Roll`,
      }
    );
  };

  // Update Prepared By (independent per Wing)
  const handleSavePreparedBy = (updated: PreparedByInfo) => {
    if (!canManage('editPreparedBy')) return;
    const targetWingId = activeWing.id;
    const isFlyingWingTarget = targetWingId === 'flying-wing';
    const nextWings = saveWingsConfig(
      wings.map((w) => (w.id === targetWingId ? { ...w, preparedBy: updated } : w))
    );
    setWings(nextWings);
    if (isFlyingWingTarget) {
      savePreparedByStorage(updated);
    }
    updateAndSaveState(
      (prev) => {
        const customList = prev.savedCustomDisposals ?? loadSavedCustomDisposals();
        const nextRootPreparedBy = isFlyingWingTarget ? updated : prev.preparedBy;
        markSettingsChangedForCloud(nextRootPreparedBy, customList, { wings: nextWings });
        return isFlyingWingTarget
          ? {
              ...prev,
              preparedBy: updated,
            }
          : prev;
      },
      {
        area: 'Prepared By',
        unitName: activeWing.name,
        action: `Updated Prepared By signature (${updated.rank} ${updated.name})`,
      }
    );
    void flushCloudUploads();
  };

  // Update unit remarks (live typing, logged on blur via handleCommitRemarks)
  const handleUpdateRemarks = (remarks: string) => {
    if (!canManage('editUnitDisposals') || !canEditUnitNominalRoll(activeUnitName)) return;
    updateAndSaveState((prev) => setUnitRemarks(prev, activeUnitName, remarks));
  };

  const handleCommitRemarks = (remarks: string) => {
    if (!canManage('editUnitDisposals') || !canEditUnitNominalRoll(activeUnitName)) return;
    updateAndSaveState(
      (prev) => ({ ...setUnitRemarks(prev, activeUnitName, remarks) }),
      {
        area: 'Unit State',
        unitName: activeUnitName,
        action: `Updated unit remarks to "${remarks.trim() || 'Nil'}"`,
      }
    );
  };

  // Delete airman from active unit roster
  const handleDeleteAirman = (airmanId: string) => {
    if (!canManage('deleteNominalRollAirman') || !canEditUnitNominalRoll(activeUnitName)) return;
    const targetAirman = getUnitAirmen(dayState, activeUnitName).find((a) => a.id === airmanId);
    updateAndSaveState(
      (prev) => {
        const updatedList = getUnitAirmen(prev, activeUnitName).filter((a) => a.id !== airmanId);
        return setUnitAirmen(
          { ...prev, disposals: prev.disposals.filter((d) => d.airmanId !== airmanId) },
          activeUnitName,
          updatedList
        );
      },
      {
        area: 'Nominal Roll',
        unitName: activeUnitName,
        action: targetAirman
          ? `Removed airman ${targetAirman.rank} ${targetAirman.name} (BD ${targetAirman.bdNo || '-'})`
          : 'Removed airman from Nominal Roll',
      }
    );
  };

  // Full airman update (from clicking row in Nominal Roll)
  const handleUpdateAirmanFull = (updatedAirman: Airman, disposalVal: string) => {
    const targetUnit = updatedAirman.unit || activeUnitName;
    if (!canManage('manageNominalRoll') || !canEditUnitNominalRoll(targetUnit)) return;
    updateAndSaveState(
      (prev) => {
        if (
          updatedAirman.bdNo &&
          findExistingBdConflict(prev, updatedAirman.bdNo, updatedAirman.id)
        ) {
          return prev;
        }
        const updatedAirmen = sortAirmenBySeniority(
          getUnitAirmen(prev, targetUnit).map((a) =>
            a.id === updatedAirman.id ? { ...updatedAirman } : a
          )
        );

        let updatedDisposals = prev.disposals.filter((d) => d.airmanId !== updatedAirman.id);

        if (disposalVal && disposalVal !== '-') {
          const dispOpt = DISPOSAL_OPTIONS.find((o) => o.value === disposalVal);
          const category = dispOpt ? dispOpt.category : 'custom';
          const isDet = category === 'detTdy';

          const newRecord: DisposalRecord = {
            id: `disp-${Date.now()}-${updatedAirman.id}`,
            airmanId: updatedAirman.id,
            rank: updatedAirman.rank,
            name: updatedAirman.name,
            unit: targetUnit,
            category,
            displayCategory: disposalVal,
            detail: disposalVal,
            date: prev.date,
            period: isDet ? 'Temporary' : 'Night',
          };
          updatedDisposals.push(newRecord);
        }

        return setUnitAirmen({ ...prev, disposals: updatedDisposals }, targetUnit, updatedAirmen);
      },
      {
        area: 'Nominal Roll',
        unitName: targetUnit,
        action: `Updated ${updatedAirman.rank} ${updatedAirman.name} (BD ${updatedAirman.bdNo || '-'}) → ${disposalVal && disposalVal !== '-' ? disposalVal : 'On Parade'}`,
      }
    );
  };

  // Update Squadron in Wing Consolidated State
  const handleUpdateSquadronRow = (updatedRow: UnitRowState) => {
    if (!canManage('editQuickSqnCount') || !canQuickEditWingUnit(updatedRow.sqnUnit)) return;
    const rowWing =
      wings.find((w) =>
        w.units.some((u) => u.toLowerCase() === updatedRow.sqnUnit.toLowerCase())
      ) || activeWing;
    updateAndSaveState(
      (prev) => ({
        ...prev,
        consolidatedUnits: prev.consolidatedUnits.map((u) =>
          u.sqnUnit === updatedRow.sqnUnit ? updatedRow : u
        ),
      }),
      {
        area: `Consolidated State : ${rowWing.shortName}`,
        unitName: updatedRow.sqnUnit,
        action: `Updated Sqn count (Total Str: ${updatedRow.totalStr}, Out Parade: ${updatedRow.totalOutParade}, On Parade: ${updatedRow.onParadeForecast})`,
      }
    );
  };

  const openSettingsModal = (tab: SettingsTabId = 'theme') => {
    if (!canView('accessSettings') && currentRole !== 'OWNER') return;
    setSettingsInitialTab(tab);
    setIsSettingsOpen(true);
  };

  const handleAddUnitToWing = (
    wingId: string,
    unitName: string
  ): { ok: boolean; error?: string } => {
    if (!canManage('manageWingsAndUnits')) {
      return { ok: false, error: 'Unit management is restricted for your role.' };
    }
    const cleanUnit = unitName.trim();
    if (!cleanUnit) return { ok: false, error: 'Sqn/Unit name is required.' };
    const duplicate = wings.some((w) =>
      w.units.some((u) => u.toLowerCase() === cleanUnit.toLowerCase())
    );
    if (duplicate) {
      return { ok: false, error: `Sqn/Unit "${cleanUnit}" already exists.` };
    }

    const nextWings = saveWingsConfig(
      wings.map((w) => (w.id === wingId ? { ...w, units: [...w.units, cleanUnit] } : w))
    );
    setWings(nextWings);

    // Ensure the newly added Squadron/Unit exists in dayState.consolidatedUnits
    updateAndSaveState(
      (prev) => {
        const exists = prev.consolidatedUnits.some(
          (u) => u.sqnUnit.toLowerCase() === cleanUnit.toLowerCase()
        );
        if (exists) return prev;
        return {
          ...prev,
          consolidatedUnits: [...prev.consolidatedUnits, createBlankUnitRow(cleanUnit)],
        };
      },
      {
        area: 'Unit State',
        unitName: cleanUnit,
        action: `Added Sqn/Unit "${cleanUnit}"`,
      }
    );

    markSettingsChangedForCloud(
      dayState.preparedBy,
      dayState.savedCustomDisposals ?? loadSavedCustomDisposals(),
      { wings: nextWings }
    );
    void flushCloudUploads();
    return { ok: true };
  };

  const handleDeleteUnitFromWing = (wingId: string, unitName: string) => {
    if (!canManage('manageWingsAndUnits')) return;
    const nextWings = saveWingsConfig(
      wings.map((w) =>
        w.id === wingId
          ? { ...w, units: w.units.filter((u) => u.toLowerCase() !== unitName.toLowerCase()) }
          : w
      )
    );
    setWings(nextWings);
    if (activeTab.toLowerCase() === unitName.toLowerCase()) {
      setActiveWingId('flying-wing');
      setActiveTab('Flying Wing');
      setWingSubTab('consolidated');
    }
    markSettingsChangedForCloud(
      dayState.preparedBy,
      dayState.savedCustomDisposals ?? loadSavedCustomDisposals(),
      { wings: nextWings }
    );
    void flushCloudUploads();
  };

  const handleUpdateUnitConfig = (
    oldWingId: string,
    oldUnitName: string,
    newWingId: string,
    newUnitName: string
  ): { ok: boolean; error?: string } => {
    if (!canManage('manageWingsAndUnits')) {
      return { ok: false, error: 'Unit management is restricted for your role.' };
    }
    const cleanNewName = newUnitName.trim();
    if (!cleanNewName) {
      return { ok: false, error: 'Sqn/Unit name is required.' };
    }

    const isSameName = oldUnitName.toLowerCase() === cleanNewName.toLowerCase();
    if (!isSameName) {
      const duplicate = wings.some((w) =>
        w.units.some(
          (u) =>
            u.toLowerCase() !== oldUnitName.toLowerCase() &&
            u.toLowerCase() === cleanNewName.toLowerCase()
        )
      );
      if (duplicate) {
        return { ok: false, error: `Sqn/Unit "${cleanNewName}" already exists.` };
      }
    }

    const updatedWings = wings.map((w) => {
      if (oldWingId === newWingId) {
        if (w.id !== oldWingId) return w;
        return {
          ...w,
          units: w.units.map((u) =>
            u.toLowerCase() === oldUnitName.toLowerCase() ? cleanNewName : u
          ),
        };
      }
      if (w.id === oldWingId) {
        return {
          ...w,
          units: w.units.filter((u) => u.toLowerCase() !== oldUnitName.toLowerCase()),
        };
      }
      if (w.id === newWingId) {
        return {
          ...w,
          units: [...w.units.filter((u) => u.toLowerCase() !== cleanNewName.toLowerCase()), cleanNewName],
        };
      }
      return w;
    });

    const nextWings = saveWingsConfig(updatedWings);
    setWings(nextWings);

    if (activeTab.toLowerCase() === oldUnitName.toLowerCase()) {
      setActiveTab(cleanNewName);
      setActiveWingId(newWingId);
    }

    if (!isSameName) {
      updateAndSaveState(
        (prev) => {
          const oldAirmen = getUnitAirmen(prev, oldUnitName).map((a) => ({
            ...a,
            unit: cleanNewName,
          }));
          let nextState: DayState = setUnitAirmen(prev, cleanNewName, oldAirmen);
          if (oldUnitName === '155 UASU BAF') {
            nextState = { ...nextState, airmen155: [] };
          } else if (nextState.unitAirmen && oldUnitName in nextState.unitAirmen) {
            const nextMap = { ...nextState.unitAirmen };
            delete nextMap[oldUnitName];
            nextState = { ...nextState, unitAirmen: nextMap };
          }

          const oldRmks = getUnitRemarks(prev, oldUnitName);
          nextState = setUnitRemarks(nextState, cleanNewName, oldRmks);
          if (oldUnitName === '155 UASU BAF') {
            nextState = { ...nextState, customRemarks: '' };
          } else if (nextState.unitRemarks && oldUnitName in nextState.unitRemarks) {
            const nextRmksMap = { ...nextState.unitRemarks };
            delete nextRmksMap[oldUnitName];
            nextState = { ...nextState, unitRemarks: nextRmksMap };
          }

          nextState = {
            ...nextState,
            disposals: (nextState.disposals || []).map((d) =>
              d.unit.toLowerCase() === oldUnitName.toLowerCase()
                ? { ...d, unit: cleanNewName }
                : d
            ),
            consolidatedUnits: nextState.consolidatedUnits.map((row) =>
              row.sqnUnit.toLowerCase() === oldUnitName.toLowerCase()
                ? { ...row, sqnUnit: cleanNewName }
                : row
            ),
          };
          return nextState;
        },
        {
          area: 'Unit State',
          unitName: cleanNewName,
          action: `Updated Sqn/Unit "${oldUnitName}" to "${cleanNewName}"`,
        }
      );
    }

    markSettingsChangedForCloud(
      dayState.preparedBy,
      dayState.savedCustomDisposals ?? loadSavedCustomDisposals(),
      { wings: nextWings }
    );
    void flushCloudUploads();
    return { ok: true };
  };

  const handleDeleteAirmanByUnit = (unitName: string, airmanId: string) => {
    if (!canManage('manageUsers') || !canEditUnitNominalRoll(unitName)) return;
    const targetAirman = getUnitAirmen(dayState, unitName).find((a) => a.id === airmanId);
    updateAndSaveState(
      (prev) => {
        const updatedList = getUnitAirmen(prev, unitName).filter((a) => a.id !== airmanId);
        return setUnitAirmen(
          { ...prev, disposals: prev.disposals.filter((d) => d.airmanId !== airmanId) },
          unitName,
          updatedList
        );
      },
      {
        area: 'Nominal Roll',
        unitName,
        action: targetAirman
          ? `Removed airman ${targetAirman.rank} ${targetAirman.name} (BD ${targetAirman.bdNo || '-'})`
          : 'Removed airman from Nominal Roll',
      }
    );
  };

  const handleAddAirmanFromSettings = (newAirmanData: Omit<Airman, 'id'>) => {
    const targetUnit = newAirmanData.unit || activeUnitName;
    if (!canManage('manageUsers') || !canEditUnitNominalRoll(targetUnit)) return;
    updateAndSaveState(
      (prev) => {
        if (newAirmanData.bdNo && findExistingBdConflict(prev, newAirmanData.bdNo)) {
          return prev;
        }
        const currentList = getUnitAirmen(prev, targetUnit);
        const updatedList = sortAirmenBySeniority([
          ...currentList,
          {
            ...newAirmanData,
            role: currentRole === 'OWNER' ? newAirmanData.role || 'USER' : 'USER',
            unit: targetUnit,
            id: `airman-${Date.now()}`,
          },
        ]);
        return setUnitAirmen(prev, targetUnit, updatedList);
      },
      {
        area: 'Nominal Roll',
        unitName: targetUnit,
        action: `Added user ${newAirmanData.rank} ${newAirmanData.name} (BD ${newAirmanData.bdNo || '-'})`,
      }
    );
  };

  const handleUpdateUserProfile = (
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
  ) => {
    if (!canManage('manageUsers') || !canEditUnitNominalRoll(unitName)) return;
    const targetAirman = getUnitAirmen(dayState, unitName).find((a) => a.id === airmanId);
    const changes: string[] = [];
    if (
      currentRole === 'OWNER' &&
      updates.role &&
      updates.role !== (targetAirman?.role || 'USER')
    ) {
      changes.push(`Role → ${updates.role}`);
    }
    if (updates.adminPin !== undefined && updates.adminPin !== (targetAirman?.adminPin || '')) {
      changes.push(updates.adminPin ? 'Admin Login PIN updated' : 'Admin Login PIN cleared');
    }
    if (updates.name && updates.name !== targetAirman?.name) {
      changes.push(`Name → ${updates.name}`);
    }
    if (updates.rank && updates.rank !== targetAirman?.rank) {
      changes.push(`Rank → ${updates.rank}`);
    }

    updateAndSaveState(
      (prev) => {
        if (
          updates.bdNo &&
          findExistingBdConflict(prev, updates.bdNo, airmanId)
        ) {
          return prev;
        }
        const updatedList = getUnitAirmen(prev, unitName).map((a) => {
          if (a.id !== airmanId) return a;
          const next: Airman = { ...a };
          if (updates.rank !== undefined) next.rank = updates.rank;
          if (updates.name !== undefined) next.name = updates.name.trim();
          if (updates.bdNo !== undefined) next.bdNo = updates.bdNo.trim();
          if (updates.trade !== undefined) next.trade = updates.trade.trim();
          if (updates.flight !== undefined) next.flight = updates.flight.trim();
          if (currentRole === 'OWNER' && updates.role !== undefined) {
            next.role = updates.role;
          }
          if (updates.adminPin !== undefined) {
            const cleanPin = updates.adminPin.trim();
            if (cleanPin) {
              next.adminPin = cleanPin;
            } else {
              delete next.adminPin;
            }
          }
          return next;
        });
        return setUnitAirmen(prev, unitName, updatedList);
      },
      {
        area: 'Nominal Roll',
        unitName,
        action: targetAirman
          ? `Updated profile for ${targetAirman.rank} ${targetAirman.name} (BD ${targetAirman.bdNo || '-'})${
              changes.length ? `: ${changes.join(', ')}` : ''
            }`
          : 'Updated user profile in User Management',
      }
    );
  };

  const handleSaveRolePermissions = (next: RolePermissionsConfig) => {
    if (currentRole !== 'OWNER') return;
    const saved = saveRolePermissions(next);
    setRolePermissions(saved);
    markSettingsChangedForCloud(
      dayState.preparedBy,
      dayState.savedCustomDisposals ?? loadSavedCustomDisposals(),
      { rolePermissions: saved }
    );
    void flushCloudUploads();
  };

  const handlePullLatestFromCloud = async () => {
    const result = await downloadFromCloudOnEnter(dateIso);
    let nextWings = wings;
    if (result.settings) {
      savePreparedByStorage(result.settings.preparedBy);
      saveCustomDisposalsList(result.settings.savedCustomDisposals);
      saveHiddenQuickEditDisposals(result.settings.hiddenQuickEditDisposals);
      if (Array.isArray(result.settings.recentUserIds)) {
        const mergedRecent = mergeRecentUserIds(result.settings.recentUserIds, loadRecentUserIds());
        saveRecentUserIdsList(mergedRecent);
        setRecentUserIds(mergedRecent);
      }
      if (Array.isArray(result.settings.loginHistory)) {
        const mergedHistory = mergeLoginHistoryLists(result.settings.loginHistory, loadLoginHistory());
        saveLoginHistoryList(mergedHistory);
        setLoginHistory(mergedHistory);
      }
      if (typeof result.settings.appNotice === 'string') {
        saveAppNoticeStorage(result.settings.appNotice);
        setAppNotice(result.settings.appNotice);
        setIsNoticeDismissed(false);
      }
      if (Array.isArray(result.settings.wings) && result.settings.wings.length > 0) {
        nextWings = saveWingsConfig(result.settings.wings);
        setWings(nextWings);
      }
      if (result.settings.rolePermissions) {
        const savedPerms = saveRolePermissions(result.settings.rolePermissions);
        setRolePermissions(savedPerms);
      }
      syncedSettingsHashRef.current = computeSettingsFingerprint(result.settings);
    }

    let normalizedPrior: DayState | null = null;
    if (result.priorCloudDayState) {
      normalizedPrior = normalizeDayState(result.priorCloudDayState);
      saveDayState(normalizedPrior);
    }

    if (result.dayState) {
      const baseCloud = normalizeDayState(result.dayState);
      const normalizedCloud = ensureDayStateHasConfiguredUnits(
        carryForwardPriorUnitRows(baseCloud, normalizedPrior),
        nextWings
      );
      if (result.settings) {
        normalizedCloud.preparedBy = result.settings.preparedBy;
        normalizedCloud.savedCustomDisposals = result.settings.savedCustomDisposals;
      }
      saveDayState(normalizedCloud);
      syncedDayHashesRef.current.set(normalizedCloud.date, computeDayFingerprint(baseCloud));
      setDayState(normalizedCloud);
    }
  };

  const handleSyncNowToCloud = async () => {
    const currentSettings: CloudSettings = {
      preparedBy: dayState.preparedBy,
      savedCustomDisposals: dayState.savedCustomDisposals ?? loadSavedCustomDisposals(),
      hiddenQuickEditDisposals: loadHiddenQuickEditDisposals(),
      recentUserIds: loadRecentUserIds(),
      loginHistory: loadLoginHistory(),
      appNotice: loadAppNotice(),
      wings: loadWingsConfig(),
      rolePermissions: loadRolePermissions(),
    };
    await uploadDayToCloud(dayState);
    syncedDayHashesRef.current.set(dayState.date, computeDayFingerprint(dayState));
    dirtyDaysRef.current.delete(dayState.date);
    await uploadSettingsToCloud(currentSettings);
    syncedSettingsHashRef.current = computeSettingsFingerprint(currentSettings);
    dirtySettingsRef.current = null;
  };

  const handleClearLoginHistory = () => {
    if (!canManage('settingsHistory')) return;
    saveLoginHistoryList([]);
    setLoginHistory([]);
    markSettingsChangedForCloud(
      dayState.preparedBy,
      dayState.savedCustomDisposals ?? loadSavedCustomDisposals(),
      { loginHistory: [] }
    );
    void flushCloudUploads();
  };

  const handleSaveAppNotice = (notice: string) => {
    if (!canManage('settingsNotice')) return;
    const clean = saveAppNoticeStorage(notice);
    setAppNotice(clean);
    setIsNoticeDismissed(false);
    markSettingsChangedForCloud(
      dayState.preparedBy,
      dayState.savedCustomDisposals ?? loadSavedCustomDisposals(),
      { appNotice: clean }
    );
    void flushCloudUploads();
  };

  const activeUnitAirmenCount = getUnitAirmen(viewDayState, activeUnitName).length;
  const visibleDayLogs =
    isRestrictedUser && userCanonicalUnit
      ? (viewDayState.updateLogs || []).filter(
          (entry) => entry.unitName.toLowerCase() === userCanonicalUnit.toLowerCase()
        )
      : viewDayState.updateLogs || [];
  const activeWingLogsCount = visibleDayLogs.filter((entry) => {
    const entryUnitLower = (entry.unitName || '').trim().toLowerCase();
    return (
      entryUnitLower === activeWing.name.toLowerCase() ||
      entryUnitLower === activeWing.shortName.toLowerCase() ||
      activeWing.units.some((u) => u.toLowerCase() === entryUnitLower)
    );
  }).length;
  const activeUnitLogsCount = visibleDayLogs.filter(
    (entry) => entry.unitName === activeUnitName
  ).length;

  if (!verifiedOperator && !isGuestSession) {
    return (
      <>
        <LoginPortalView
          dayState={dayState}
          wings={wings}
          recentUserIds={recentUserIds}
          onRemoveRecentUserId={handleRemoveRecentUserId}
          onLogin={handleOperatorVerified}
          onSignUp={handleSignUpFromPortal}
          onGuestLogin={handleGuestLogin}
        />
        <OfflineIndicator />
      </>
    );
  }

  if (isCalendarOpen) {
    return (
      <>
        <DatePickerModal
          isOpen={true}
          selectedDateIso={dateIso}
          onSelectDate={(iso) => {
            handleDateChange(iso);
            setIsCalendarOpen(false);
          }}
          onClose={() => setIsCalendarOpen(false)}
        />
        <OfflineIndicator />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex font-sans antialiased selection:bg-emerald-500 selection:text-black print:block print:min-h-0 print:w-full print:bg-white">
      {/* Left Navigation Sidebar (Pic 2 Layout) */}
      {!isQuickEditActive && !isPrintOpen && (
        <Sidebar
          wings={visibleWings}
          activeWingId={activeWing.id}
          activeTab={activeTab}
          dayState={viewDayState}
          operator={verifiedOperator}
          operatorRole={currentRole}
          brandTitle={
            isRestrictedUser && userCanonicalUnit
              ? userCanonicalUnit
              : isWingAdmin
                ? activeWing.shortName || activeWing.name
                : 'BAF BASE ZHR'
          }
          sidebarAllowedUnits={
            isRestrictedUser && userCanonicalUnit ? [userCanonicalUnit] : undefined
          }
          isCollapsed={isSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          isSettingsOpen={isSettingsOpen}
          canAccessSettings={canView('accessSettings')}
          showOverview={canView('menuOverview')}
          showSquadrons={canView('menuSquadrons')}
          onToggleCollapse={() => setIsSidebarCollapsed((p) => !p)}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onSelectWing={(wing) => {
            setActiveWingId(wing.id);
            setActiveTab(wing.name);
            setWingSubTab('consolidated');
          }}
          onSelectUnit={(unitName, wingId) => handleTabChange(unitName, wingId)}
          onOpenSettings={() => openSettingsModal('theme')}
          onLogout={handleLogout}
        />
      )}

      {/* Right Main Workspace Column */}
      <div
        className={
          isPrintOpen
            ? 'no-print flex-1 flex flex-col min-w-0'
            : 'flex-1 flex flex-col min-w-0'
        }
      >
        {/* Top Header Bar hidden during isolated Quick Edit Sqn Count page */}
        {!isQuickEditActive && (
          <ControlsBar
            dateIso={dateIso}
            formattedDate={dayState.formattedDisplayDate}
            onPrevDate={handlePrevDate}
            onNextDate={handleNextDate}
            onOpenCalendar={() => setIsCalendarOpen(true)}
            onOpenPrint={() => canView('exportPrintReport') && setIsPrintOpen(true)}
            activeTab={activeTab}
            isWingView={isWingView}
            wingSubTab={wingSubTab}
            unitSubTab={unitSubTab}
            operator={verifiedOperator}
            canExportPrint={canView('exportPrintReport')}
            canOpenCloudSync={canView('accessSettings') && canView('manageCloudAndNotice')}
            onLogout={handleLogout}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onOpenCloudSync={() => openSettingsModal('sync')}
          />
        )}

        {/* Shared App Notice Banner (managed in Settings -> App Notice, hidden for Guest format-only preview) */}
        {!isQuickEditActive && !isGuestSession && appNotice.trim() && !isNoticeDismissed && (
          <div className="w-full max-w-7xl mx-auto px-3 sm:px-5 pt-3">
            <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-amber-950/35 border border-amber-500/35 text-amber-200 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate sm:whitespace-normal font-medium">{appNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsNoticeDismissed(true)}
                aria-label="Dismiss notice"
                className="text-amber-300/70 hover:text-amber-100 p-0.5 cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 w-full pt-3 sm:pt-4 pb-6">
          {(isWingView && !canView('menuOverview')) || (!isWingView && !canView('menuSquadrons')) ? (
            <div className="w-full max-w-3xl mx-auto px-4 py-12">
              <div className="bg-[#0d1728] border border-amber-500/35 rounded-2xl p-6 text-center space-y-2">
                <Lock className="w-7 h-7 text-amber-400 mx-auto" />
                <div className="text-sm font-bold text-white">Access Restricted by Owner</div>
                <div className="text-xs text-slate-400">
                  {isWingView ? 'Overview' : 'Squadrons / Units'} menu is currently hidden for{' '}
                  {currentRole}.
                </div>
              </div>
            </div>
          ) : isWingView ? (
            <>
              {/* Separate Sub-Option Boxes (Consolidated State, Prepared By, Update Log) */}
              {!isQuickEditActive && (
                <div className="w-full max-w-7xl mx-auto px-3 sm:px-5 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {canView('viewConsolidatedState') && (
                      <button
                        type="button"
                        onClick={() => {
                          setWingSubTab('consolidated');
                          setIsPreparedByOpen(false);
                        }}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all duration-300 ease-out cursor-pointer active:scale-95 ${
                          wingSubTab === 'consolidated' && !isPreparedByOpen
                            ? 'subtab-box-btn-active bg-gradient-to-r from-[#00d45e] via-[#00b853] to-[#059669] border-emerald-400/80 text-slate-950 shadow-md shadow-emerald-950/50 scale-[1.02]'
                            : 'subtab-box-btn bg-gradient-to-r from-[#0e192d] to-[#0a1322] border-[#1f3152] hover:border-emerald-500/50 text-slate-300 hover:text-white shadow-sm'
                        }`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                        <span>Consolidated State</span>
                      </button>
                    )}
                    {canManage('editPreparedBy') && (
                      <button
                        type="button"
                        onClick={() => requireOperatorAuth(() => setIsPreparedByOpen(true))}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all duration-300 ease-out cursor-pointer active:scale-95 ${
                          isPreparedByOpen
                            ? 'subtab-box-btn-active bg-gradient-to-r from-[#00d45e] via-[#00b853] to-[#059669] border-emerald-400/80 text-slate-950 shadow-md shadow-emerald-950/50 scale-[1.02]'
                            : 'subtab-box-btn bg-gradient-to-r from-[#0e192d] to-[#0a1322] border-[#1f3152] hover:border-emerald-500/50 text-slate-300 hover:text-white shadow-sm'
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>Prepared By</span>
                      </button>
                    )}
                    {canView('viewUpdateLog') && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsPreparedByOpen(false);
                          setWingSubTab('log');
                        }}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all duration-300 ease-out cursor-pointer active:scale-95 ${
                          wingSubTab === 'log' && !isPreparedByOpen
                            ? 'subtab-box-btn-active bg-gradient-to-r from-[#00d45e] via-[#00b853] to-[#059669] border-emerald-400/80 text-slate-950 shadow-md shadow-emerald-950/50 scale-[1.02]'
                            : 'subtab-box-btn bg-gradient-to-r from-[#0e192d] to-[#0a1322] border-[#1f3152] hover:border-emerald-500/50 text-slate-300 hover:text-white shadow-sm'
                        }`}
                      >
                        <History className="w-3.5 h-3.5 shrink-0" />
                        <span>Update Log</span>
                        <span
                          className={`subtab-count-pill ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                            wingSubTab === 'log' && !isPreparedByOpen
                              ? 'bg-slate-950/20 text-slate-950'
                              : 'bg-slate-900/70 text-slate-200'
                          }`}
                        >
                          {activeWingLogsCount}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div key={`${activeWing.id}-${wingSubTab}`} className="animate-tab-enter">
                {wingSubTab === 'log' ? (
                  canView('viewUpdateLog') ? (
                    <StateUpdateLogView
                      dayState={viewDayState}
                      wings={wings}
                      activeWing={activeWing}
                      lockedUnit={
                        isRestrictedUser && userCanonicalUnit ? userCanonicalUnit : undefined
                      }
                      isGuestView={isGuestSession}
                    />
                  ) : (
                    <div className="w-full max-w-3xl mx-auto px-4 py-12">
                      <div className="bg-[#0d1728] border border-amber-500/35 rounded-2xl p-6 text-center space-y-2">
                        <Lock className="w-7 h-7 text-amber-400 mx-auto" />
                        <div className="text-sm font-bold text-white">Access Restricted by Owner</div>
                        <div className="text-xs text-slate-400">
                          Update Log access is currently disabled for {currentRole}.
                        </div>
                      </div>
                    </div>
                  )
                ) : canView('viewConsolidatedState') ? (
                  <ConsolidatedWingView
                    dayState={viewDayState}
                    activeWing={activeWing}
                    preparedBy={activeWingPreparedBy}
                    canQuickEdit={canManage('editQuickSqnCount')}
                    showPreparedBy={canView('editPreparedBy')}
                    lockedUnit={
                      isRestrictedUser && userCanonicalUnit ? userCanonicalUnit : undefined
                    }
                    isGuestView={isGuestSession}
                    onUpdateSquadronRow={handleUpdateSquadronRow}
                    onSelectUnit={(unitName) => handleTabChange(unitName)}
                    onAddCustomDisposal={handleAddCustomDisposal}
                    onDeleteCustomDisposal={handleDeleteCustomDisposal}
                    onRequireAuth={requireOperatorAuth}
                    onEditingChange={setIsQuickEditActive}
                    onSettingsChanged={() =>
                      markSettingsChangedForCloud(
                        dayState.preparedBy,
                        dayState.savedCustomDisposals ?? loadSavedCustomDisposals()
                      )
                    }
                  />
                ) : (
                  <div className="w-full max-w-3xl mx-auto px-4 py-12">
                    <div className="bg-[#0d1728] border border-amber-500/35 rounded-2xl p-6 text-center space-y-2">
                      <Lock className="w-7 h-7 text-amber-400 mx-auto" />
                      <div className="text-sm font-bold text-white">Access Restricted by Owner</div>
                      <div className="text-xs text-slate-400">
                        Consolidated Wing State view is currently disabled for {currentRole}.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Separate Sub-Option Boxes inside each Squadron/Unit (Night Count State, Nominal Roll, Update Log) */}
              <div className="w-full max-w-7xl mx-auto px-3 sm:px-5 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  {canView('viewUnitDetails') && (
                    <button
                      type="button"
                      onClick={() => setUnitSubTab('state')}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all duration-300 ease-out cursor-pointer active:scale-95 ${
                        unitSubTab === 'state'
                          ? 'subtab-box-btn-active bg-gradient-to-r from-[#00d45e] via-[#00b853] to-[#059669] border-emerald-400/80 text-slate-950 shadow-md shadow-emerald-950/50 scale-[1.02]'
                          : 'subtab-box-btn bg-gradient-to-r from-[#0e192d] to-[#0a1322] border-[#1f3152] hover:border-emerald-500/50 text-slate-300 hover:text-white shadow-sm'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                      <span>Night Count State</span>
                    </button>
                  )}
                  {canView('manageNominalRoll') && (
                    <button
                      type="button"
                      onClick={() => setUnitSubTab('nominalRoll')}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all duration-300 ease-out cursor-pointer active:scale-95 ${
                        unitSubTab === 'nominalRoll'
                          ? 'subtab-box-btn-active bg-gradient-to-r from-[#00d45e] via-[#00b853] to-[#059669] border-emerald-400/80 text-slate-950 shadow-md shadow-emerald-950/50 scale-[1.02]'
                          : 'subtab-box-btn bg-gradient-to-r from-[#0e192d] to-[#0a1322] border-[#1f3152] hover:border-emerald-500/50 text-slate-300 hover:text-white shadow-sm'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>Nominal Roll</span>
                      <span
                        className={`subtab-count-pill ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                          unitSubTab === 'nominalRoll'
                            ? 'bg-slate-950/20 text-slate-950'
                            : 'bg-slate-900/70 text-slate-200'
                        }`}
                      >
                        {activeUnitAirmenCount}
                      </span>
                    </button>
                  )}
                  {canView('viewUnitUpdateLog') && (
                    <button
                      type="button"
                      onClick={() => setUnitSubTab('log')}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all duration-300 ease-out cursor-pointer active:scale-95 ${
                        unitSubTab === 'log'
                          ? 'subtab-box-btn-active bg-gradient-to-r from-[#00d45e] via-[#00b853] to-[#059669] border-emerald-400/80 text-slate-950 shadow-md shadow-emerald-950/50 scale-[1.02]'
                          : 'subtab-box-btn bg-gradient-to-r from-[#0e192d] to-[#0a1322] border-[#1f3152] hover:border-emerald-500/50 text-slate-300 hover:text-white shadow-sm'
                      }`}
                    >
                      <History className="w-3.5 h-3.5 shrink-0" />
                      <span>Update Log</span>
                      <span
                        className={`subtab-count-pill ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                          unitSubTab === 'log'
                            ? 'bg-slate-950/20 text-slate-950'
                            : 'bg-slate-900/70 text-slate-200'
                        }`}
                      >
                        {activeUnitLogsCount}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div key={`${activeUnitName}-${unitSubTab}`} className="animate-tab-enter">
                {unitSubTab === 'state' ? (
                  canView('viewUnitDetails') ? (
                    <UnitStateView
                      unitName={activeUnitName}
                      dayState={viewDayState}
                      onRemoveDisposal={handleRemoveDisposal}
                      onToggleAirmanParade={handleToggleAirmanParade}
                      onSelectAirmanForDisposal={() => setUnitSubTab('nominalRoll')}
                      onUpdateRemarks={handleUpdateRemarks}
                      onCommitRemarks={handleCommitRemarks}
                      onRequireAuth={requireOperatorAuth}
                      isOperatorVerified={Boolean(verifiedOperator)}
                      canEditRemarks={canManage('editUnitDisposals') && isOwnOfficeUnit}
                      isGuestView={isGuestSession}
                    />
                  ) : (
                    <div className="w-full max-w-3xl mx-auto px-4 py-12">
                      <div className="bg-[#0d1728] border border-amber-500/35 rounded-2xl p-6 text-center space-y-2">
                        <Lock className="w-7 h-7 text-amber-400 mx-auto" />
                        <div className="text-sm font-bold text-white">Access Restricted by Owner</div>
                        <div className="text-xs text-slate-400">
                          Unit Night Count State view is currently disabled for {currentRole}.
                        </div>
                      </div>
                    </div>
                  )
                ) : unitSubTab === 'nominalRoll' ? (
                  canView('manageNominalRoll') ? (
                    <NominalRollView
                      unitName={activeUnitName}
                      dayState={viewDayState}
                      onUpdateAirmanDisposal={handleUpdateAirmanDisposal}
                      onUpdateAirmanFull={handleUpdateAirmanFull}
                      onAddAirman={handleAddAirmanToRoster}
                      onAddAirmenBulk={handleAddAirmenBulk}
                      onDeleteAirman={handleDeleteAirman}
                      onDeleteCustomDisposal={handleDeleteCustomDisposal}
                      onRequireAuth={requireOperatorAuth}
                      canEditDisposals={canManage('editUnitDisposals') && isOwnOfficeUnit}
                      canManageNominalRoll={canManage('manageNominalRoll') && isOwnOfficeUnit}
                      canDeleteAirman={canManage('deleteNominalRollAirman') && isOwnOfficeUnit}
                      readOnlyScopeNote={
                        !isOwnOfficeUnit && isWingAdmin && userCanonicalUnit
                          ? `View Only — ADMIN can only manage Nominal Roll for own office (${userCanonicalUnit}). Other Wing Squadrons are managed via Consolidated Quick Edit.`
                          : undefined
                      }
                      isGuestView={isGuestSession}
                    />
                  ) : (
                    <div className="w-full max-w-3xl mx-auto px-4 py-12">
                      <div className="bg-[#0d1728] border border-amber-500/35 rounded-2xl p-6 text-center space-y-2">
                        <Lock className="w-7 h-7 text-amber-400 mx-auto" />
                        <div className="text-sm font-bold text-white">Access Restricted by Owner</div>
                        <div className="text-xs text-slate-400">
                          Nominal Roll access is currently disabled for {currentRole}.
                        </div>
                      </div>
                    </div>
                  )
                ) : canView('viewUnitUpdateLog') ? (
                  <StateUpdateLogView
                    dayState={viewDayState}
                    wings={wings}
                    activeWing={activeWing}
                    unitFilter={activeUnitName}
                    lockedUnit={
                      isRestrictedUser && userCanonicalUnit ? userCanonicalUnit : undefined
                    }
                    isGuestView={isGuestSession}
                  />
                ) : (
                  <div className="w-full max-w-3xl mx-auto px-4 py-12">
                    <div className="bg-[#0d1728] border border-amber-500/35 rounded-2xl p-6 text-center space-y-2">
                      <Lock className="w-7 h-7 text-amber-400 mx-auto" />
                      <div className="text-sm font-bold text-white">Access Restricted by Owner</div>
                      <div className="text-xs text-slate-400">
                        Update Log access is currently disabled for {currentRole}.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        {/* Bottom Workspace Footer (Pic 2 Style) */}
        {!isQuickEditActive && (
          <footer className="border-t border-[#142036] bg-[#060c17] px-4 sm:px-6 py-2.5 text-[11px] text-slate-400">
            <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5">
              <span className="font-semibold text-slate-300">
                {isRestrictedUser && userCanonicalUnit
                  ? userCanonicalUnit
                  : isWingAdmin
                    ? activeWing.shortName || activeWing.name
                    : 'BAF BASE ZHR'}{' '}
                • Night Count State System
              </span>
              <span className="text-slate-500">
                Bangladesh Air Force • Confidential Personnel Night Count Register
              </span>
            </div>
          </footer>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        initialTab={settingsInitialTab}
        onClose={() => setIsSettingsOpen(false)}
        operator={verifiedOperator}
        operatorRole={currentRole}
        themePref={themePref}
        onChangeThemePref={handleChangeThemePref}
        rolePermissions={rolePermissions}
        onSaveRolePermissions={handleSaveRolePermissions}
        canManageWings={canManage('manageWingsAndUnits')}
        canManageUsers={canManage('manageUsers')}
        canManageCloudAndNotice={canManage('manageCloudAndNotice')}
        isGuestView={isGuestSession}
        loginHistory={
          isGuestSession
            ? []
            : isRestrictedUser && verifiedOperator
              ? loginHistory.filter((h) => h.bdNo === verifiedOperator.bdNo)
              : loginHistory
        }
        onRefreshLoginHistory={handlePullLatestFromCloud}
        onClearLoginHistory={handleClearLoginHistory}
        onSyncNowToCloud={handleSyncNowToCloud}
        onPullLatestFromCloud={handlePullLatestFromCloud}
        appNotice={isGuestSession ? '' : appNotice}
        onSaveAppNotice={handleSaveAppNotice}
        onRequireAuth={requireOperatorAuth}
        dayState={viewDayState}
        wings={
          isGuestSession
            ? visibleWings.map((w) => ({ ...w, preparedBy: undefined }))
            : visibleWings
        }
        restrictedUnitName={isRestrictedUser && userCanonicalUnit ? userCanonicalUnit : undefined}
        onAddUnitToWing={handleAddUnitToWing}
        onUpdateUnitConfig={handleUpdateUnitConfig}
        onDeleteUnitFromWing={handleDeleteUnitFromWing}
        onOpenUnitNominalRoll={(unitName) => {
          handleTabChange(unitName);
          setUnitSubTab('nominalRoll');
        }}
        onAddAirmanFromSettings={handleAddAirmanFromSettings}
        onDeleteAirmanFromSettings={handleDeleteAirmanByUnit}
        onUpdateUserProfile={handleUpdateUserProfile}
      />

      {/* Operator Authentication Modal */}
      <OperatorAuthModal
        isOpen={isOperatorAuthOpen}
        dayState={dayState}
        initialOperator={verifiedOperator}
        onVerify={handleOperatorVerified}
        onCancel={handleOperatorAuthCancel}
      />

      {/* Prepared By Modal */}
      <PreparedByModal
        isOpen={isPreparedByOpen}
        onClose={() => setIsPreparedByOpen(false)}
        preparedBy={activeWingPreparedBy}
        wingName={activeWing.name}
        onSave={handleSavePreparedBy}
      />

      {/* Official Export / Print Modal */}
      <PrintReportModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        dayState={viewDayState}
        activeTab={activeTab}
        activeWing={isGuestSession ? { ...activeWing, preparedBy: undefined } : activeWing}
        unitSubTab={unitSubTab === 'nominalRoll' ? 'nominalRoll' : 'state'}
        canDownloadExports={canManageRolePermission(currentRole, 'exportPrintReport', rolePermissions)}
      />

      <OfflineIndicator />
    </div>
  );
}
