import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  FileText,
  DollarSign,
  AlertTriangle,
  Wallet,
  Loader2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { dashboardService } from '../services/dashboard.service';
import { ventasService } from '../services/ventas.service';
import { DashboardStats, VentasPorMes, Venta } from '../types';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const formatARS = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);

const estadoBadge: Record<string, string> = {
  ABIERTO: 'bg-blue-50 text-blue-700 border-blue-200',
  RETIRADO: 'bg-amber-50 text-amber-700 border-amber-200',
  ROMANEO: 'bg-purple-50 text-purple-700 border-purple-200',
  FINALIZADO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ventasPorMes, setVentasPorMes] = useState<VentasPorMes[]>([]);
  const [recentVentas, setRecentVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsRes, mesRes, ventasRes] = await Promise.allSettled([
          dashboardService.getStats(),
          dashboardService.getVentasPorMes(6),
          ventasService.getAll({ limit: 5, page: 1 }),
        ]);

        if (statsRes.status === 'fulfilled') setStats(statsRes.value);
        if (mesRes.status === 'fulfilled') setVentasPorMes(mesRes.value);
        if (ventasRes.status === 'fulfilled') setRecentVentas(ventasRes.value.ventas ?? []);
      } catch {
        setError('No se pudieron cargar los datos del dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Preparar datos para el gráfico
  const chartData = ventasPorMes.map((v) => ({
    name: `${MESES[v.mes - 1]}`,
    total: Math.round(v.total),
    cantidad: v.cantidad,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Cargando dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen de operaciones</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ventas Activas */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileText className="h-4.5 w-4.5 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Ventas Activas
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats?.ventasActivas ?? 0}</p>
        </div>

        {/* Total Vendido Mes */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Vendido (Mes)
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatARS(stats?.totalVendidoMes ?? 0)}
          </p>
        </div>

        {/* Total por Cobrar */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <Wallet className="h-4.5 w-4.5 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Por Cobrar
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {formatARS(stats?.totalPorCobrar ?? 0)}
          </p>
        </div>

        {/* Alertas Pendientes */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="h-4.5 w-4.5 text-red-500" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Alertas
            </span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {stats?.alertasPendientes?.length ?? 0}
          </p>
        </div>
      </div>

      {/* Main Content: Chart + Alerts side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ventas por Mes - Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Ventas por Mes</h3>
            <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: 'hsl(150 5% 45%)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(150 5% 45%)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
                />
                <Tooltip
                  formatter={(value: number) => [formatARS(value), 'Total']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid hsl(var(--border))',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    fontSize: '13px',
                  }}
                />
                <Bar
                  dataKey="total"
                  fill="hsl(var(--primary))"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">Sin datos de ventas en este período</p>
            </div>
          )}
        </div>

        {/* Alertas Panel */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Alertas Recientes</h3>
          {stats?.alertasPendientes && stats.alertasPendientes.length > 0 ? (
            <div className="space-y-3">
              {stats.alertasPendientes.map((alerta) => (
                <div
                  key={alerta.id}
                  className="flex items-start gap-3 p-3 bg-red-50/50 rounded-lg border border-red-100"
                >
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {alerta.venta?.numeroDUT || 'Sin DUT'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {alerta.mensaje}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Sin alertas pendientes</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Ventas Table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Últimas Ventas</h3>
          <Link
            to="/ventas"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recentVentas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    DUT
                  </th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Destino
                  </th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                    Categoría
                  </th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                    Cantidad
                  </th>
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentVentas.map((venta) => (
                  <tr
                    key={venta.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <Link
                        to={`/ventas/${venta.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {venta.numeroDUT}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {venta.titularDestino}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell capitalize">
                      {venta.categoria?.toLowerCase()}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">
                      {venta.cantidadEnDUT} cab.
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${
                          estadoBadge[venta.estado] || 'bg-gray-50 text-gray-700 border-gray-200'
                        }`}
                      >
                        {venta.estado}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <DollarSign className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-sm">No hay ventas registradas</p>
            <Link to="/ventas" className="mt-2 text-xs text-primary hover:underline">
              Crear primera venta
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
