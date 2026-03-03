import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { dolarService } from '../../services/dolar.service';
import { LogOut, Menu, DollarSign, Calendar } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [cotizacion, setCotizacion] = useState<number | null>(null);

  useEffect(() => {
    const fetchCotizacion = async () => {
      try {
        const { cotizaciones } = await dolarService.getCotizaciones();
        const blue = cotizaciones.find(c => c.tipo?.toLowerCase().includes('blue'));
        const oficial = cotizaciones.find(c => c.tipo?.toLowerCase().includes('oficial'));
        setCotizacion(blue?.venta || oficial?.venta || cotizaciones[0]?.venta || null);
      } catch {
        // Silenciar error - cotización es solo informativa
      }
    };
    fetchCotizacion();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error en logout:', error);
    }
  };

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left: Hamburger (mobile) + Date */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span className="capitalize">{today}</span>
          </div>
        </div>

        {/* Right: Dollar + User + Logout */}
        <div className="flex items-center gap-3">
          {cotizacion && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
              <DollarSign className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">
                USD {cotizacion.toLocaleString('es-AR')}
              </span>
            </div>
          )}

          <div className="h-5 w-px bg-border hidden sm:block" />

          <div className="hidden sm:block">
            <span className="text-sm font-medium text-foreground">
              {user?.nombre}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
};
