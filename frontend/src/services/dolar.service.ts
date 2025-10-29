import api from './api';
import { CotizacionDolar } from '../types';

export const dolarService = {
  // Obtener todas las cotizaciones
  getCotizaciones: async (): Promise<{ cotizaciones: CotizacionDolar[] }> => {
    const response = await api.get('/dolar/cotizaciones');
    return response.data;
  },

  // Obtener cotización específica
  getCotizacion: async (tipo: string): Promise<{ cotizacion: CotizacionDolar }> => {
    const response = await api.get(`/dolar/cotizacion/${tipo}`);
    return response.data;
  },
};

