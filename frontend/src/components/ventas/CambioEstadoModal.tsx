import React, { useState, useRef } from 'react';
import { Venta } from '../../types';
import { X, Upload, AlertTriangle, CheckCircle } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'manual' | 'image'>('manual');
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrData, setOcrData] = useState<RemitoData | null>(null);
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<RemitoData>({
    numeroRemito: '',
    fechaRemito: '',
    cliente: '',
    transportista: '',
    categoria: '',
    motivo: '',
    cantidadCargada: 0,
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
        // TODO: Implementar Tesseract OCR aquí
        // Por ahora simulamos datos extraídos
        const mockOcrData: RemitoData = {
          numeroRemito: '0001-00000485',
          fechaRemito: '2025-10-14',
          cliente: 'FRIGORIFICO HERMOSO',
          transportista: 'RAUL JORGE',
          categoria: 'BORREGOS',
          motivo: 'FAENA',
          cantidadCargada: 300,
        };
        setOcrData(mockOcrData);
        validateData(mockOcrData);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUseOcrData = () => {
    if (ocrData) {
      setFormData(ocrData);
      validateData(ocrData);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.numeroRemito || !formData.cantidadCargada) {
      alert('Número de remito y cantidad cargada son obligatorios');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        ventaId: venta.id,
        nuevoEstado: 'RETIRADO'
      });
      onClose();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      numeroRemito: '',
      fechaRemito: '',
      cliente: '',
      transportista: '',
      categoria: '',
      motivo: '',
      cantidadCargada: 0,
    });
    setWarnings([]);
    setImagePreview(null);
    setOcrData(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Marcar como Retirado</h2>
            <p className="text-gray-600">Registrar datos del remito de retiro</p>
            <p className="text-sm text-gray-500 mt-1">
              DUT: {venta.numeroDUT} | Cliente: {venta.titularDestino}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-6">
          <button
            onClick={() => setActiveTab('manual')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'manual'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Cargar Manual
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              activeTab === 'image'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Leer Imagen
          </button>
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

        {/* Manual Tab */}
        {activeTab === 'manual' && (
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
                  Cliente
                </label>
                <input
                  type="text"
                  value={formData.cliente}
                  onChange={(e) => handleInputChange('cliente', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
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
                  Categoría
                </label>
                <input
                  type="text"
                  value={formData.categoria}
                  onChange={(e) => handleInputChange('categoria', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  placeholder="Categoría del animal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo
                </label>
                <input
                  type="text"
                  value={formData.motivo}
                  onChange={(e) => handleInputChange('motivo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  placeholder="Motivo de la venta"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad Cargada *
                </label>
                <input
                  type="number"
                  value={formData.cantidadCargada}
                  onChange={(e) => handleInputChange('cantidadCargada', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  placeholder="Cantidad real retirada del campo"
                  required
                  min="1"
                />
              </div>
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
        )}

        {/* Image Tab */}
        {activeTab === 'image' && (
          <div className="space-y-4">
            {!imagePreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Subir imagen del remito
                </p>
                <p className="text-gray-600 mb-4">
                  Selecciona una imagen del remito para extraer los datos automáticamente
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                >
                  Seleccionar Imagen
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Datos extraídos</h3>
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setOcrData(null);
                      setWarnings([]);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cambiar imagen
                  </button>
                </div>

                {ocrData && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Número de Remito
                        </label>
                        <input
                          type="text"
                          value={ocrData.numeroRemito}
                          onChange={(e) => setOcrData({...ocrData, numeroRemito: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fecha
                        </label>
                        <input
                          type="date"
                          value={ocrData.fechaRemito}
                          onChange={(e) => setOcrData({...ocrData, fechaRemito: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cliente
                        </label>
                        <input
                          type="text"
                          value={ocrData.cliente}
                          onChange={(e) => setOcrData({...ocrData, cliente: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Transportista
                        </label>
                        <input
                          type="text"
                          value={ocrData.transportista}
                          onChange={(e) => setOcrData({...ocrData, transportista: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Categoría
                        </label>
                        <input
                          type="text"
                          value={ocrData.categoria}
                          onChange={(e) => setOcrData({...ocrData, categoria: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Motivo
                        </label>
                        <input
                          type="text"
                          value={ocrData.motivo}
                          onChange={(e) => setOcrData({...ocrData, motivo: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cantidad Cargada
                        </label>
                        <input
                          type="number"
                          value={ocrData.cantidadCargada}
                          onChange={(e) => setOcrData({...ocrData, cantidadCargada: parseInt(e.target.value) || 0})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUseOcrData}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Usar Datos Extraídos
                  </button>
                  <button
                    onClick={() => {
                      if (ocrData) {
                        setFormData(ocrData);
                        setActiveTab('manual');
                      }
                    }}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                  >
                    Continuar con Datos
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

