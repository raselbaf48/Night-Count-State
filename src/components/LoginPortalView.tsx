import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  Shield,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { DayState, OperatorProfile, Rank, UserRole, WingConfig } from '../types/nightCount';
import { BAF_ALL_RANKS, BAF_FLIGHTS, BAF_TRADES } from '../data/initialData';
import {
  findExistingBdConflict,
  findOperatorByBd,
  getAllConfiguredUnits,
} from '../utils/storage';

export interface SignUpPayload {
  unit: string;
  wing: string;
  rank: Rank;
  bdNo: string;
  name: string;
  trade: string;
  flight: string;
}

type RegisterFieldKey = 'unit' | 'wing' | 'rank' | 'bdNo' | 'name' | 'trade' | 'flight';

interface LoginPortalViewProps {
  dayState: DayState;
  wings: WingConfig[];
  recentUserIds: string[];
  onRemoveRecentUserId: (bdNo: string) => void;
  onLogin: (operator: OperatorProfile) => void;
  onSignUp: (payload: SignUpPayload) => { ok: boolean; error?: string };
  onGuestLogin: () => void;
}

export const LoginPortalView: React.FC<LoginPortalViewProps> = ({
  dayState,
  wings,
  recentUserIds,
  onRemoveRecentUserId,
  onLogin,
  onSignUp,
  onGuestLogin,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [userId, setUserId] = useState<string>('');
  const [loginPin, setLoginPin] = useState<string>('');
  const [showPinText, setShowPinText] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isPinFocused, setIsPinFocused] = useState(false);
  const [showRecentMenu, setShowRecentMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);

  const pinInputRef = useRef<HTMLInputElement>(null);
  const allConfiguredUnits = useMemo(() => getAllConfiguredUnits(wings), [wings]);

  // Register form state — NO box is pre-filled by default, all use floating notched-border labels
  const [regUnit, setRegUnit] = useState<string>('');
  const [isCustomUnit, setIsCustomUnit] = useState<boolean>(false);
  const [regWing, setRegWing] = useState<string>('');
  const [isCustomWing, setIsCustomWing] = useState<boolean>(false);
  const [regRank, setRegRank] = useState<string>('');
  const [regBdNo, setRegBdNo] = useState<string>('');
  const [regName, setRegName] = useState<string>('');
  const [regTrade, setRegTrade] = useState<string>('');
  const [isCustomTrade, setIsCustomTrade] = useState<boolean>(false);
  const [regFlight, setRegFlight] = useState<string>('');
  const [focusedRegField, setFocusedRegField] = useState<RegisterFieldKey | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const userIdSectionRef = useRef<HTMLDivElement>(null);

  // Filter unit options when an existing Wing is selected; otherwise show all configured units
  const unitOptionsForSelectedWing = useMemo(() => {
    if (!isCustomWing && regWing.trim()) {
      const matchedWing = wings.find(
        (w) => w.name.toLowerCase() === regWing.trim().toLowerCase()
      );
      if (matchedWing) {
        return matchedWing.units;
      }
    }
    return allConfiguredUnits;
  }, [allConfiguredUnits, isCustomWing, regWing, wings]);

  // Close Recent Accounts dropdown when clicking outside the User ID section
  useEffect(() => {
    if (!showRecentMenu) return;
    const handleOutsideMouseDown = (e: MouseEvent) => {
      if (userIdSectionRef.current && !userIdSectionRef.current.contains(e.target as Node)) {
        setShowRecentMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideMouseDown);
    return () => document.removeEventListener('mousedown', handleOutsideMouseDown);
  }, [showRecentMenu]);

  const getAccountPinDetails = (rawBd: string) => {
    const cleanId = rawBd.trim();
    if (!/^\d{6}$/.test(cleanId)) {
      return {
        matchedOperator: null,
        matchedAirman: null,
        role: 'USER' as UserRole,
        requiresPin: false,
        expectedPin: '',
        hasCustomPin: false,
      };
    }
    const conflict = findExistingBdConflict(dayState, cleanId);
    const matchedAirman = conflict?.airman || null;
    const matchedOperator = findOperatorByBd(dayState, cleanId);
    const role: UserRole =
      matchedAirman?.role || (cleanId === '474455' ? 'OWNER' : 'USER');
    const configuredPin = (matchedAirman?.adminPin || '').trim();
    const isElevated =
      role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'OWNER';
    const requiresPin = Boolean(
      matchedOperator && (isElevated || Boolean(configuredPin))
    );
    const expectedPin = configuredPin || '1124';
    return {
      matchedOperator,
      matchedAirman,
      role,
      requiresPin,
      expectedPin,
      hasCustomPin: Boolean(configuredPin),
    };
  };

  const activePinDetails = useMemo(
    () => getAccountPinDetails(userId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dayState, userId]
  );

  // Automatically focus the PIN input box when a 6-digit elevated User ID is entered
  useEffect(() => {
    if (mode === 'login' && activePinDetails.requiresPin) {
      setShowRecentMenu(false);
      const timer = window.setTimeout(() => {
        pinInputRef.current?.focus();
      }, 30);
      return () => window.clearTimeout(timer);
    }
  }, [mode, activePinDetails.requiresPin, userId]);

  const handleUserIdChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setUserId(digits);
    setLoginPin('');
    setError(null);
    setRegisterSuccess(null);
  };

  const handlePinChange = (rawPin: string) => {
    const cleanPin = rawPin.replace(/\s/g, '').slice(0, 12);
    setLoginPin(cleanPin);
    setError(null);
    if (
      activePinDetails.requiresPin &&
      activePinDetails.matchedOperator &&
      cleanPin &&
      cleanPin === activePinDetails.expectedPin
    ) {
      onLogin(activePinDetails.matchedOperator);
    }
  };

  const loginWithId = (rawId: string, providedPin?: string) => {
    setError(null);
    const cleanId = rawId.trim();
    if (!/^\d{6}$/.test(cleanId)) {
      setError('Enter your 6-digit BD No as User ID.');
      return;
    }

    const details = getAccountPinDetails(cleanId);
    if (!details.matchedOperator) {
      setError(
        'User ID (BD No) not found in Nominal Roll. Please Register or use Guest Login.'
      );
      return;
    }

    if (details.requiresPin) {
      const candidatePin = (providedPin !== undefined ? providedPin : loginPin).trim();
      if (!candidatePin) {
        setShowRecentMenu(false);
        setError(`Enter your ${details.role.replace('_', ' ')} Login PIN to continue.`);
        window.setTimeout(() => pinInputRef.current?.focus(), 20);
        return;
      }
      if (candidatePin !== details.expectedPin) {
        setError('Invalid Login PIN. Please enter the correct PIN.');
        window.setTimeout(() => pinInputRef.current?.focus(), 20);
        return;
      }
    }

    onLogin(details.matchedOperator);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowRecentMenu(false);
    loginWithId(userId, loginPin);
  };

  const handleSelectRecent = (id: string) => {
    setUserId(id);
    setLoginPin('');
    setShowRecentMenu(false);
    setError(null);
    setRegisterSuccess(null);
    const details = getAccountPinDetails(id);
    if (details.requiresPin) {
      window.setTimeout(() => pinInputRef.current?.focus(), 30);
      return;
    }
    loginWithId(id, '');
  };

  const resetRegisterForm = () => {
    setRegUnit('');
    setIsCustomUnit(false);
    setRegWing('');
    setIsCustomWing(false);
    setRegRank('');
    setRegBdNo('');
    setRegName('');
    setRegTrade('');
    setIsCustomTrade(false);
    setRegFlight('');
    setFocusedRegField(null);
    setRegisterError(null);
  };

  const openRegisterMode = () => {
    setError(null);
    setRegisterSuccess(null);
    setShowRecentMenu(false);
    resetRegisterForm();
    setMode('signup');
  };

  const handleUnitSelectChange = (val: string) => {
    setRegisterError(null);
    if (val === '__CUSTOM__') {
      setIsCustomUnit(true);
      setRegUnit('');
      return;
    }
    setRegUnit(val);
    if (!isCustomWing && val) {
      const parentWing = wings.find((w) =>
        w.units.some((u) => u.toLowerCase() === val.toLowerCase())
      );
      if (parentWing) {
        setRegWing(parentWing.name);
      }
    }
  };

  const handleWingSelectChange = (val: string) => {
    setRegisterError(null);
    if (val === '__CUSTOM__') {
      setIsCustomWing(true);
      setRegWing('');
      return;
    }
    setRegWing(val);
    if (!isCustomUnit && regUnit) {
      const matchedWing = wings.find((w) => w.name.toLowerCase() === val.toLowerCase());
      if (
        matchedWing &&
        !matchedWing.units.some((u) => u.toLowerCase() === regUnit.toLowerCase())
      ) {
        setRegUnit('');
      }
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);

    const cleanUnit = regUnit.trim();
    const cleanWing = regWing.trim();
    const cleanBd = regBdNo.replace(/\D/g, '').slice(0, 6);
    const cleanName = regName.trim();

    if (!cleanUnit) {
      setRegisterError('Please select or enter Office / Sqn / Unit.');
      return;
    }
    if (!cleanWing) {
      setRegisterError('Please select or enter Wing.');
      return;
    }
    if (!regRank) {
      setRegisterError('Please select your Rank.');
      return;
    }
    if (!/^\d{6}$/.test(cleanBd)) {
      setRegisterError('USER ID (BD No) must be exactly 6 digits.');
      return;
    }
    if (!cleanName) {
      setRegisterError('Please enter your Name.');
      return;
    }
    const cleanTrade = regTrade.trim();
    if (!cleanTrade) {
      setRegisterError('Please select or enter your Trade.');
      return;
    }
    if (!regFlight) {
      setRegisterError('Please select your Flight.');
      return;
    }

    if (findExistingBdConflict(dayState, cleanBd)) {
      setRegisterError(`USER ID ${cleanBd} is already registered. Please log in instead.`);
      return;
    }

    const res = onSignUp({
      unit: cleanUnit,
      wing: cleanWing,
      rank: regRank as Rank,
      bdNo: cleanBd,
      name: cleanName,
      trade: cleanTrade,
      flight: regFlight,
    });

    if (!res.ok) {
      setRegisterError(res.error || 'Could not complete registration.');
      return;
    }

    const registeredRank = regRank;
    resetRegisterForm();
    setUserId('');
    setError(null);
    setRegisterSuccess(
      `Registered ${registeredRank} ${cleanName} (BD/${cleanBd}) and added to ${cleanUnit} (${cleanWing}) Nominal Roll & User Management. Log in with USER ID ${cleanBd}.`
    );
    setMode('login');
  };

  const getFloatLabelClass = (field: RegisterFieldKey, value: string, extraLeft = 'left-3.5') => {
    const isFieldFocused = focusedRegField === field;
    const isFloating = isFieldFocused || value.length > 0;
    return `absolute ${extraLeft} pointer-events-none transition-all duration-150 uppercase tracking-wider font-bold z-10 ${
      isFloating
        ? `top-1 -translate-y-1/2 px-1.5 bg-[#0d1728] text-[10px] ${
            isFieldFocused ? 'text-emerald-400' : 'text-slate-400'
          }`
        : 'top-[calc(50%+2px)] -translate-y-1/2 text-xs text-slate-400'
    }`;
  };

  const getFieldBorderClass = (field: RegisterFieldKey) =>
    focusedRegField === field ? 'border-emerald-500' : 'border-slate-700/80';

  const isLabelFloating = isFocused || userId.length > 0;
  const quickAccessIds = recentUserIds.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#060c18] text-slate-100 flex items-center justify-center px-4 py-8 font-sans antialiased selection:bg-emerald-500 selection:text-black relative overflow-hidden">
      {/* Subtle radial background glow matching portal aesthetic */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 42%, rgba(16, 185, 129, 0.09), rgba(6, 12, 24, 0) 60%)',
        }}
      />

      <div
        className={`relative w-full ${
          mode === 'signup' ? 'max-w-[460px]' : 'max-w-[380px]'
        } bg-[#0d1728] border border-slate-800/90 rounded-2xl p-7 sm:p-8 shadow-2xl shadow-black/70 transition-all`}
      >
        {/* Crest & Portal Title */}
        <div className="flex flex-col items-center text-center mb-6">
          <img
            src="/air-force-logo.png"
            alt="Bangladesh Air Force Crest"
            className="w-16 h-16 object-contain mb-3.5 drop-shadow-[0_0_6px_rgba(255,255,255,0.28)]"
          />

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold tracking-wider uppercase">
            <Shield className="w-3 h-3 shrink-0" />
            <span>{mode === 'signup' ? 'USER REGISTER' : 'USER LOGIN PORTAL'}</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide uppercase mt-3">
            BAF BASE ZHR
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {mode === 'signup'
              ? 'Register to Office Nominal Roll & User Management'
              : 'Daily Night Count State'}
          </p>
        </div>

        {mode === 'login' ? (
          /* USER ID Login Form */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {registerSuccess && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>{registerSuccess}</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Floating Notched-Border USER ID Field + Inline Click-only Recent Accounts Box */}
            <div ref={userIdSectionRef} className="space-y-2.5">
              <div className="relative pt-1">
                <label
                  htmlFor="portal-user-id"
                  className={`absolute left-3.5 pointer-events-none transition-all duration-150 uppercase tracking-wider font-bold ${
                    isLabelFloating
                      ? `top-1 -translate-y-1/2 px-1.5 bg-[#0d1728] text-[10px] ${
                          isFocused ? 'text-emerald-400' : 'text-slate-400'
                        }`
                      : 'top-[calc(50%+2px)] -translate-y-1/2 text-xs text-slate-400'
                  }`}
                >
                  USER ID
                </label>
                <input
                  id="portal-user-id"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={userId}
                  onFocus={() => {
                    setIsFocused(true);
                    setShowRecentMenu(true);
                  }}
                  onClick={() => setShowRecentMenu(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowRecentMenu(false);
                    }
                  }}
                  onChange={(e) => handleUserIdChange(e.target.value)}
                  aria-label="USER ID"
                  className={`w-full bg-[#08101e] rounded-xl px-4 py-3 text-sm font-semibold text-white tracking-wider focus:outline-none transition-colors tabular-nums border ${
                    isFocused ? 'border-emerald-500' : 'border-slate-700/80'
                  }`}
                />
              </div>

              {/* Recent Accounts Box — shown ONLY on USER ID click/focus */}
              {showRecentMenu && quickAccessIds.length > 0 && (
                <div className="bg-[#08101e] border border-slate-700/90 rounded-xl overflow-hidden">
                  <div className="px-3.5 pt-2.5 pb-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 border-b border-slate-800/60">
                    RECENT ACCOUNTS
                  </div>
                  <div className="divide-y divide-slate-800/50">
                    {quickAccessIds.map((recentId) => {
                      const matchedOp = findOperatorByBd(dayState, recentId);
                      return (
                        <div
                          key={recentId}
                          className="flex items-center justify-between px-3.5 py-2 hover:bg-slate-800/40 transition-colors"
                        >
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelectRecent(recentId)}
                            className="flex-1 flex items-center gap-2 text-left text-xs text-slate-200 hover:text-emerald-400 transition-colors cursor-pointer min-w-0"
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="font-semibold tabular-nums">{recentId}</span>
                            {matchedOp && (
                              <span className="text-[11px] text-slate-400 truncate">
                                · {matchedOp.rank} {matchedOp.name}
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveRecentUserId(recentId);
                              if (userId === recentId) {
                                setUserId('');
                                setLoginPin('');
                              }
                            }}
                            title={`Remove ${recentId} from recent accounts`}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Super Admin / Admin Login PIN Box — automatically shown when an Admin / Super Admin / Owner User ID is entered */}
              {activePinDetails.requiresPin && activePinDetails.matchedOperator && (
                <div className="space-y-2 pt-0.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[11px]">
                    <div className="flex items-center gap-1.5 text-emerald-300 font-semibold truncate">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">
                        {activePinDetails.matchedOperator.rank}{' '}
                        {activePinDetails.matchedOperator.name}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-extrabold uppercase tracking-wider shrink-0">
                      {activePinDetails.role}
                    </span>
                  </div>

                  <div className="relative pt-1">
                    <label
                      htmlFor="portal-login-pin"
                      className={`absolute left-3.5 pointer-events-none transition-all duration-150 uppercase tracking-wider font-bold z-10 ${
                        isPinFocused || loginPin.length > 0
                          ? `top-1 -translate-y-1/2 px-1.5 bg-[#0d1728] text-[10px] ${
                              isPinFocused ? 'text-emerald-400' : 'text-slate-400'
                            }`
                          : 'top-[calc(50%+2px)] -translate-y-1/2 text-xs text-slate-400'
                      }`}
                    >
                      SUPER ADMIN / ADMIN LOGIN PIN
                    </label>
                    <input
                      ref={pinInputRef}
                      id="portal-login-pin"
                      type={showPinText ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={12}
                      value={loginPin}
                      onFocus={() => setIsPinFocused(true)}
                      onBlur={() => setIsPinFocused(false)}
                      onChange={(e) => handlePinChange(e.target.value)}
                      aria-label="LOGIN PIN"
                      className={`w-full bg-[#08101e] rounded-xl pl-4 pr-10 py-3 text-sm font-semibold text-white tracking-widest focus:outline-none transition-colors tabular-nums border ${
                        isPinFocused ? 'border-emerald-500' : 'border-emerald-500/50'
                      }`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPinText((v) => !v)}
                      title={showPinText ? 'Hide PIN' : 'Show PIN'}
                      className="absolute right-3 top-[calc(50%+2px)] -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      {showPinText ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <div className="text-[10px] text-slate-400 px-1 flex items-center justify-between">
                    <span>PIN match করলে সাথে সাথে Auto Login হবে</span>
                    {!activePinDetails.hasCustomPin && (
                      <span className="text-amber-300/90 font-semibold tabular-nums">
                        Default PIN: 1124
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-[#00c853] hover:bg-[#00e05d] text-slate-950 font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/50"
            >
              <LogIn className="w-4 h-4" />
              <span>LOGIN</span>
            </button>

            <button
              type="button"
              onClick={openRegisterMode}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/35 text-emerald-300 hover:text-emerald-200 text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Register</span>
            </button>

            <button
              type="button"
              onClick={onGuestLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-[#08101e] hover:bg-[#111e35] border border-slate-700/80 text-slate-300 hover:text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Guest Login</span>
            </button>
          </form>
        ) : (
          /* Register Form — Floating notched-border labels matching Login Portal, zero default fills */
          <form onSubmit={handleRegisterSubmit} className="space-y-3">
            {registerError && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{registerError}</span>
              </div>
            )}

            {/* Office / Sqn / Unit (with Custom at bottom) + Wing side-by-side */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="relative pt-1">
                <label
                  htmlFor="register-unit"
                  className={getFloatLabelClass('unit', regUnit)}
                >
                  Sqn / Unit
                </label>
                {isCustomUnit ? (
                  <>
                    <input
                      id="register-unit"
                      type="text"
                      value={regUnit}
                      onFocus={() => setFocusedRegField('unit')}
                      onBlur={() => setFocusedRegField((prev) => (prev === 'unit' ? null : prev))}
                      onChange={(e) => {
                        setRegUnit(e.target.value);
                        setRegisterError(null);
                      }}
                      className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-11 py-3 text-xs font-semibold text-white focus:outline-none transition-colors border ${getFieldBorderClass(
                        'unit'
                      )}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomUnit(false);
                        setRegUnit('');
                        setFocusedRegField(null);
                      }}
                      className="absolute right-2.5 top-[calc(50%+2px)] -translate-y-1/2 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      List
                    </button>
                  </>
                ) : (
                  <select
                    id="register-unit"
                    value={regUnit}
                    onFocus={() => setFocusedRegField('unit')}
                    onBlur={() => setFocusedRegField((prev) => (prev === 'unit' ? null : prev))}
                    onChange={(e) => handleUnitSelectChange(e.target.value)}
                    className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-7 py-3 text-xs font-semibold text-white focus:outline-none transition-colors cursor-pointer border ${getFieldBorderClass(
                      'unit'
                    )}`}
                  >
                    <option value="" disabled hidden></option>
                    {unitOptionsForSelectedWing.map((unitName) => (
                      <option
                        key={`reg-u-${unitName}`}
                        value={unitName}
                        className="bg-[#0b1424] text-slate-100"
                      >
                        {unitName}
                      </option>
                    ))}
                    <option
                      value="__CUSTOM__"
                      className="bg-[#0b1424] text-emerald-400 font-semibold"
                    >
                      + Custom...
                    </option>
                  </select>
                )}
              </div>

              <div className="relative pt-1">
                <label
                  htmlFor="register-wing"
                  className={getFloatLabelClass('wing', regWing)}
                >
                  Wing
                </label>
                {isCustomWing ? (
                  <>
                    <input
                      id="register-wing"
                      type="text"
                      value={regWing}
                      onFocus={() => setFocusedRegField('wing')}
                      onBlur={() => setFocusedRegField((prev) => (prev === 'wing' ? null : prev))}
                      onChange={(e) => {
                        setRegWing(e.target.value);
                        setRegisterError(null);
                      }}
                      className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-11 py-3 text-xs font-semibold text-white focus:outline-none transition-colors border ${getFieldBorderClass(
                        'wing'
                      )}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomWing(false);
                        setRegWing('');
                        setFocusedRegField(null);
                      }}
                      className="absolute right-2.5 top-[calc(50%+2px)] -translate-y-1/2 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      List
                    </button>
                  </>
                ) : (
                  <select
                    id="register-wing"
                    value={regWing}
                    onFocus={() => setFocusedRegField('wing')}
                    onBlur={() => setFocusedRegField((prev) => (prev === 'wing' ? null : prev))}
                    onChange={(e) => handleWingSelectChange(e.target.value)}
                    className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-7 py-3 text-xs font-semibold text-white focus:outline-none transition-colors cursor-pointer border ${getFieldBorderClass(
                      'wing'
                    )}`}
                  >
                    <option value="" disabled hidden></option>
                    {wings.map((w) => (
                      <option
                        key={`reg-w-${w.id}`}
                        value={w.name}
                        className="bg-[#0b1424] text-slate-100"
                      >
                        {w.name}
                      </option>
                    ))}
                    <option
                      value="__CUSTOM__"
                      className="bg-[#0b1424] text-emerald-400 font-semibold"
                    >
                      + Custom...
                    </option>
                  </select>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="relative pt-1">
                <label
                  htmlFor="register-rank"
                  className={getFloatLabelClass('rank', regRank)}
                >
                  Rank
                </label>
                <select
                  id="register-rank"
                  value={regRank}
                  onFocus={() => setFocusedRegField('rank')}
                  onBlur={() => setFocusedRegField((prev) => (prev === 'rank' ? null : prev))}
                  onChange={(e) => {
                    setRegRank(e.target.value);
                    setRegisterError(null);
                  }}
                  className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-7 py-3 text-xs font-semibold text-white focus:outline-none transition-colors cursor-pointer border ${getFieldBorderClass(
                    'rank'
                  )}`}
                >
                  <option value="" disabled hidden></option>
                  {BAF_ALL_RANKS.map((r) => (
                    <option key={`reg-r-${r}`} value={r} className="bg-[#0b1424] text-slate-100">
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative pt-1">
                <label
                  htmlFor="register-bd"
                  className={getFloatLabelClass('bdNo', regBdNo)}
                >
                  USER ID (BD No)
                </label>
                <input
                  id="register-bd"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={regBdNo}
                  onFocus={() => setFocusedRegField('bdNo')}
                  onBlur={() => setFocusedRegField((prev) => (prev === 'bdNo' ? null : prev))}
                  onChange={(e) => {
                    setRegBdNo(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setRegisterError(null);
                  }}
                  className={`w-full bg-[#08101e] rounded-xl px-3.5 py-3 text-xs font-semibold text-white tracking-wider tabular-nums focus:outline-none transition-colors border ${getFieldBorderClass(
                    'bdNo'
                  )}`}
                />
              </div>
            </div>

            <div className="relative pt-1">
              <label
                htmlFor="register-name"
                className={getFloatLabelClass('name', regName)}
              >
                Name
              </label>
              <input
                id="register-name"
                type="text"
                value={regName}
                onFocus={() => setFocusedRegField('name')}
                onBlur={() => setFocusedRegField((prev) => (prev === 'name' ? null : prev))}
                onChange={(e) => {
                  setRegName(e.target.value);
                  setRegisterError(null);
                }}
                className={`w-full bg-[#08101e] rounded-xl px-3.5 py-3 text-xs font-semibold text-white focus:outline-none transition-colors border ${getFieldBorderClass(
                  'name'
                )}`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="relative pt-1">
                <label
                  htmlFor="register-trade"
                  className={getFloatLabelClass('trade', regTrade)}
                >
                  Trade
                </label>
                {isCustomTrade ? (
                  <>
                    <input
                      id="register-trade"
                      type="text"
                      value={regTrade}
                      onFocus={() => setFocusedRegField('trade')}
                      onBlur={() => setFocusedRegField((prev) => (prev === 'trade' ? null : prev))}
                      onChange={(e) => {
                        setRegTrade(e.target.value);
                        setRegisterError(null);
                      }}
                      className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-11 py-3 text-xs font-semibold text-white focus:outline-none transition-colors border ${getFieldBorderClass(
                        'trade'
                      )}`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomTrade(false);
                        setRegTrade('');
                        setFocusedRegField(null);
                      }}
                      className="absolute right-2.5 top-[calc(50%+2px)] -translate-y-1/2 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      List
                    </button>
                  </>
                ) : (
                  <select
                    id="register-trade"
                    value={regTrade}
                    onFocus={() => setFocusedRegField('trade')}
                    onBlur={() => setFocusedRegField((prev) => (prev === 'trade' ? null : prev))}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRegisterError(null);
                      if (val === '__CUSTOM__') {
                        setIsCustomTrade(true);
                        setRegTrade('');
                        return;
                      }
                      setRegTrade(val);
                    }}
                    className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-7 py-3 text-xs font-semibold text-white focus:outline-none transition-colors cursor-pointer border ${getFieldBorderClass(
                      'trade'
                    )}`}
                  >
                    <option value="" disabled hidden></option>
                    {BAF_TRADES.map((t) => (
                      <option key={`reg-t-${t}`} value={t} className="bg-[#0b1424] text-slate-100">
                        {t}
                      </option>
                    ))}
                    <option
                      value="__CUSTOM__"
                      className="bg-[#0b1424] text-emerald-400 font-semibold"
                    >
                      + Custom...
                    </option>
                  </select>
                )}
              </div>

              <div className="relative pt-1">
                <label
                  htmlFor="register-flight"
                  className={getFloatLabelClass('flight', regFlight)}
                >
                  Flight
                </label>
                <select
                  id="register-flight"
                  value={regFlight}
                  onFocus={() => setFocusedRegField('flight')}
                  onBlur={() => setFocusedRegField((prev) => (prev === 'flight' ? null : prev))}
                  onChange={(e) => {
                    setRegFlight(e.target.value);
                    setRegisterError(null);
                  }}
                  className={`w-full bg-[#08101e] rounded-xl pl-3.5 pr-7 py-3 text-xs font-semibold text-white focus:outline-none transition-colors cursor-pointer border ${getFieldBorderClass(
                    'flight'
                  )}`}
                >
                  <option value="" disabled hidden></option>
                  {BAF_FLIGHTS.map((f) => (
                    <option key={`reg-f-${f}`} value={f} className="bg-[#0b1424] text-slate-100">
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-[#00c853] hover:bg-[#00e05d] text-slate-950 font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/50 mt-1"
            >
              <UserPlus className="w-4 h-4" />
              <span>REGISTER</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRegisterError(null);
                setMode('login');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-[#08101e] hover:bg-[#111e35] border border-slate-700/80 text-slate-300 hover:text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Back to Login</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
