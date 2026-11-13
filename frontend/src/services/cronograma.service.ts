import api from './api';

export type EstadoCarga = 'PROGRAMADA' | 'CARGADA' | 'CANCELADA';

export interface CargaProgramada {
  id: string;
  fecha: string; // YYYY-MM-DD
  cantidad: number;
  categoria: string;
  comprador: string;
  origen: string | null;
  condiciones: string | null;
  notas: string | null;
  estado: EstadoCarga;
  ventaId: string | null;
  venta: { id: string; numeroDUT: string; estado: string } | null;
}

export interface CargaProgramadaInput {
  fecha: string;
  cantidad: number;
  categoria: string;
  comprador: string;
  origen?: string | null;
  condiciones?: string | null;
  notas?: string | null;
  estado?: EstadoCarga;
}

export interface SugerenciasCronograma {
  compradores: string[];
  categorias: string[];
  origenes: string[];
}

export const cronogramaService = {
  getRango: async (desde: string, hasta: string): Promise<CargaProgramada[]> => {
    const response = await api.get('/cronograma', { params: { desde, hasta } });
    return response.data.cargas;
  },

  getSugerencias: async (): Promise<SugerenciasCronograma> => {
    const response = await api.get('/cronograma/sugerencias');
    return response.data;
  },

  create: async (data: CargaProgramadaInput): Promise<CargaProgramada> => {
    const response = await api.post('/cronograma', data);
    return response.data.carga;
  },

  update: async (id: string, data: Partial<CargaProgramadaInput>): Promise<CargaProgramada> => {
    const response = await api.put(`/cronograma/${id}`, data);
    return response.data.carga;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/cronograma/${id}`);
  },
};
