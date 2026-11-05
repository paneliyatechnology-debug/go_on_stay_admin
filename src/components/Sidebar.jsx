import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, Search, LogOut,
  LayoutDashboard, Hotel, HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Professional Widescreen Sidebar Navigation
 * - Supports default crisp light theme and Five-Star Luxury Dark Charcoal & Metallic Gold theme ('luxury')
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
  const [filterQuery, setFilterQuery] = useState('');

  const isLuxury = variant === 'luxury';

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  return (
    <aside
      className={`sticky top-0 z-40 h-screen flex flex-col shrink-0 w-72 font-sans select-none transition-colors ${
        isLuxury
          ? 'bg-[#121316] border-r border-[#22242B] text-slate-200 shadow-2xl'
          : 'bg-white border-r border-slate-200 text-slate-800'
      }`}
    >
      {/* Sidebar Header */}
      <div
        onClick={() => {
          if (onHeaderClick) {
            onHeaderClick();
          } else if (onSelectTab) {
            onSelectTab('OVERVIEW', '');
          }
        }}
        className={`p-4 flex items-center gap-3 border-b shrink-0 cursor-pointer transition-all group ${
          isLuxury
            ? 'bg-[#121316] hover:bg-[#18191E] border-[#22242B]'
            : 'bg-white hover:bg-slate-50 border-slate-200'
        }`}
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

      {/* Menu Items Scrollable Section */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {menuGroups.map((group, gIdx) => {
          const groupId = group.id || `group-${gIdx}`;
          const isExpanded = expandedGroups[groupId] !== false || !!filterQuery;

          const filteredItems = group.items.filter(item =>
            !filterQuery ||
            item.label.toLowerCase().includes(filterQuery.toLowerCase()) ||
            (item.subItems && item.subItems.some(sub => sub.label.toLowerCase().includes(filterQuery.toLowerCase())))
          );

          if (filterQuery && filteredItems.length === 0) return null;

          return (
            <div key={groupId} className="space-y-1">
              {/* Group Title Accordion Header */}
              {group.title && (
                <button
                  onClick={() => toggleGroup(groupId)}
                  className={`w-full flex items-center justify-between px-2.5 pt-2 pb-1 text-[10px] font-black uppercase tracking-wider text-left transition-colors cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none focus-visible:outline-none border-0 ring-0 ${
                    isLuxury
                      ? 'text-[#D4AF37] hover:text-[#F3E5AB]'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {group.icon && (
                      <group.icon className={`w-3 h-3 ${isLuxury ? 'text-[#D4AF37]' : 'text-red-600'}`} />
                    )}
                    {group.title}
                  </span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''} ${isLuxury ? 'text-[#D4AF37]' : 'text-slate-400'}`} />
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
                          onClick={() => {
                            onSelectTab(item.id, item.filter);
                          }}
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
                                ? isLuxury ? 'text-white' : 'text-red-600'
                                : isLuxury ? 'text-slate-400 group-hover:text-white' : 'text-slate-400 group-hover:text-red-600'
                            }`} />
                            <span className="truncate text-left">{item.label}</span>
                          </div>

                          {!isLuxury && item.badge !== undefined && item.badge !== null && (
                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isActive
                                ? isLuxury
                                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#C5A880] text-slate-950 font-black shadow-xs'
                                  : 'bg-red-600 text-white'
                                : isLuxury
                                ? 'bg-slate-800/90 text-slate-300 border border-slate-700/60'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </button>

                        {/* Nested Sub-Menu List */}
                        {item.subItems && item.subItems.length > 0 && (
                          <div className={`ml-5 pl-2 border-l space-y-1 py-1 ${isLuxury ? 'border-slate-800' : 'border-slate-200'}`}>
                            {item.subItems.map((sub) => {
                              const isSubActive = activeTab === sub.id && (!sub.filter || sub.filterActive);
                              const SubIcon = sub.icon || ChevronRight;

                              return (
                                <button
                                  key={sub.id}
                                  onClick={() => {
                                    onSelectTab(sub.id, sub.filter);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors duration-150 text-left cursor-pointer outline-none focus:outline-none focus:ring-0 active:outline-none focus-visible:outline-none border-0 ring-0 ${
                                    isSubActive
                                      ? isLuxury
                                        ? 'bg-[#BF8E36] text-white font-bold rounded-lg shadow-sm'
                                        : 'bg-red-100/60 text-red-700 font-bold border border-red-200'
                                      : isLuxury
                                      ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5 truncate flex-1 pr-1">
                                    <SubIcon className={`w-3 h-3 ${
                                      isSubActive
                                        ? isLuxury ? 'text-[#D4AF37]' : 'text-red-600'
                                        : 'text-slate-500'
                                    }`} />
                                    <span className="truncate text-left">{sub.label}</span>
                                  </div>
                                  {!isLuxury && sub.badge !== undefined && sub.badge !== null && (
                                    <span className={`shrink-0 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                                      isLuxury ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {sub.badge}
                                    </span>
                                  )}
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
                @{user?.username || 'admin'}
              </div>
              <div className={`text-[10px] font-medium uppercase truncate ${isLuxury ? 'text-[#D4AF37]' : 'text-slate-500'}`}>
                {user?.role || 'SUPER_ADMIN'}
              </div>
            </div>
          </div>

          <button
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
    </aside>
  );
};

export default Sidebar;
