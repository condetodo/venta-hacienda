import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  DollarSign, 
  AlertTriangle,
  Settings 
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Ventas', href: '/ventas', icon: FileText },
  { name: 'Pagos', href: '/pagos', icon: DollarSign },
  { name: 'Alertas', href: '/alertas', icon: AlertTriangle },
  { name: 'Configuración', href: '/configuracion', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <nav className="w-64 bg-white shadow-sm border-r">
      <div className="p-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

