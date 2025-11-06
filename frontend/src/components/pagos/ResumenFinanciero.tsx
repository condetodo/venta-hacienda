import React from 'react';
import { DollarSign, TrendingUp, AlertCircle, Clock } from 'lucide-react';

interface ResumenFinancieroProps {
  totalPorCobrar: number;
  totalPagadoMes: number;
  pagosRetrasados: {
    cantidad: number;
    monto: number;
  };
  ventasPendientes: number;
}

export const ResumenFinanciero: React.FC<ResumenFinancieroProps> = ({
  totalPorCobrar,
  totalPagadoMes,
  pagosRetrasados,
  ventasPendientes,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const cards = [
    {
      title: 'Total por Cobrar',
      value: formatCurrency(totalPorCobrar),
      icon: DollarSign,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      title: 'Total Pagado (Mes)',
      value: formatCurrency(totalPagadoMes),
      icon: TrendingUp,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      title: 'Pagos Retrasados',
      value: `${pagosRetrasados.cantidad} ventas`,
      subtitle: formatCurrency(pagosRetrasados.monto),
      icon: AlertCircle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
    },
    {
      title: 'Ventas Pendientes',
      value: `${ventasPendientes} ventas`,
      icon: Clock,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className={`${card.bgColor} rounded-lg shadow p-6 border border-gray-200`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
                {card.subtitle && (
                  <p className={`text-sm font-medium ${card.textColor} mt-1`}>
                    {card.subtitle}
                  </p>
                )}
              </div>
              <div className={`${card.color} rounded-full p-3`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

