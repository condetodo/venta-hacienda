import api from './api';
import { Venta, VentaFormData, VentasFilters, PaginatedResponse } from '../types';

export const ventasService = {
  // Obtener todas las ventas con filtros
  getAll: async (filters: VentasFilters = {}): Promise<PaginatedResponse<Venta>> => {
    const response = await api.get('/ventas', { params: filters });
    return response.data;
  },

  // Obtener venta por ID
  getById: async (id: string): Promise<{ venta: Venta }> => {
    const response = await api.get(`/ventas/${id}`);
    return response.data;
  },

  // Crear nueva venta
  create: async (data: VentaFormData): Promise<{ venta: Venta }> => {
    const response = await api.post('/ventas', data);
    return response.data;
  },

  // Actualizar venta
  update: async (id: string, data: Partial<VentaFormData>): Promise<{ venta: Venta }> => {
    const response = await api.put(`/ventas/${id}`, data);
    return response.data;
  },

  // Eliminar venta
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/ventas/${id}`);
    return response.data;
  },

  // Actualizar estado de venta
  updateEstado: async (id: string, estado: string): Promise<{ venta: Venta }> => {
    const response = await api.patch(`/ventas/${id}/estado`, { estado });
    return response.data;
  },

  // Marcar venta como retirado con datos del remito
  marcarComoRetirado: async (id: string, datosRemito: any): Promise<{ venta: Venta }> => {
    const response = await api.post(`/ventas/${id}/marcar-retirado`, datosRemito);
    return response.data;
  },
};

