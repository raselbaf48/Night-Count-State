import React, { useState } from 'react';
import {
  AlertCircle,
  Shield,
  Building2,
  Settings,
  LogOut,
  LogIn,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import { DayState, OperatorProfile, UserRole, WingConfig } from '../types/nightCount';
import { getUnitAirmen, hasUnitUpdatedStateForDate } from '../utils/storage';

interface SidebarProps {
  wings: WingConfig[];
  activeWingId: string;
  activeTab: string;
  dayState: DayState;
  operator: OperatorProfile | null;
  operatorRole?: UserRole | 'GUEST';
  brandTitle?: string;
  canAccessSettings?: boolean;
  showOverview?: boolean;
  showSquadrons?: boolean;
  sidebarAllowedUnits?: string[];
  isCollapsed: boolean;
  isMobileOpen: boolean;
  isSettingsOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onSelectWing: (wing: WingConfig) => void;
  onSelectUnit: (unitName: string, wingId?: string) => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  wings,
  activeWingId,
  activeTab,
  dayState,
  operator,
  operatorRole = 'USER',
  brandTitle = 'BAF BASE ZHR',
  canAccessSettings = true,
  showOverview = true,
  showSquadrons = true,
  sidebarAllowedUnits,
  isCollapsed,
  isMobileOpen,
  isSettingsOpen,
  onToggleCollapse,
  onCloseMobile,
  onSelectWing,
  onSelectUnit,
  onOpenSettings,
  onLogout,
}) => {
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [squadronsOpen, setSquadronsOpen] = useState(true);

  const activeWing = wings.find((w) => w.id === activeWingId) || wings[0];

  const handleNavClick = (fn: () => void) => {
    fn();
    onCloseMobile();
  };

  const renderSidebarBody = (compact: boolean) => (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#062e20] via-[#05251a] to-[#041b13] border-r border-[#0e4431] text-emerald-50 select-none">
      {/* Top Unit Crest & Collapse Control */}
      <div
        className={`flex items-center border-b border-[#0d3d2c] shrink-0 ${
          compact ? 'justify-center px-2 py-3.5' : 'justify-between px-3.5 py-3.5'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#083827] border border-emerald-500/30 flex items-center justify-center shrink-0 p-1 shadow-inner">
            <img
              src="/air-force-logo.png"
              alt="BAF Crest"
              className="w-full h-full object-contain"
            />
          </div>
          {!compact && (
            <div className="min-w-0">
              <div className="text-xs font-extrabold tracking-wide text-white truncate">
                {brandTitle}
              </div>
              <div className="text-[10px] font-semibold tracking-wider text-amber-400/90 uppercase truncate">
                {activeWing?.shortName || 'FLG WG'} • NIGHT COUNT
              </div>
            </div>
          )}
        </div>

        {/* Desktop Collapse Button */}
        {!compact && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            className="hidden lg:inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#083827] hover:bg-[#0d4c36] text-emerald-300 border border-[#14553e] transition-colors cursor-pointer shrink-0"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={onCloseMobile}
          title="Close menu"
          className="lg:hidden inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#083827] hover:bg-[#0d4c36] text-emerald-200 border border-[#14553e] transition-colors cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Expand button when collapsed on desktop */}
      {compact && (
        <div className="hidden lg:flex justify-center py-2 border-b border-[#0d3d2c]">
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand sidebar"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#083827] hover:bg-[#0d4c36] text-emerald-300 border border-[#14553e] transition-colors cursor-pointer"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Scrollable Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
        {/* OVERVIEW GROUP */}
        {showOverview && (
          <div>
            {!compact ? (
              <button
                type="button"
                onClick={() => setOverviewOpen((p) => !p)}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold tracking-widest uppercase text-emerald-400/80 hover:text-emerald-300 transition-colors cursor-pointer"
              >
                <span>OVERVIEW</span>
                {overviewOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <div className="h-px bg-[#0d3d2c] mx-2 mb-2" />
            )}

            {(overviewOpen || compact) && (
              <div className="mt-1.5 space-y-1.5">
                {wings.map((wing) => {
                  const isWingSelected = activeTab === wing.name;
                  return (
                    <button
                      key={wing.id}
                      type="button"
                      onClick={() => handleNavClick(() => onSelectWing(wing))}
                      title={`${wing.name} (Consolidated State)`}
                      className={`w-full flex items-center justify-between gap-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer border ${
                        compact ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
                      } ${
                        isWingSelected
                          ? 'sidebar-box-btn-active bg-gradient-to-r from-[#00d45e] via-[#00b853] to-[#059669] border-emerald-300/70 text-slate-950 font-bold shadow-md shadow-emerald-950/60'
                          : 'sidebar-box-btn bg-gradient-to-r from-[#0b4430] via-[#083827] to-[#062b1e] hover:from-[#105c41] hover:via-[#0b4430] hover:to-[#083626] border-[#175e45] hover:border-emerald-400/50 text-emerald-50 hover:text-white shadow-sm'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Shield className="w-4 h-4 shrink-0" />
                        {!compact && <span className="truncate">{wing.name}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SQUADRONS / UNITS GROUP */}
        {showSquadrons && (
          <div>
            {!compact ? (
              <button
                type="button"
                onClick={() => setSquadronsOpen((p) => !p)}
                className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold tracking-widest uppercase text-emerald-400/80 hover:text-emerald-300 transition-colors cursor-pointer"
              >
                <span>SQUADRONS / UNITS</span>
                {squadronsOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <div className="h-px bg-[#0d3d2c] mx-2 mb-2" />
            )}

            {(squadronsOpen || compact) && (
              <div className="mt-1.5 space-y-2.5">
                {wings.map((wing) => {
                  const displayUnits = sidebarAllowedUnits
                    ? wing.units.filter((u) =>
                        sidebarAllowedUnits.some((au) => au.toLowerCase() === u.toLowerCase())
                      )
                    : wing.units;

                  if (sidebarAllowedUnits && displayUnits.length === 0) {
                    return null;
                  }

                  return (
                    <div key={`units-grp-${wing.id}`} className="space-y-1.5">
                      {!compact && wings.length > 1 && (
                        <div className="px-2.5 pt-1 text-[9px] font-bold tracking-wider uppercase text-amber-400/80">
                          {wing.name}
                        </div>
                      )}
                      {displayUnits.length === 0 ? (
                        !compact && (
                          <div className="px-3 py-1.5 text-[11px] text-emerald-400/60 italic">
                            No Sqn/Unit assigned
                          </div>
                        )
                      ) : (
                        displayUnits.map((unitName) => {
                          const isActive = activeTab === unitName;
                          const unitAirmenCount = getUnitAirmen(dayState, unitName).length;
                          const isUpdatedToday =
                            operatorRole === 'GUEST' ||
                            hasUnitUpdatedStateForDate(dayState, unitName);
                          return (
                            <button
                              key={unitName}
                              type="button"
                              onClick={() => handleNavClick(() => onSelectUnit(unitName, wing.id))}
                              title={
                                !isUpdatedToday
                                  ? `${unitName} — State not updated yet for ${dayState.formattedDisplayDate}`
                                  : unitName
                              }
                              className={`w-full flex items-center justify-between gap-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer border ${
                                compact ? 'justify-center px-2 py-2.5' : 'px-3 py-2'
                              } ${
                                isActive
                                  ? 'sidebar-box-btn-active bg-gradient-to-r from-[#00d45e] via-[#00b853] to-[#059669] border-emerald-300/70 text-slate-950 font-bold shadow-md shadow-emerald-950/60'
                                  : 'sidebar-box-btn bg-gradient-to-r from-[#0b4430] via-[#083827] to-[#062b1e] hover:from-[#105c41] hover:via-[#0b4430] hover:to-[#083626] border-[#175e45] hover:border-emerald-400/50 text-emerald-50 hover:text-white shadow-sm'
                              }`}
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                {!isUpdatedToday ? (
                                  <AlertCircle
                                    className={`w-4 h-4 shrink-0 stroke-[2.3] ${
                                      isActive ? 'text-rose-900' : 'text-rose-400'
                                    }`}
                                  />
                                ) : (
                                  <Building2 className="w-4 h-4 shrink-0" />
                                )}
                                {!compact && <span className="truncate">{unitName}</span>}
                              </span>
                              {!compact && unitAirmenCount > 0 && (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold tabular-nums shrink-0 ${
                                    isActive
                                      ? 'bg-slate-950/20 text-slate-950'
                                      : 'bg-[#093d2b] text-emerald-300 border border-[#14553e]'
                                  }`}
                                >
                                  {unitAirmenCount}
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!showOverview && !showSquadrons && !compact && (
          <div className="px-3 py-6 text-center text-[11px] text-emerald-400/60 italic">
            Sidebar menus hidden for this role
          </div>
        )}
      </nav>

      {/* Bottom Operator & Settings Footer */}
      <div className="border-t border-[#0d3d2c] px-2.5 py-3 space-y-2 shrink-0 bg-[#041d15]">
        {!compact && (
          <div className="sidebar-operator-card flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-gradient-to-r from-[#0b4430] via-[#083827] to-[#062b1e] border border-[#175e45] shadow-sm">
            <div className="min-w-0">
              {operator ? (
                <>
                  <div className="text-xs font-bold text-white truncate">
                    {operator.rank} {operator.name}
                  </div>
                  <div className="text-[10px] font-medium text-emerald-400 tabular-nums truncate">
                    BD/{operator.bdNo}
                    {operatorRole ? ` • ${operatorRole}` : ''}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xs font-bold text-slate-200 truncate">Guest Mode</div>
                  <div className="text-[10px] font-medium text-emerald-400/80 truncate">
                    {operatorRole === 'GUEST' ? 'Format Preview Only' : 'Limited Access'}
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleNavClick(onLogout)}
              title={operator ? 'Logout and switch operator' : 'Go to User Login'}
              className="p-1.5 rounded-md bg-[#0a3c2a] hover:bg-rose-950/80 text-emerald-300 hover:text-rose-300 border border-[#14553e] hover:border-rose-700/60 transition-colors cursor-pointer shrink-0"
            >
              {operator ? <LogOut className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {canAccessSettings && (
          <button
            type="button"
            onClick={() => handleNavClick(onOpenSettings)}
            title="Settings"
            className={`w-full flex items-center gap-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer border ${
              compact ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
            } ${
              isSettingsOpen
                ? 'sidebar-box-btn-active bg-gradient-to-r from-[#00d45e] via-[#00b853] to-[#059669] border-emerald-300/70 text-slate-950 font-bold shadow-md shadow-emerald-950/60'
                : 'sidebar-box-btn bg-gradient-to-r from-[#0b4430] via-[#083827] to-[#062b1e] hover:from-[#105c41] hover:via-[#0b4430] hover:to-[#083626] border-[#175e45] hover:border-emerald-400/50 text-emerald-50 hover:text-white shadow-sm'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            {!compact && <span>Settings</span>}
          </button>
        )}

        {!compact && (
          <div className="flex items-center justify-between px-1.5 pt-1 text-[10px] font-semibold text-emerald-500/80 tracking-wide">
            <span>{activeWing?.shortName || 'FLG WG'} • BAF BASE ZHR</span>
            <span className="text-emerald-400/90">v2.5</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar with Smooth Width Transition */}
      <aside
        className={`sidebar-emerald hidden lg:block shrink-0 sticky top-0 h-screen transition-[width] duration-300 ease-out overflow-hidden z-30 ${
          isCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {renderSidebarBody(isCollapsed)}
      </aside>

      {/* Mobile Slide-Over Drawer with Visible Open & Close Transition */}
      <div
        aria-hidden={!isMobileOpen}
        className={`fixed inset-0 z-50 lg:hidden flex transition-[visibility] duration-300 ${
          isMobileOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
        }`}
      >
        <div
          className={`fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-out ${
            isMobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onCloseMobile}
        />
        <aside
          className={`sidebar-emerald relative z-10 w-72 max-w-[85vw] h-full shadow-2xl transform transition-transform duration-300 ease-out ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {renderSidebarBody(false)}
        </aside>
      </div>
    </>
  );
};
