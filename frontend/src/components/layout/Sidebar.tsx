import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  X
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Ventas', href: '/ventas', icon: FileText },
  { name: 'Pagos', href: '/pagos', icon: DollarSign },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-border
        transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}
    >
      {/* Brand */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-border">
        <NavLink to="/dashboard" className="flex items-center gap-3" onClick={onClose}>
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-lg leading-none" role="img" aria-label="sheep">&#129415;</span>
          </div>
          <div className="leading-tight">
            <span className="block text-sm font-bold text-foreground tracking-tight">
              LA LOCHIEL
            </span>
            <span className="block text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Hacienda Ovina
            </span>
          </div>
        </NavLink>
        <button
          onClick={onClose}
          className="md:hidden p-1 rounded-md text-muted-foreground hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href ||
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
          return (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }
              `}
            >
              <Icon className="flex-shrink-0" style={{ width: 18, height: 18 }} />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground/60 text-center uppercase tracking-wider">
          Ea. La Lochiel &middot; Chubut, Argentina
        </p>
      </div>
    </aside>
  );
};
