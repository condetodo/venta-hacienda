import React, { useState, useEffect } from 'react';
import { Upload, FileText, Download, Trash2, Eye, Calendar } from 'lucide-react';
import { documentosService, Documento } from '../../services/documentos.service';
import { useToast } from '../../hooks/useToast';

interface DocumentosListProps {
  ventaId: string;
  onDocumentUploaded?: () => void;
}

export const DocumentosList: React.FC<DocumentosListProps> = ({
  ventaId,
  onDocumentUploaded,
}) => {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadDocumentos();
  }, [ventaId]);

  const loadDocumentos = async () => {
    try {
      setLoading(true);
      const { documentos } = await documentosService.getByVenta(ventaId);
      setDocumentos(documentos);
    } catch (error) {
      console.error('Error cargando documentos:', error);
      showError('Error', 'No se pudieron cargar los documentos');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const fileArray = Array.from(files);
      const { documentos: nuevosDocumentos } = await documentosService.upload(ventaId, fileArray);
      
      setDocumentos(prev => [...prev, ...nuevosDocumentos]);
      showSuccess('Documentos subidos', `${nuevosDocumentos.length} documento(s) subido(s) exitosamente`);
      
      if (onDocumentUploaded) {
        onDocumentUploaded();
      }
    } catch (error: any) {
      console.error('Error subiendo documentos:', error);
      const errorMessage = error.response?.data?.error || 'Error al subir documentos';
      showError('Error', errorMessage);
    } finally {
      setUploading(false);
      // Limpiar el input
      event.target.value = '';
    }
  };

  const handleDownload = async (documento: Documento) => {
    try {
      const blob = await documentosService.download(documento.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documento.nombreArchivo;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error descargando documento:', error);
      showError('Error', 'No se pudo descargar el documento');
    }
  };

  const handleDelete = async (documento: Documento) => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar ${documento.nombreArchivo}?`)) {
      return;
    }

    try {
      await documentosService.delete(documento.id);
      setDocumentos(prev => prev.filter(doc => doc.id !== documento.id));
      showSuccess('Documento eliminado', `${documento.nombreArchivo} ha sido eliminado`);
      
      if (onDocumentUploaded) {
        onDocumentUploaded();
      }
    } catch (error: any) {
      console.error('Error eliminando documento:', error);
      const errorMessage = error.response?.data?.error || 'Error al eliminar documento';
      showError('Error', errorMessage);
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'DUT':
        return '📄';
      case 'REMITO_CAMPO':
        return '📋';
      case 'ROMANEO':
        return '📊';
      case 'LIQUIDACION':
        return '💰';
      case 'FACTURA':
        return '🧾';
      case 'COMPROBANTE_PAGO':
        return '💳';
      default:
        return '📎';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'DUT':
        return 'DUT';
      case 'REMITO_CAMPO':
        return 'Remito de Campo';
      case 'ROMANEO':
        return 'Romaneo';
      case 'LIQUIDACION':
        return 'Liquidación';
      case 'FACTURA':
        return 'Factura';
      case 'COMPROBANTE_PAGO':
        return 'Comprobante de Pago';
      default:
        return 'Otro';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Documentos</h3>
        <div className="flex items-center space-x-2">
          <input
            type="file"
            id="document-upload"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          <label
            htmlFor="document-upload"
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed ${
              uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Subiendo...' : 'Subir Documento'}
          </label>
        </div>
      </div>

      {documentos.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 text-sm">No hay documentos cargados</p>
          <p className="text-gray-400 text-xs mt-1">Sube documentos para mantener toda la información centralizada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documentos.map((documento) => (
            <div
              key={documento.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getTipoIcon(documento.tipo)}</span>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900">{documento.nombreArchivo}</p>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getTipoLabel(documento.tipo)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDate(documento.fechaCarga)}
                    </span>
                    <span>{formatFileSize(documento.tamano)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleDownload(documento)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Descargar"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => window.open(documento.url, '_blank')}
                  className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                  title="Ver"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(documento)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
