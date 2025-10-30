import api from './api';

export interface Documento {
  id: string;
  ventaId: string;
  tipo: 'DUT' | 'REMITO_CAMPO' | 'ROMANEO' | 'LIQUIDACION' | 'FACTURA' | 'COMPROBANTE_PAGO' | 'OTRO';
  nombreArchivo: string;
  url: string;
  mimeType: string;
  tamano: number;
  fechaCarga: string;
  datosExtraidos?: any;
}

export const documentosService = {
  // Obtener documentos de una venta
  getByVenta: async (ventaId: string): Promise<{ documentos: Documento[] }> => {
    const response = await api.get(`/documentos/venta/${ventaId}`);
    return response.data;
  },

  // Subir documentos
  upload: async (ventaId: string, files: File[], tipo: string = 'DUT'): Promise<{ documentos: Documento[] }> => {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('files', file);
    });
    // Enviar el tipo de documento seleccionado (DUT | REMITO | ROMANEO)
    formData.append('tipoDocumento', tipo);

    const response = await api.post(`/documentos/upload/${ventaId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Subir documento específico
  uploadDocument: async (ventaId: string, file: File, tipoDocumento: string): Promise<{ documento: Documento }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ventaId', ventaId);
    formData.append('tipoDocumento', tipoDocumento);

    const response = await api.post('/dut/upload-document', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Descargar documento
  download: async (documentoId: string): Promise<Blob> => {
    const response = await api.get(`/documentos/${documentoId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Eliminar documento
  delete: async (documentoId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/documentos/${documentoId}`);
    return response.data;
  },
};
