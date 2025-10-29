import React, { useState, useRef } from 'react';
import { Venta } from '../../types';
import { X, Upload, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { documentosService } from '../../services/documentos.service';

interface CambioEstadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  venta: Venta;
}

interface RemitoData {
  numeroRemito: string;
  fechaRemito: string;
  cliente: string;
  transportista: string;
  categoria: string;
  motivo: string;
  cantidadCargada: number;
}

interface ValidationWarning {
  field: string;
  message: string;
  type: 'warning' | 'info';
}

export const CambioEstadoModal: React.FC<CambioEstadoModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  venta,
}) => {
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-cargar datos del DUT, solo pedir número de remito
  const [formData, setFormData] = useState<RemitoData>({
    numeroRemito: '', // Solo esto se completa manualmente
    fechaRemito: new Date().toISOString().split('T')[0], // Fecha actual
    cliente: venta.titularDestino, // Del DUT
    transportista: '', // Se puede completar
    categoria: venta.categoria, // Del DUT
    motivo: venta.motivo, // Del DUT
    cantidadCargada: venta.cantidadEnDUT, // Del DUT
  });

  const handleInputChange = (field: keyof RemitoData, value: string | number) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    validateData(newData);
  };

  const validateData = (data: RemitoData) => {
    const newWarnings: ValidationWarning[] = [];

    // Validar cliente
    if (data.cliente && data.cliente.toLowerCase() !== venta.titularDestino.toLowerCase()) {
      newWarnings.push({
        field: 'cliente',
        message: `Cliente del remito ("${data.cliente}") no coincide con el DUT ("${venta.titularDestino}")`,
        type: 'warning'
      });
    }

    // Validar categoría
    if (data.categoria && data.categoria.toUpperCase() !== venta.categoria) {
      newWarnings.push({
        field: 'categoria',
        message: `Categoría del remito ("${data.categoria}") no coincide con el DUT ("${venta.categoria}")`,
        type: 'warning'
      });
    }

    // Validar cantidad
    if (data.cantidadCargada > 0 && data.cantidadCargada !== venta.cantidadEnDUT) {
      newWarnings.push({
        field: 'cantidadCargada',
        message: `Cantidad cargada (${data.cantidadCargada}) difiere de la cantidad en DUT (${venta.cantidadEnDUT})`,
        type: 'info'
      });
    }

    setWarnings(newWarnings);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      console.log('Archivo seleccionado:', file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.numeroRemito || !formData.cantidadCargada) {
      // El error se manejará en el componente padre
      return;
    }

    setLoading(true);
    try {
      // Si hay un archivo subido, subirlo como documento
      if (uploadedFile) {
        try {
          await documentosService.uploadDocument(venta.id, uploadedFile, 'REMITO_CAMPO');
          console.log('Documento del remito subido exitosamente');
        } catch (uploadError) {
          console.error('Error subiendo documento:', uploadError);
          // No fallar el proceso si no se puede subir el documento
        }
      }

      await onSubmit({
        ...formData,
        ventaId: venta.id
      });
      handleClose();
    } catch (error) {
      console.error('Error al marcar como retirado:', error);
      // El error se manejará en el componente padre
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      numeroRemito: '',
      fechaRemito: new Date().toISOString().split('T')[0],
      cliente: venta.titularDestino,
      transportista: '',
      categoria: venta.categoria,
      motivo: venta.motivo,
      cantidadCargada: venta.cantidadEnDUT,
    });
    setWarnings([]);
    setUploadedFile(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Marcar como Retirado</h2>
              <p className="text-sm text-gray-600">Registrar datos del remito de retiro</p>
              <p className="text-xs text-gray-500 mt-1">
                DUT: {venta.numeroDUT} | Cliente: {venta.titularDestino}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Información del DUT */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Datos del DUT (pre-cargados)</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
              <div><strong>Cliente:</strong> {venta.titularDestino}</div>
              <div><strong>Categoría:</strong> {venta.categoria}</div>
              <div><strong>Motivo:</strong> {venta.motivo}</div>
              <div><strong>Cantidad DUT:</strong> {venta.cantidadEnDUT}</div>
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="mb-6 space-y-2">
              {warnings.map((warning, index) => (
                <div
                  key={index}
                  className={`flex items-start space-x-2 p-3 rounded-md ${
                    warning.type === 'warning'
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                    warning.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                  }`} />
                  <div>
                    <p className={`text-sm font-medium ${
                      warning.type === 'warning' ? 'text-yellow-800' : 'text-blue-800'
                    }`}>
                      {warning.type === 'warning' ? 'Advertencia' : 'Información'}
                    </p>
                    <p className={`text-sm ${
                      warning.type === 'warning' ? 'text-yellow-700' : 'text-blue-700'
                    }`}>
                      {warning.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Formulario de datos del remito */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Remito *
                </label>
                <input
                  type="text"
                  value={formData.numeroRemito}
                  onChange={(e) => handleInputChange('numeroRemito', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  placeholder="Ej: 0001-00000485"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha del Remito
                </label>
                <input
                  type="date"
                  value={formData.fechaRemito}
                  onChange={(e) => handleInputChange('fechaRemito', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente <span className="text-green-600 text-xs">(del DUT)</span>
                </label>
                <input
                  type="text"
                  value={formData.cliente}
                  onChange={(e) => handleInputChange('cliente', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-green-50"
                  placeholder="Nombre del cliente en el remito"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transportista
                </label>
                <input
                  type="text"
                  value={formData.transportista}
                  onChange={(e) => handleInputChange('transportista', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  placeholder="Nombre del transportista"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría <span className="text-green-600 text-xs">(del DUT)</span>
                </label>
                <input
                  type="text"
                  value={formData.categoria}
                  onChange={(e) => handleInputChange('categoria', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-green-50"
                  placeholder="Categoría del animal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo <span className="text-green-600 text-xs">(del DUT)</span>
                </label>
                <input
                  type="text"
                  value={formData.motivo}
                  onChange={(e) => handleInputChange('motivo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-green-50"
                  placeholder="Motivo de la venta"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad Cargada * <span className="text-green-600 text-xs">(del DUT)</span>
                </label>
                <input
                  type="number"
                  value={formData.cantidadCargada}
                  onChange={(e) => handleInputChange('cantidadCargada', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-green-50"
                  placeholder="Cantidad real retirada del campo"
                  required
                  min="1"
                />
              </div>
            </div>

            {/* Sección para subir documento del remito */}
            <div className="mt-6 p-4 border border-gray-200 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Documento del Remito (Opcional)</h3>
              {uploadedFile ? (
                <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-800">{uploadedFile.name}</p>
                        <p className="text-xs text-green-600">
                          {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUploadedFile(null)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-3">
                    Sube una foto o PDF del remito para mantenerlo como respaldo
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    Seleccionar Archivo
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {loading ? 'Procesando...' : 'Marcar como Retirado'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};