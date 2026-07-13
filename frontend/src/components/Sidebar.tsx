import React from 'react';
import { 
  ShieldAlert, 
  LayoutDashboard, 
  AlertTriangle, 
  TicketCheck, 
  Terminal, 
  SearchCode, 
  Settings, 
  LogOut,
  Sliders
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  user: User | null;
  onLogout: () => void;
  unresolvedCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentPage, 
  setCurrentPage, 
  user, 
  onLogout,
  unresolvedCount
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'alerts', label: 'Security Alerts', icon: AlertTriangle, badge: unresolvedCount > 0 ? unresolvedCount : undefined },
    { id: 'incidents', label: 'Incidents', icon: TicketCheck },
    { id: 'logs', label: 'Log Collector', icon: Terminal },
    { id: 'intel', label: 'Threat Intel', icon: SearchCode },
    { id: 'settings', label: 'SOAR settings', icon: Settings },
  ];

  return (
    <aside className="w-64 glass-panel h-screen sticky top-0 flex flex-col justify-between border-r border-[var(--border-glass)]">
      <div className="p-6">
        {/* Brand/Logo */}
        <div className="flex items-center space-x-3 mb-8">
          <div className="bg-gradient-to-br from-[var(--accent-violet)] to-[var(--accent-cyan)] p-2 rounded-lg glow-active">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wider text-glow-cyan bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              CYXXR
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--accent-cyan)] block">
              SOC Platform
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-all duration-200 group ${
                  isActive 
                    ? 'bg-gradient-to-r from-purple-900/40 to-cyan-900/10 text-[var(--accent-cyan)] border-l-2 border-[var(--accent-cyan)] shadow-[inset_4px_0_12px_rgba(6,182,212,0.15)] font-medium'
                    : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 transition-transform group-hover:scale-105 ${isActive ? 'text-[var(--accent-cyan)]' : 'text-gray-400 group-hover:text-white'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="bg-red-500/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Information & Logout */}
      <div className="p-4 border-t border-[var(--border-glass)] bg-black/20">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--accent-violet)] to-[var(--accent-cyan)] flex items-center justify-center font-bold text-sm text-white">
            {user?.name.split(' ').map(n => n[0]).join('') || 'SOC'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate text-gray-200">{user?.name || 'SOC User'}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{user?.role || 'Analyst'}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all border border-red-500/20"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Terminate Session</span>
        </button>
      </div>
    </aside>
  );
};
