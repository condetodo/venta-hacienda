import React, { useRef, useState } from 'react';
import { Venta } from '../../types';
import { X, Upload, FileText } from 'lucide-react';
import { documentosService } from '../../services/documentos.service';
import { ventasService } from '../../services/ventas.service';

interface RomaneoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  venta: Venta;
}

export const RomaneoModal: React.FC<RomaneoModalProps> = ({ isOpen, onClose, onSubmitted, venta }) => {
  const [loading, setLoading] = useState(false);
  const [cantidadRomaneo, setCantidadRomaneo] = useState<number>(venta.cantidadCargada || venta.cantidadEnDUT);
  const [fechaRomaneo, setFechaRomaneo] = useState<string>(new Date().toISOString().split('T')[0]);
  const [tropa, setTropa] = useState<string>('');
  const [totalKgs, setTotalKgs] = useState<number | ''>('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSelectArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setArchivo(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cantidadRomaneo || cantidadRomaneo <= 0) return;

    setLoading(true);
    try {
      if (archivo) {
        await documentosService.uploadDocument(venta.id, archivo, 'ROMANEO');
      }
      // Actualizar datos de romaneo en la venta (manual)
      const updatePayload: any = {
        cantidadRomaneo,
      };
      if (totalKgs !== '' && !Number.isNaN(totalKgs)) updatePayload.totalKgs = Number(totalKgs);
      if (totalKgs !== '' && cantidadRomaneo) {
        updatePayload.kiloLimpioPorCabeza = Number(totalKgs) / Number(cantidadRomaneo);
      }
      // Guardar tropa y fecha en observaciones para trazabilidad (no hay campos dedicados)
      const infoRomaneo = `Romaneo - Fecha: ${fechaRomaneo}${tropa ? ` | Tropa: ${tropa}` : ''}`;
      updatePayload.observaciones = (venta.observaciones ? `${venta.observaciones}\n` : '') + infoRomaneo;
      if (Object.keys(updatePayload).length > 0) {
        await ventasService.update(venta.id, updatePayload);
      }
      // Dejar el cambio de estado al componente padre para evitar doble PATCH
      onSubmitted();
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setArchivo(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-label="Cargar romaneo">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Registrar Romaneo</h2>
              <p className="text-sm text-gray-600">Sube el PDF del romaneo y confirma la cantidad</p>
              <p className="text-xs text-gray-500 mt-1">DUT: {venta.numeroDUT} | Cliente: {venta.titularDestino}</p>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600" aria-label="Cerrar">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Romaneo</label>
                <input
                  type="date"
                  value={fechaRomaneo}
                  onChange={(e) => setFechaRomaneo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tropa</label>
                <input
                  type="text"
                  value={tropa}
                  onChange={(e) => setTropa(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  placeholder="Ej: 3159"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad Romaneo *</label>
                <input
                  type="number"
                  min={1}
                  value={cantidadRomaneo || ''}
                  onChange={(e) => setCantidadRomaneo(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kilos Totales</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={totalKgs}
                  onChange={(e) => setTotalKgs(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="flex items-end">
                <div className="w-full p-3 bg-gray-50 rounded border border-gray-200 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>Peso promedio por cabeza</span>
                    <strong>
                      {totalKgs !== '' && cantidadRomaneo
                        ? (Number(totalKgs) / Number(cantidadRomaneo)).toFixed(2) + ' kg'
                        : '-'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Archivo Romaneo (PDF/JPG/PNG)</label>
              <div className="flex items-center justify-between p-3 border border-gray-300 rounded-md">
                <div className="flex items-center space-x-2 text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{archivo ? archivo.name : 'Ningún archivo seleccionado'}</span>
                </div>
                <div className="flex space-x-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handleSelectArchivo}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Seleccionar archivo
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button type="button" onClick={handleClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancelar</button>
              <button
                type="submit"
                disabled={loading || !cantidadRomaneo}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-60 inline-flex items-center"
              >
                {loading && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />}
                Confirmar Romaneo
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};


