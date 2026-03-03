import api from './api';
import { DashboardStats, VentasPorMes } from '../types';

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/ventas/dashboard/stats');
    return response.data;
  },

  getVentasPorMes: async (meses: number = 6): Promise<VentasPorMes[]> => {
    const response = await api.get(`/ventas/dashboard/por-mes?meses=${meses}`);
    return response.data;
  },
};
