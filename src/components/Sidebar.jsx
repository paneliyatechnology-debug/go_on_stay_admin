import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, LogOut,
  LayoutDashboard, Hotel, HelpCircle, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Professional Widescreen & Mobile Responsive Sidebar Navigation
 * - Supports default crisp light theme and Five-Star Luxury Dark Charcoal & Metallic Gold theme ('luxury')
 * - Automatically provides persistent desktop sidebar (lg+) and mobile slide-over drawer (<lg)
 */
const Sidebar = ({
  menuGroups = [],
  activeTab = '',
  onSelectTab,
  onHeaderClick,
  title = 'Admin Panel',
  subtitle = 'Super Master Controls',
  badgeText = 'FULL ACCESS',
  variant = 'default', // 'default' | 'luxury'
  mobileOpen = false,
  setMobileOpen = () => {}
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const initial = {};
    menuGroups.forEach((group, idx) => {
      initial[group.id || idx] = true;
    });
    return initial;
  });

  const isLuxury = variant === 'luxury';

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleItemSelect = (id, filter) => {
    if (onSelectTab) {
      onSelectTab(id, filter);
    }
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  };

  const handleHeaderClick = () => {
    if (onHeaderClick) {
      onHeaderClick();
    } else if (onSelectTab) {
      onSelectTab('OVERVIEW', '');
    }
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  };

  const renderContent = (isMobile = false) => (
    <>
      {/* Sidebar Header */}
      <div
        className={`p-4 flex items-center justify-between border-b shrink-0 ${
          isLuxury
            ? 'bg-[#121316] border-[#22242B]'
            : 'bg-white border-slate-200'
        }`}
      >
        <div
          onClick={handleHeaderClick}
          className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
          title="Go to Executive Overview"
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
              isLuxury
                ? 'bg-gradient-to-br from-[#BF8E36] via-[#D8A74B] to-[#BF8E36] text-white font-black shadow-md shadow-amber-950/40 group-hover:scale-105'
                : 'bg-red-600 group-hover:bg-red-700 text-white shadow-xs'
            }`}
          >
            <Hotel className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              className={`text-base font-black tracking-tight truncate transition-colors ${
                isLuxury
                  ? 'text-white group-hover:text-[#F3E5AB]'
                  : 'text-slate-900 group-hover:text-red-600'
              }`}
            >
              {title}
            </h2>
            {badgeText && (
              <div className="mt-1 flex items-center">
                <span
                  className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider whitespace-nowrap inline-flex items-center leading-none ${
                    isLuxury
                      ? 'bg-[#D4AF37]/15 text-[#F3E5AB] border border-[#D4AF37]/40 shadow-xs'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {badgeText}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Close Button on Mobile Drawer */}
        {isMobile && (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer shrink-0 ml-2 ${
              isLuxury
                ? 'text-slate-400 hover:text-white hover:bg-white/10'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Menu Groups Accordion Container */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {menuGroups.map((group, gIdx) => {
          const groupId = group.id || `group-${gIdx}`;
          const isExpanded = expandedGroups[groupId] !== false;
          const filteredItems = group.items;

          if (filteredItems.length === 0) return null;

          return (
            <div key={groupId} className="space-y-1">
              {/* Group Title Accordion Header */}
              {group.title && (
                <button
                  type="button"
                  onClick={() => toggleGroup(groupId)}
                  className={`w-full flex items-center justify-between px-2.5 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-left transition-colors cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none focus-visible:outline-none border-0 ring-0 ${
                    isLuxury
                      ? 'text-[#D4AF37] hover:text-[#F3E5AB]'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>{group.title}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isExpanded ? 'rotate-0' : '-rotate-90'
                  }`} />
                </button>
              )}

              {/* Sub-menu Items */}
              {isExpanded && (
                <div className="space-y-1">
                  {filteredItems.map((item) => {
                    const Icon = item.icon || LayoutDashboard;
                    const isActive = activeTab === item.id || item.subItems?.some(s => s.id === activeTab);

                    return (
                      <div key={item.id} className="space-y-0.5">
                        {/* Main Menu Button */}
                        <button
                          type="button"
                          onClick={() => handleItemSelect(item.id, item.filter)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-left cursor-pointer transition-colors duration-150 outline-none focus:outline-none focus:ring-0 active:outline-none focus-visible:outline-none border-0 ring-0 select-none ${
                            isActive
                              ? isLuxury
                                ? 'bg-gradient-to-r from-[#BF8E36] via-[#D8A74B] to-[#BF8E36] text-white shadow-md shadow-amber-950/40 font-bold'
                                : 'bg-red-50 text-red-700 border-l-3 border-l-red-600 border border-red-200/60'
                              : isLuxury
                              ? 'text-slate-400 hover:text-[#F3E5AB] hover:bg-[#1A1C22] font-medium'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                            <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive
                                ? 'text-white'
                                : isLuxury ? 'text-slate-400 group-hover:text-[#D4AF37]' : 'text-slate-500'
                            }`} />
                            <span className="truncate text-left">{item.label}</span>
                          </div>


                        </button>

                        {/* Dropdown nested sub-items if present */}
                        {item.subItems && isActive && (
                          <div className={`ml-4 pl-2 space-y-0.5 my-1 border-l ${
                            isLuxury ? 'border-[#2D3039]' : 'border-slate-200'
                          }`}>
                            {item.subItems.map((sub) => {
                              const isSubActive = activeTab === sub.id && (!sub.filter || sub.filterActive);
                              const SubIcon = sub.icon || ChevronRight;

                              return (
                                <button
                                  type="button"
                                  key={sub.id}
                                  onClick={() => handleItemSelect(sub.id, sub.filter)}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors duration-150 text-left cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none focus-visible:outline-none border-0 ring-0 ${
                                    isSubActive
                                      ? isLuxury
                                        ? 'bg-[#D4AF37]/20 text-[#F3E5AB] font-bold border border-[#D4AF37]/30'
                                        : 'bg-red-50 text-red-600 font-bold'
                                      : isLuxury
                                      ? 'text-slate-400 hover:text-white hover:bg-white/5'
                                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <SubIcon className="w-3 h-3 shrink-0" />
                                    <span className="truncate text-left">{sub.label}</span>
                                  </div>

                                </button>
                              );
                            })}
                          </div>
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

      {/* Sidebar User Profile Card Footer */}
      <div
        className={`p-3 border-t shrink-0 ${
          isLuxury ? 'bg-[#121316] border-[#22242B]' : 'bg-slate-50/50 border-slate-200'
        }`}
      >
        <div
          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
            isLuxury ? 'bg-[#18191E] border-[#2A2D35] shadow-md' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                isLuxury
                  ? 'bg-gradient-to-br from-[#D4AF37] to-[#C5A880] text-slate-950 shadow-xs'
                  : 'bg-red-50 border border-red-200 text-red-600'
              }`}
            >
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <div className={`text-xs font-bold truncate ${isLuxury ? 'text-white' : 'text-slate-900'}`}>
                @{user?.login_id || user?.username || 'admin'}
              </div>
              <div className={`text-[10px] font-medium uppercase truncate ${isLuxury ? 'text-[#D4AF37]' : 'text-slate-500'}`}>
                {user?.isStaff
                  ? `${user?.department_name || user?.department_code || 'STAFF'} (${user?.employee_id || 'STAFF'})`
                  : (user?.role || 'SUPER_ADMIN')}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className={`p-1.5 rounded-lg transition-colors shrink-0 cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none focus-visible:outline-none border-0 ring-0 ${
              isLuxury
                ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/40'
                : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
            }`}
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (Screens >= lg) */}
      <aside
        className={`hidden lg:flex sticky top-0 z-40 h-screen flex-col shrink-0 w-72 font-sans select-none transition-colors ${
          isLuxury
            ? 'bg-[#121316] border-r border-[#22242B] text-slate-200 shadow-2xl'
            : 'bg-white border-r border-slate-200 text-slate-800'
        }`}
      >
        {renderContent(false)}
      </aside>

      {/* Mobile Drawer Slide-Over (Screens < lg) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop overlay with blur */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer Sidebar */}
          <aside
            className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col shadow-2xl font-sans select-none transition-all duration-300 ${
              isLuxury
                ? 'bg-[#121316] border-r border-[#22242B] text-slate-200'
                : 'bg-white border-r border-slate-200 text-slate-800'
            }`}
          >
            {renderContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
