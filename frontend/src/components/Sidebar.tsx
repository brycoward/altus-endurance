import React from 'react';
import { 
  LayoutDashboard, 
  BookOpen, 
  Scale, 
  Calendar, 
  User, 
  Settings, 
  LogOut,
  Target,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: any) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export function Sidebar({ activeView, onViewChange, isCollapsed, setIsCollapsed }: SidebarProps) {
  const { logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'endurance', label: 'Endurance', icon: Target },
    { id: 'journal', label: 'Nutrition Journal', icon: BookOpen },
    { id: 'biometrics', label: 'Biometrics', icon: Scale },
    { id: 'history', label: 'Historic Data', icon: Calendar },
  ];

  const settingItems = [
    { id: 'user-settings', label: 'User Settings', icon: User },
    { id: 'app-settings', label: 'App Settings', icon: Settings },
    { id: 'data-portability', label: 'Import / Export', icon: Target },
  ];

  return (
    <div className={clsx(
      "h-screen bg-[rgb(var(--bg-sidebar))] border-r border-[rgb(var(--border))] flex flex-col transition-all duration-300 z-30",
      isCollapsed ? "w-20" : "w-64"
    )}>
      <div className="p-6 flex items-center justify-between border-b border-[rgb(var(--border))]">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 flex items-center justify-center bg-transparent" style={{ backgroundColor: 'transparent' }}>
                <img 
                  src="/logo.png?v=3" 
                  alt="Altus" 
                  className="w-full h-full object-contain" 
                  style={{ backgroundColor: 'transparent' }}
                />
             </div>
            <div>
              <div className="text-sm font-black text-[rgb(var(--text-primary))] uppercase tracking-tighter">Altus</div>
              <div className="text-[8px] font-bold text-[rgb(var(--text-muted))] uppercase tracking-widest">Performance</div>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-10 h-10 mx-auto bg-transparent" style={{ backgroundColor: 'transparent' }}>
            <img 
              src="/logo.png?v=3" 
              alt="Altus" 
              className="w-full h-full object-contain" 
              style={{ backgroundColor: 'transparent' }}
            />
          </div>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-4 mt-6 space-y-2">
        <div className={clsx(
          "text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))] mb-4 px-2",
          isCollapsed && "text-center"
        )}>
          {isCollapsed ? "•••" : "Menu"}
        </div>
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
              activeView === item.id 
                ? "bg-[rgba(var(--emerald),0.1)] text-[rgb(var(--emerald))] border border-[rgba(var(--emerald),0.2)]" 
                : "text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-primary))] hover:text-[rgb(var(--text-primary))]"
            )}
          >
            <item.icon size={20} className={clsx(
              "transition-colors",
              activeView === item.id ? "text-[rgb(var(--emerald))]" : "text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--text-secondary))]"
            )} />
            {!isCollapsed && <span className="text-sm font-bold">{item.label}</span>}
          </button>
        ))}

        <div className={clsx(
          "text-[10px] font-black uppercase tracking-widest text-[rgb(var(--text-muted))] mb-4 px-2 pt-6",
          isCollapsed && "text-center"
        )}>
          {isCollapsed ? "•••" : "Configuration"}
        </div>
        {settingItems.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={clsx(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
              activeView === item.id 
                ? "bg-[rgba(var(--emerald),0.1)] text-[rgb(var(--emerald))] border border-[rgba(var(--emerald),0.2)]" 
                : "text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-primary))] hover:text-[rgb(var(--text-primary))]"
            )}
          >
            <item.icon size={20} className={clsx(
              "transition-colors",
              activeView === item.id ? "text-[rgb(var(--emerald))]" : "text-[rgb(var(--text-muted))] group-hover:text-[rgb(var(--text-secondary))]"
            )} />
            {!isCollapsed && <span className="text-sm font-bold">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[rgb(var(--border))] space-y-2">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-primary))] transition-all"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          {!isCollapsed && <span className="text-sm font-bold">Collapse</span>}
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500/70 hover:text-red-400 hover:bg-red-500/5 transition-all"
        >
          <LogOut size={20} />
          {!isCollapsed && <span className="text-sm font-bold">Logout</span>}
        </button>
      </div>
    </div>
  );
}
