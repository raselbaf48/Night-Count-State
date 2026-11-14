import React, { useState } from 'react';
import {
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
import { getUnitAirmen } from '../utils/storage';

interface SidebarProps {
  wings: WingConfig[];
  activeWingId: string;
  activeTab: string;
  dayState: DayState;
  operator: OperatorProfile | null;
  operatorRole?: UserRole | 'GUEST';
  brandTitle?: string;
  canAccessSettings?: boolean;
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
  brandTitle = '155 UASU BAF',
  canAccessSettings = true,
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
            <div className="mt-1 space-y-1">
              {wings.map((wing) => {
                const isWingSelected = activeTab === wing.name;
                return (
                  <button
                    key={wing.id}
                    type="button"
                    onClick={() => handleNavClick(() => onSelectWing(wing))}
                    title={`${wing.name} (Consolidated State)`}
                    className={`w-full flex items-center justify-between gap-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      compact ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
                    } ${
                      isWingSelected
                        ? 'bg-[#00b853] text-slate-950 font-bold shadow-md shadow-emerald-950/60'
                        : 'text-emerald-100/85 hover:text-white hover:bg-[#0a3c2a] border border-transparent hover:border-[#14553e]/60'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Shield className="w-4 h-4 shrink-0" />
                      {!compact && <span className="truncate">{wing.name}</span>}
                    </span>
                    {!compact && wings.length > 1 && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${
                          isWingSelected
                            ? 'bg-slate-950/20 text-slate-950'
                            : 'bg-[#093d2b] text-emerald-300 border border-[#14553e]'
                        }`}
                      >
                        {wing.shortName}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* SQUADRONS / UNITS GROUP */}
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
            <div className="mt-1 space-y-2.5">
              {wings.map((wing) => (
                <div key={`units-grp-${wing.id}`} className="space-y-1">
                  {!compact && wings.length > 1 && (
                    <div className="px-2.5 pt-1 text-[9px] font-bold tracking-wider uppercase text-amber-400/80">
                      {wing.name}
                    </div>
                  )}
                  {wing.units.length === 0 ? (
                    !compact && (
                      <div className="px-3 py-1.5 text-[11px] text-emerald-400/60 italic">
                        No Sqn/Unit assigned
                      </div>
                    )
                  ) : (
                    wing.units.map((unitName) => {
                      const isActive = activeTab === unitName;
                      const unitAirmenCount = getUnitAirmen(dayState, unitName).length;
                      return (
                        <button
                          key={unitName}
                          type="button"
                          onClick={() => handleNavClick(() => onSelectUnit(unitName, wing.id))}
                          title={unitName}
                          className={`w-full flex items-center justify-between gap-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            compact ? 'justify-center px-2 py-2.5' : 'px-3 py-2'
                          } ${
                            isActive
                              ? 'bg-[#00b853] text-slate-950 font-bold shadow-md shadow-emerald-950/60'
                              : 'text-emerald-100/85 hover:text-white hover:bg-[#0a3c2a] border border-transparent hover:border-[#14553e]/60'
                          }`}
                        >
                          <span className="flex items-center gap-2.5 min-w-0">
                            <Building2 className="w-4 h-4 shrink-0" />
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
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Operator & Settings Footer */}
      <div className="border-t border-[#0d3d2c] px-2.5 py-3 space-y-2 shrink-0 bg-[#041d15]">
        {!compact && (
          <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-[#072b1f] border border-[#114a36]">
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
                    Limited Access
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
            className={`w-full flex items-center gap-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              compact ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
            } ${
              isSettingsOpen
                ? 'bg-[#00b853] text-slate-950 font-bold'
                : 'text-emerald-100/90 hover:text-white bg-[#072b1f] hover:bg-[#0b3f2d] border border-[#114a36]'
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
      {/* Desktop Sticky Sidebar */}
      <aside
        className={`sidebar-emerald hidden lg:block shrink-0 sticky top-0 h-screen transition-all duration-200 z-30 ${
          isCollapsed ? 'w-[72px]' : 'w-64'
        }`}
      >
        {renderSidebarBody(isCollapsed)}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <aside className="sidebar-emerald relative z-10 w-72 max-w-[85vw] h-full shadow-2xl">
            {renderSidebarBody(false)}
          </aside>
        </div>
      )}
    </>
  );
};
