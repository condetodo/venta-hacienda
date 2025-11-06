import api from './api';
import { Pago, PagoFormData } from '../types';

export const pagosService = {
  // Obtener pagos de una venta
  getByVenta: async (ventaId: string): Promise<{ pagos: Pago[] }> => {
    const response = await api.get(`/pagos/venta/${ventaId}`);
    return response.data;
  },

  // Crear nuevo pago
  create: async (data: PagoFormData): Promise<{ pago: Pago }> => {
    const response = await api.post('/pagos', data);
    return response.data;
  },

  // Actualizar pago
  update: async (id: string, data: Partial<PagoFormData>): Promise<{ pago: Pago }> => {
    const response = await api.put(`/pagos/${id}`, data);
    return response.data;
  },

  // Eliminar pago
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/pagos/${id}`);
    return response.data;
  },
};

