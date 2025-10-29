import React from 'react';
import { 
  FileText, 
  DollarSign, 
  AlertTriangle, 
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  // Datos de ejemplo para el dashboard
  const stats = [
    {
      name: 'Ventas Activas',
      value: '12',
      change: '+2',
      changeType: 'positive',
      icon: FileText,
    },
    {
      name: 'Total Vendido (Mes)',
      value: '$2,864,160',
      change: '+15%',
      changeType: 'positive',
      icon: DollarSign,
    },
    {
      name: 'Alertas Pendientes',
      value: '5',
      change: '-3',
      changeType: 'negative',
      icon: AlertTriangle,
    },
    {
      name: 'Clientes Activos',
      value: '8',
      change: '+1',
      changeType: 'positive',
      icon: Users,
    },
  ];

  const recentVentas = [
    {
      id: '1',
      numeroDTE: 'DTE-2024-001',
      cliente: 'ZARCO MONICA',
      estado: 'ABIERTO',
      fecha: '2024-01-15',
      total: '$2,864,160',
    },
    {
      id: '2',
      numeroDTE: 'DTE-2024-002',
      cliente: 'PEREZ JUAN',
      estado: 'LIQUIDADO',
      fecha: '2024-01-10',
      total: '$1,500,000',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Resumen del sistema de gestión de ventas</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  <p className={`text-sm ${
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change} desde el mes pasado
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráfico de ventas (placeholder) */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Ventas por Mes</h3>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
          <div className="text-center">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Gráfico de ventas (implementar con Recharts)</p>
          </div>
        </div>
      </div>

      {/* Ventas recientes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Ventas Recientes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  DTE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentVentas.map((venta) => (
                <tr key={venta.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {venta.numeroDTE}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {venta.cliente}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      venta.estado === 'ABIERTO' 
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {venta.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(venta.fecha).toLocaleDateString('es-AR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {venta.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

