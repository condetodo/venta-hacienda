import React, { useState, useRef } from 'react';
import { Venta } from '../../types';
import { X, Upload, AlertTriangle, FileText, Plus, Minus } from 'lucide-react';
import { documentosService } from '../../services/documentos.service';

interface CambioEstadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  venta: Venta;
}

interface RemitoFormEntry {
  numero: string;
  fecha: string;
  cantidad: number;
  file: File | null;
}

interface SharedData {
  cliente: string;
  transportista: string;
  categoria: string;
  motivo: string;
}

interface ValidationWarning {
  field: string;
  message: string;
  type: 'warning' | 'info';
}

const createEmptyRemito = (): RemitoFormEntry => ({
  numero: '',
  fecha: new Date().toISOString().split('T')[0],
  cantidad: 0,
  file: null,
});

export const CambioEstadoModal: React.FC<CambioEstadoModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  venta,
}) => {
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<ValidationWarning[]>([]);
  const [cantidadRemitos, setCantidadRemitos] = useState(1);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null]);

  const [remitos, setRemitos] = useState<RemitoFormEntry[]>([
    { ...createEmptyRemito(), cantidad: venta.cantidadEnDUT },
  ]);

  const [sharedData, setSharedData] = useState<SharedData>({
    cliente: venta.titularDestino,
    transportista: '',
    categoria: venta.categoria,
    motivo: venta.motivo,
  });

  const totalCargada = remitos.reduce((sum, r) => sum + (r.cantidad || 0), 0);

  const handleCantidadRemitosChange = (newCount: number) => {
    if (newCount < 1 || newCount > 3) return;
    setCantidadRemitos(newCount);

    setRemitos(prev => {
      if (newCount > prev.length) {
        // Add new empty remitos
        const newRemitos = [...prev];
        for (let i = prev.length; i < newCount; i++) {
          newRemitos.push(createEmptyRemito());
        }
        return newRemitos;
      } else {
        // Trim remitos
        return prev.slice(0, newCount);
      }
    });
  };

  const handleRemitoChange = (index: number, field: keyof RemitoFormEntry, value: string | number | File | null) => {
    setRemitos(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    // Revalidate after state updates
    setTimeout(() => validateData(), 0);
  };

  const handleSharedChange = (field: keyof SharedData, value: string) => {
    setSharedData(prev => ({ ...prev, [field]: value }));
    setTimeout(() => validateData(), 0);
  };

  const validateData = () => {
    const newWarnings: ValidationWarning[] = [];

    if (sharedData.cliente && sharedData.cliente.toLowerCase() !== venta.titularDestino.toLowerCase()) {
      newWarnings.push({
        field: 'cliente',
        message: `Cliente del remito ("${sharedData.cliente}") no coincide con el DUT ("${venta.titularDestino}")`,
        type: 'warning',
      });
    }

    if (sharedData.categoria && sharedData.categoria.toUpperCase() !== venta.categoria) {
      newWarnings.push({
        field: 'categoria',
        message: `Categoria del remito ("${sharedData.categoria}") no coincide con el DUT ("${venta.categoria}")`,
        type: 'warning',
      });
    }

    const total = remitos.reduce((sum, r) => sum + (r.cantidad || 0), 0);
    if (total > 0 && total !== venta.cantidadEnDUT) {
      newWarnings.push({
        field: 'cantidadTotal',
        message: `Total cargado (${total}) difiere de la cantidad en DUT (${venta.cantidadEnDUT})`,
        type: 'info',
      });
    }

    setWarnings(newWarnings);
  };

  const handleFileUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleRemitoChange(index, 'file', file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all remitos have numero and cantidad
    for (let i = 0; i < remitos.length; i++) {
      if (!remitos[i].numero || !remitos[i].cantidad) {
        return;
      }
    }

    setLoading(true);
    try {
      // Upload files for each remito
      for (const remito of remitos) {
        if (remito.file) {
          try {
            await documentosService.upload(venta.id, [remito.file], 'REMITO');
          } catch (uploadError) {
            console.error('Error subiendo documento:', uploadError);
          }
        }
      }

      // Build remitos array for API
      const remitosData = remitos.map(r => ({
        numero: r.numero,
        fecha: r.fecha,
        cantidad: r.cantidad,
      }));

      await onSubmit({
        ventaId: venta.id,
        remitos: remitosData,
        // Backward-compatible fields (from first remito)
        numeroRemito: remitos[0].numero,
        fechaRemito: remitos[0].fecha,
        cantidadCargada: totalCargada,
        // Shared data
        cliente: sharedData.cliente,
        transportista: sharedData.transportista,
        categoria: sharedData.categoria,
        motivo: sharedData.motivo,
      });
      handleClose();
    } catch (error) {
      console.error('Error al marcar como retirado:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCantidadRemitos(1);
    setRemitos([{ ...createEmptyRemito(), cantidad: venta.cantidadEnDUT }]);
    setSharedData({
      cliente: venta.titularDestino,
      transportista: '',
      categoria: venta.categoria,
      motivo: venta.motivo,
    });
    setWarnings([]);
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

          {/* Informacion del DUT */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Datos del DUT (pre-cargados)</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
              <div><strong>Cliente:</strong> {venta.titularDestino}</div>
              <div><strong>Categoria:</strong> {venta.categoria}</div>
              <div><strong>Motivo:</strong> {venta.motivo}</div>
              <div><strong>Cantidad DUT:</strong> {venta.cantidadEnDUT}</div>
            </div>
          </div>

          {/* Selector de cantidad de remitos */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad de Remitos
            </label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleCantidadRemitosChange(n)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    cantidadRemitos === n
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {n} {n === 1 ? 'Remito' : 'Remitos'}
                </button>
              ))}
            </div>
            {cantidadRemitos > 1 && (
              <p className="text-xs text-gray-500 mt-1">
                Ej: retiro en {cantidadRemitos} dias por problemas con camiones
              </p>
            )}
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
                      {warning.type === 'warning' ? 'Advertencia' : 'Informacion'}
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

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Remitos */}
            {remitos.map((remito, idx) => (
              <div
                key={idx}
                className={`p-4 border rounded-lg ${
                  cantidadRemitos > 1 ? 'border-gray-300 bg-gray-50' : 'border-gray-200'
                }`}
              >
                {cantidadRemitos > 1 && (
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">
                    Remito {idx + 1} de {cantidadRemitos}
                  </h4>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      N° Remito *
                    </label>
                    <input
                      type="text"
                      value={remito.numero}
                      onChange={(e) => handleRemitoChange(idx, 'numero', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      placeholder="Ej: 0001-00000485"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={remito.fecha}
                      onChange={(e) => handleRemitoChange(idx, 'fecha', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cantidad *
                    </label>
                    <input
                      type="number"
                      value={remito.cantidad || ''}
                      onChange={(e) => handleRemitoChange(idx, 'cantidad', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                      placeholder="Cantidad"
                      required
                      min="1"
                    />
                  </div>
                </div>

                {/* File upload per remito */}
                <div className="mt-3">
                  {remito.file ? (
                    <div className="border border-green-200 bg-green-50 rounded-md p-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-green-800">{remito.file.name}</span>
                          <span className="text-xs text-green-600">
                            ({(remito.file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemitoChange(idx, 'file', null)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <input
                        ref={el => { fileInputRefs.current[idx] = el; }}
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => handleFileUpload(idx, e)}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[idx]?.click()}
                        className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Adjuntar remito</span>
                      </button>
                      <span className="text-xs text-gray-400">Opcional</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Total cargado (solo si hay mas de 1 remito) */}
            {cantidadRemitos > 1 && (
              <div className={`p-3 rounded-lg border ${
                totalCargada !== venta.cantidadEnDUT
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total cargado:</span>
                  <span className={`text-lg font-bold ${
                    totalCargada !== venta.cantidadEnDUT ? 'text-amber-700' : 'text-green-700'
                  }`}>
                    {totalCargada}
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      / {venta.cantidadEnDUT} en DUT
                    </span>
                  </span>
                </div>
              </div>
            )}

            {/* Datos compartidos */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Datos generales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente <span className="text-green-600 text-xs">(del DUT)</span>
                  </label>
                  <input
                    type="text"
                    value={sharedData.cliente}
                    onChange={(e) => handleSharedChange('cliente', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-green-50"
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transportista
                  </label>
                  <input
                    type="text"
                    value={sharedData.transportista}
                    onChange={(e) => handleSharedChange('transportista', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    placeholder="Nombre del transportista"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria <span className="text-green-600 text-xs">(del DUT)</span>
                  </label>
                  <input
                    type="text"
                    value={sharedData.categoria}
                    onChange={(e) => handleSharedChange('categoria', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-green-50"
                    placeholder="Categoria del animal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo <span className="text-green-600 text-xs">(del DUT)</span>
                  </label>
                  <input
                    type="text"
                    value={sharedData.motivo}
                    onChange={(e) => handleSharedChange('motivo', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary bg-green-50"
                    placeholder="Motivo de la venta"
                  />
                </div>
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
        </div>
      </div>
    </div>
  );
};
