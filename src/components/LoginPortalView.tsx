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
import { DayState, OperatorProfile, Rank, WingConfig } from '../types/nightCount';
import { BAF_ALL_RANKS, BAF_FLIGHTS, BAF_TRADES } from '../data/initialData';
import {
  findAirmanByBd,
  findExistingBdConflict,
  findOperatorByBd,
  getAllConfiguredUnits,
} from '../utils/storage';

export interface SignUpPayload {
  unit: string;
  rank: Rank;
  bdNo: string;
  name: string;
  trade: string;
  flight: string;
  adminPin?: string;
}

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
  const [userId, setUserId] = useState<string>(() => recentUserIds[0] || '');
  const [adminPinInput, setAdminPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showRecentMenu, setShowRecentMenu] = useState(false);
  const [isPinFocused, setIsPinFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState<string | null>(null);

  const allConfiguredUnits = useMemo(() => getAllConfiguredUnits(wings), [wings]);
  const defaultUnit = allConfiguredUnits.includes('155 UASU BAF')
    ? '155 UASU BAF'
    : allConfiguredUnits[0] || '155 UASU BAF';

  // Sign Up form state
  const [signUpUnit, setSignUpUnit] = useState<string>(defaultUnit);
  const [signUpRank, setSignUpRank] = useState<Rank>('LAC');
  const [signUpBdNo, setSignUpBdNo] = useState<string>('');
  const [signUpName, setSignUpName] = useState<string>('');
  const [signUpTrade, setSignUpTrade] = useState<string>(BAF_TRADES[0]);
  const [signUpFlight, setSignUpFlight] = useState<string>(BAF_FLIGHTS[0]);
  const [signUpPin, setSignUpPin] = useState<string>('');
  const [showSignUpPin, setShowSignUpPin] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);

  const hasUserEditedRef = useRef(false);
  const userIdSectionRef = useRef<HTMLDivElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Sync autofill with Cloud/Local recentUserIds when Cloud boot completes, unless user already typed
  useEffect(() => {
    if (!hasUserEditedRef.current) {
      setUserId(recentUserIds[0] || '');
    }
  }, [recentUserIds]);

  // Keep Sign Up unit valid if configured wings/units update from Cloud
  useEffect(() => {
    if (allConfiguredUnits.length > 0 && !allConfiguredUnits.includes(signUpUnit)) {
      setSignUpUnit(
        allConfiguredUnits.includes('155 UASU BAF') ? '155 UASU BAF' : allConfiguredUnits[0]
      );
    }
  }, [allConfiguredUnits, signUpUnit]);

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

  const matchedAirman = /^\d{6}$/.test(userId.trim()) ? findAirmanByBd(dayState, userId.trim()) : null;
  const requiresPin = Boolean(matchedAirman?.adminPin && matchedAirman.adminPin.trim().length > 0);

  const handleUserIdChange = (raw: string) => {
    hasUserEditedRef.current = true;
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    setUserId(digits);
    setAdminPinInput('');
    setShowPin(false);
    setError(null);
    setSignUpSuccess(null);
  };

  const loginWithId = (rawId: string, providedPin?: string) => {
    setError(null);
    const cleanId = rawId.trim();
    if (!/^\d{6}$/.test(cleanId)) {
      setError('Enter your 6-digit BD No as User ID (e.g. 474455).');
      return;
    }

    const matched = findOperatorByBd(dayState, cleanId);
    if (!matched) {
      setError(
        'User ID (BD No) not found in Nominal Roll. Please Sign Up or use Guest Login.'
      );
      return;
    }

    const airmanRecord = findAirmanByBd(dayState, cleanId);
    const expectedPin = airmanRecord?.adminPin?.trim();
    if (expectedPin) {
      const candidatePin = (providedPin ?? adminPinInput).trim();
      if (!candidatePin) {
        setError(
          `Enter Admin Login Portal PIN for ${matched.rank} ${matched.name} (${cleanId}).`
        );
        return;
      }
      if (candidatePin !== expectedPin) {
        setError('Incorrect Admin Login Portal PIN. Please try again.');
        return;
      }
    }

    onLogin(matched);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowRecentMenu(false);
    loginWithId(userId, adminPinInput);
  };

  const handleSelectRecent = (id: string) => {
    hasUserEditedRef.current = true;
    setUserId(id);
    setAdminPinInput('');
    setShowPin(false);
    setShowRecentMenu(false);
    setSignUpSuccess(null);
    const airmanRecord = findAirmanByBd(dayState, id);
    if (airmanRecord?.adminPin?.trim()) {
      setError(null);
      window.setTimeout(() => {
        pinInputRef.current?.focus();
      }, 0);
      return;
    }
    loginWithId(id, '');
  };

  const openSignUpMode = () => {
    setError(null);
    setSignUpSuccess(null);
    setSignUpError(null);
    setShowRecentMenu(false);
    if (/^\d{6}$/.test(userId.trim()) && !findExistingBdConflict(dayState, userId.trim())) {
      setSignUpBdNo(userId.trim());
    }
    setMode('signup');
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);

    const cleanBd = signUpBdNo.replace(/\D/g, '').slice(0, 6);
    const cleanName = signUpName.trim();
    const cleanPin = signUpPin.replace(/\s/g, '').slice(0, 12);

    if (!/^\d{6}$/.test(cleanBd)) {
      setSignUpError('USER ID (BD No) must be exactly 6 digits (e.g. 474455).');
      return;
    }
    if (!cleanName) {
      setSignUpError('Please enter your name.');
      return;
    }

    const res = onSignUp({
      unit: signUpUnit,
      rank: signUpRank,
      bdNo: cleanBd,
      name: cleanName,
      trade: signUpTrade,
      flight: signUpFlight,
      ...(cleanPin ? { adminPin: cleanPin } : {}),
    });

    if (!res.ok) {
      setSignUpError(res.error || 'Could not complete sign up.');
      return;
    }

    hasUserEditedRef.current = true;
    setUserId(cleanBd);
    setAdminPinInput('');
    setShowPin(false);
    setSignUpBdNo('');
    setSignUpName('');
    setSignUpPin('');
    setShowSignUpPin(false);
    setSignUpError(null);
    setError(null);
    setSignUpSuccess(
      `Account created for ${signUpRank} ${cleanName} (BD/${cleanBd}) and added to ${signUpUnit} Nominal Roll & User Management. Log in with USER ID ${cleanBd}.`
    );
    setMode('login');

    if (cleanPin) {
      window.setTimeout(() => {
        pinInputRef.current?.focus();
      }, 0);
    }
  };

  const isLabelFloating = isFocused || userId.length > 0;
  const isPinLabelFloating = isPinFocused || adminPinInput.length > 0;
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
          mode === 'signup' ? 'max-w-[440px]' : 'max-w-[380px]'
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
            <span>{mode === 'signup' ? 'USER SIGN UP' : 'USER LOGIN PORTAL'}</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-wide uppercase mt-3">
            BAS BASE ZHR
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
            {signUpSuccess && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <span>{signUpSuccess}</span>
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

              {/* Recent Accounts Box — inline below USER ID (never covers PIN box), shown ONLY on USER ID click/focus */}
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
                                hasUserEditedRef.current = true;
                                setUserId('');
                                setAdminPinInput('');
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
            </div>

            {/* Admin Login Portal PIN (shown only if this User ID has a PIN configured) */}
            {requiresPin && (
              <div className="relative pt-1">
                <label
                  htmlFor="portal-admin-pin"
                  className={`absolute left-3.5 pointer-events-none transition-all duration-150 uppercase tracking-wider font-bold flex items-center gap-1 ${
                    isPinLabelFloating
                      ? `top-1 -translate-y-1/2 px-1.5 bg-[#0d1728] text-[10px] ${
                          isPinFocused ? 'text-emerald-400' : 'text-slate-400'
                        }`
                      : 'top-[calc(50%+2px)] -translate-y-1/2 text-xs text-slate-400'
                  }`}
                >
                  <KeyRound className="w-3 h-3" />
                  <span>ADMIN LOGIN PIN</span>
                </label>
                <input
                  ref={pinInputRef}
                  id="portal-admin-pin"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={12}
                  value={adminPinInput}
                  onFocus={() => {
                    setIsPinFocused(true);
                    setShowRecentMenu(false);
                  }}
                  onBlur={() => setIsPinFocused(false)}
                  onChange={(e) => {
                    const nextPin = e.target.value.replace(/\s/g, '').slice(0, 12);
                    setAdminPinInput(nextPin);
                    setError(null);
                    const expectedPin = matchedAirman?.adminPin?.trim();
                    if (expectedPin && nextPin.trim() === expectedPin) {
                      loginWithId(userId, nextPin);
                    }
                  }}
                  aria-label="ADMIN LOGIN PIN"
                  className={`w-full bg-[#08101e] rounded-xl pl-4 pr-11 py-3 text-sm font-semibold text-white tracking-widest focus:outline-none transition-colors tabular-nums border ${
                    isPinFocused ? 'border-emerald-500' : 'border-slate-700/80'
                  }`}
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowPin((p) => !p)}
                  aria-label={showPin ? 'Hide Admin Login PIN' : 'Show Admin Login PIN'}
                  title={showPin ? 'Hide PIN' : 'Show PIN'}
                  className="absolute right-3 top-[calc(50%+2px)] -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-[#00c853] hover:bg-[#00e05d] text-slate-950 font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/50"
            >
              <LogIn className="w-4 h-4" />
              <span>LOGIN</span>
            </button>

            <button
              type="button"
              onClick={openSignUpMode}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/35 text-emerald-300 hover:text-emerald-200 text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sign Up</span>
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
          /* Sign Up Form — adds user directly to selected Office Nominal Roll & User Management */
          <form onSubmit={handleSignUpSubmit} className="space-y-3">
            {signUpError && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{signUpError}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="signup-unit"
                className="block text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-1"
              >
                Office / Sqn / Unit
              </label>
              <select
                id="signup-unit"
                value={signUpUnit}
                onChange={(e) => {
                  setSignUpUnit(e.target.value);
                  setSignUpError(null);
                }}
                className="w-full bg-[#08101e] border border-slate-700/80 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white outline-none transition-colors"
              >
                {allConfiguredUnits.map((unitName) => (
                  <option key={`signup-u-${unitName}`} value={unitName}>
                    {unitName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="signup-rank"
                  className="block text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-1"
                >
                  Rank
                </label>
                <select
                  id="signup-rank"
                  value={signUpRank}
                  onChange={(e) => setSignUpRank(e.target.value as Rank)}
                  className="w-full bg-[#08101e] border border-slate-700/80 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs font-semibold text-white outline-none transition-colors"
                >
                  {BAF_ALL_RANKS.map((r) => (
                    <option key={`signup-r-${r}`} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="signup-bd"
                  className="block text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-1"
                >
                  USER ID (BD No)
                </label>
                <input
                  id="signup-bd"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={signUpBdNo}
                  onChange={(e) => {
                    setSignUpBdNo(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setSignUpError(null);
                  }}
                  placeholder="e.g. 474455"
                  className="w-full bg-[#08101e] border border-slate-700/80 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs font-semibold text-white tracking-wider tabular-nums outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="signup-name"
                className="block text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-1"
              >
                Name
              </label>
              <input
                id="signup-name"
                type="text"
                value={signUpName}
                onChange={(e) => {
                  setSignUpName(e.target.value);
                  setSignUpError(null);
                }}
                placeholder="e.g. Rasel"
                className="w-full bg-[#08101e] border border-slate-700/80 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white outline-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor="signup-trade"
                  className="block text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-1"
                >
                  Trade
                </label>
                <select
                  id="signup-trade"
                  value={signUpTrade}
                  onChange={(e) => setSignUpTrade(e.target.value)}
                  className="w-full bg-[#08101e] border border-slate-700/80 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs font-semibold text-white outline-none transition-colors"
                >
                  {BAF_TRADES.map((t) => (
                    <option key={`signup-t-${t}`} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="signup-flight"
                  className="block text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-1"
                >
                  Flight
                </label>
                <select
                  id="signup-flight"
                  value={signUpFlight}
                  onChange={(e) => setSignUpFlight(e.target.value)}
                  className="w-full bg-[#08101e] border border-slate-700/80 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-xs font-semibold text-white outline-none transition-colors"
                >
                  {BAF_FLIGHTS.map((f) => (
                    <option key={`signup-f-${f}`} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="signup-pin"
                className="block text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-1"
              >
                Login PIN <span className="text-slate-500 normal-case font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <input
                  id="signup-pin"
                  type={showSignUpPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={12}
                  value={signUpPin}
                  onChange={(e) => setSignUpPin(e.target.value.replace(/\s/g, '').slice(0, 12))}
                  placeholder="Leave blank if no PIN needed"
                  className="w-full bg-[#08101e] border border-slate-700/80 focus:border-emerald-500 rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-semibold text-white tracking-wider tabular-nums outline-none transition-colors"
                />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowSignUpPin((p) => !p)}
                  aria-label={showSignUpPin ? 'Hide PIN' : 'Show PIN'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  {showSignUpPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-[#00c853] hover:bg-[#00e05d] text-slate-950 font-bold text-xs sm:text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/50 mt-1"
            >
              <UserPlus className="w-4 h-4" />
              <span>SIGN UP</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSignUpError(null);
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
