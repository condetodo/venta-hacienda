import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Search } from 'lucide-react';
import { PagoFormData, Venta, Moneda, FormaPago, FORMAS_PAGO } from '../../types';
import { pagosService } from '../../services/pagos.service';
import { ventasService } from '../../services/ventas.service';
import { dolarService } from '../../services/dolar.service';

const pagoSchema = z.object({
  ventaId: z.string().min(1, 'Debe seleccionar una venta'),
  monto: z.number().min(0.01, 'El monto debe ser mayor a 0'),
  moneda: z.nativeEnum(Moneda),
  tipoCambio: z.number().optional(),
  fecha: z.string().min(1, 'La fecha es requerida'),
  formaPago: z.nativeEnum(FormaPago),
  referencia: z.string().optional(),
  dondeSeAcredita: z.string().optional(),
  observaciones: z.string().optional(),
}).refine((data) => {
  if (data.moneda === Moneda.USD && !data.tipoCambio) {
    return false;
  }
  return true;
}, {
  message: 'El tipo de cambio es requerido para pagos en USD',
  path: ['tipoCambio'],
});

type PagoFormSchema = z.infer<typeof pagoSchema>;

interface RegistrarPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ventaSeleccionada?: Venta;
}

export const RegistrarPagoModal: React.FC<RegistrarPagoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  ventaSeleccionada,
}) => {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [ventaSeleccionadaState, setVentaSeleccionadaState] = useState<Venta | null>(
    ventaSeleccionada || null
  );
  const [busquedaVenta, setBusquedaVenta] = useState('');
  const [mostrarBusqueda, setMostrarBusqueda] = useState(!ventaSeleccionada);
  const [tipoCambioActual, setTipoCambioActual] = useState<number | null>(null);
  const [montoEnARS, setMontoEnARS] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
    control,
  } = useForm<PagoFormSchema>({
    resolver: zodResolver(pagoSchema),
    defaultValues: {
      moneda: Moneda.ARS,
      formaPago: FormaPago.TRANSFERENCIA,
    },
  });

  const moneda = watch('moneda');
  const monto = watch('monto');
  const tipoCambio = watch('tipoCambio');

  useEffect(() => {
    if (ventaSeleccionada) {
      setVentaSeleccionadaState(ventaSeleccionada);
      setValue('ventaId', ventaSeleccionada.id);
      setMostrarBusqueda(false);
      calcularFechaPago(ventaSeleccionada);
    }
  }, [ventaSeleccionada, setValue]);

  useEffect(() => {
    if (isOpen && !ventaSeleccionada) {
      fetchVentas();
      fetchTipoCambio();
    }
  }, [isOpen, ventaSeleccionada]);

  // Calcular monto en ARS si es USD
  useEffect(() => {
    if (monto && moneda === Moneda.USD && tipoCambio) {
      setMontoEnARS(monto * tipoCambio);
    } else {
      setMontoEnARS(null);
    }
  }, [monto, moneda, tipoCambio]);

  const calcularFechaPago = (venta: Venta) => {
    // Si tiene fechaRomaneo, usar esa fecha + 30 días
    if (venta.fechaRomaneo) {
      const fechaRomaneo = new Date(venta.fechaRomaneo);
      const fechaPago = new Date(fechaRomaneo);
      fechaPago.setDate(fechaPago.getDate() + 30);
      setValue('fecha', fechaPago.toISOString().split('T')[0]);
    } else if (venta.fechaCargaReal) {
      // Si no tiene fechaRomaneo pero tiene fechaCargaReal, usar esa + 30 días
      const fechaCarga = new Date(venta.fechaCargaReal);
      const fechaPago = new Date(fechaCarga);
      fechaPago.setDate(fechaPago.getDate() + 30);
      setValue('fecha', fechaPago.toISOString().split('T')[0]);
    } else {
      // Si no tiene ninguna fecha, usar fecha actual + 30 días como fallback
      const fechaPago = new Date();
      fechaPago.setDate(fechaPago.getDate() + 30);
      setValue('fecha', fechaPago.toISOString().split('T')[0]);
    }
  };

  const fetchVentas = async () => {
    try {
      const response = await ventasService.getAll({ limit: 1000 });
      // Filtrar solo ventas con precio acordado
      const ventasConPrecio = response.ventas.filter(
        (venta) => venta.totalAPagar && venta.totalAPagar > 0
      );
      setVentas(ventasConPrecio);
    } catch (error) {
      console.error('Error al cargar ventas:', error);
    }
  };

  const fetchTipoCambio = async () => {
    try {
      const response = await dolarService.getCotizacion('blue');
      if (response.cotizacion?.compra) {
        setTipoCambioActual(response.cotizacion.compra);
        setValue('tipoCambio', response.cotizacion.compra);
      }
    } catch (error) {
      console.error('Error al cargar tipo de cambio:', error);
    }
  };

  const ventasFiltradas = ventas.filter((venta) => {
    // Solo filtrar por búsqueda - mostrar TODAS las ventas que coincidan
    // El filtro de romaneo (totalKgs) se aplicará solo al intentar seleccionar
    if (!busquedaVenta) return true;
    
    const busqueda = busquedaVenta.toLowerCase();
    return (
      venta.numeroDUT.toLowerCase().includes(busqueda) ||
      venta.titularDestino.toLowerCase().includes(busqueda)
    );
  });

  const handleSeleccionarVenta = (venta: Venta) => {
    // Verificar que tenga precio acordado
    if (!venta.totalAPagar || venta.totalAPagar === 0) {
      alert('Esta venta no tiene precio acordado. Debe asignar el precio por kilo primero.');
      return;
    }
    
    setVentaSeleccionadaState(venta);
    setValue('ventaId', venta.id);
    setMostrarBusqueda(false);
    setBusquedaVenta('');
    calcularFechaPago(venta);
    
    // Si la venta tiene tipoCambio, prellenar
    if (venta.tipoCambio) {
      setValue('tipoCambio', venta.tipoCambio);
    }
    
    // Si la venta tiene moneda (importeEnUSD indica USD), prellenar
    if (venta.importeEnUSD) {
      setValue('moneda', Moneda.USD);
    }
  };

  const onSubmit = async (data: PagoFormSchema) => {
    try {
      if (!ventaSeleccionadaState) {
        alert('Debe seleccionar una venta');
        return;
      }

      if (!ventaSeleccionadaState.totalAPagar || ventaSeleccionadaState.totalAPagar === 0) {
        alert('La venta seleccionada no tiene precio acordado. Debe asignar el precio por kilo primero.');
        return;
      }

      // Validar que el monto no exceda el saldo pendiente
      const saldoPendiente = ventaSeleccionadaState.totalAPagar - (ventaSeleccionadaState.totalPagado || 0);
      const montoPago = data.moneda === Moneda.USD && data.tipoCambio 
        ? data.monto * data.tipoCambio 
        : data.monto;

      if (montoPago > saldoPendiente) {
        alert(`El monto del pago (${formatCurrency(montoPago)}) excede el saldo pendiente (${formatCurrency(saldoPendiente)})`);
        return;
      }

      const pagoData: PagoFormData = {
        ventaId: ventaSeleccionadaState.id,
        monto: data.monto,
        moneda: data.moneda,
        tipoCambio: data.tipoCambio,
        fecha: data.fecha,
        formaPago: data.formaPago,
        referencia: data.referencia,
        dondeSeAcredita: data.dondeSeAcredita,
        observaciones: data.observaciones,
      };

      await pagosService.create(pagoData);

      reset();
      setVentaSeleccionadaState(null);
      setBusquedaVenta('');
      setMontoEnARS(null);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error al registrar pago:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.message || 'Error al registrar el pago';
      const errorDetails = error.response?.data?.details;
      alert(`${errorMessage}${errorDetails ? '\n\nDetalles: ' + errorDetails : ''}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatCurrencyInput = (amount: number | undefined, currency: Moneda): string => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '';
    }
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency === Moneda.USD ? 'USD' : 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const parseCurrencyInput = (value: string): number | undefined => {
    // Remover símbolos de moneda, espacios y caracteres no numéricos (excepto punto y coma)
    const cleaned = value
      .replace(/[^\d,.-]/g, '')
      .replace(/\./g, '') // Remover puntos (separadores de miles)
      .replace(',', '.'); // Convertir coma a punto decimal
    
    const numericValue = parseFloat(cleaned);
    return isNaN(numericValue) ? undefined : numericValue;
  };

  const saldoPendiente = ventaSeleccionadaState
    ? (ventaSeleccionadaState.totalAPagar || 0) - ventaSeleccionadaState.totalPagado
    : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Registrar Pago</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Selección de Venta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Venta <span className="text-red-500">*</span>
            </label>
            {mostrarBusqueda ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por DUT o cliente..."
                    value={busquedaVenta}
                    onChange={(e) => setBusquedaVenta(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                  />
                </div>
                {busquedaVenta && (
                  <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto">
                    {ventasFiltradas.length > 0 ? (
                      ventasFiltradas.map((venta) => (
                        <button
                          key={venta.id}
                          type="button"
                          onClick={() => handleSeleccionarVenta(venta)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{venta.numeroDUT}</div>
                          <div className="text-sm text-gray-500">{venta.titularDestino}</div>
                          <div className="text-xs text-gray-400">
                            Kgs: {venta.totalKgs || '-'} | Saldo: {formatCurrency((venta.totalAPagar || 0) - (venta.totalPagado || 0))}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-gray-500">No se encontraron ventas</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{ventaSeleccionadaState?.numeroDUT}</div>
                    <div className="text-sm text-gray-500">{ventaSeleccionadaState?.titularDestino}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Total: {formatCurrency(ventaSeleccionadaState?.totalAPagar || 0)} | 
                      Pagado: {formatCurrency(ventaSeleccionadaState?.totalPagado || 0)} | 
                      Pendiente: {formatCurrency(saldoPendiente)}
                    </div>
                    {ventaSeleccionadaState?.totalKgs && (
                      <div className="text-sm text-gray-600 mt-1">
                        Kilos de Romaneo: {ventaSeleccionadaState.totalKgs.toLocaleString('es-AR')} kg
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarBusqueda(true);
                      setVentaSeleccionadaState(null);
                      setValue('ventaId', '');
                    }}
                    className="text-primary hover:text-primary/80 text-sm"
                  >
                    Cambiar
                  </button>
                </div>
              </div>
            )}
            <input type="hidden" {...register('ventaId')} />
            {errors.ventaId && (
              <p className="mt-1 text-sm text-red-600">{errors.ventaId.message}</p>
            )}
          </div>

          {/* Monto y Moneda */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto del Pago <span className="text-red-500">*</span>
              </label>
              <Controller
                name="monto"
                control={control}
                render={({ field }) => (
                  <input
                    type="text"
                    {...field}
                    value={field.value !== null && field.value !== undefined ? formatCurrencyInput(field.value, moneda) : ''}
                    onChange={(e) => {
                      const numericValue = parseCurrencyInput(e.target.value);
                      field.onChange(numericValue);
                    }}
                    onBlur={field.onBlur}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                    placeholder="Ingrese el monto..."
                  />
                )}
              />
              {errors.monto && (
                <p className="mt-1 text-sm text-red-600">{errors.monto.message}</p>
              )}
              {ventaSeleccionadaState && (
                <button
                  type="button"
                  onClick={() => {
                    // Si es USD, necesitamos convertir el saldo pendiente a USD
                    if (moneda === Moneda.USD && tipoCambio) {
                      setValue('monto', saldoPendiente / tipoCambio);
                    } else {
                      setValue('monto', saldoPendiente);
                    }
                  }}
                  className="mt-1 text-xs text-primary hover:text-primary/80 hover:underline cursor-pointer"
                  title="Hacer clic para autocompletar con el saldo pendiente"
                >
                  Saldo pendiente: {formatCurrency(saldoPendiente)}
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Moneda <span className="text-red-500">*</span>
              </label>
              <select
                {...register('moneda')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              >
                <option value={Moneda.ARS}>ARS (Pesos)</option>
                <option value={Moneda.USD}>USD (Dólares)</option>
              </select>
              {errors.moneda && (
                <p className="mt-1 text-sm text-red-600">{errors.moneda.message}</p>
              )}
            </div>
          </div>

          {/* Tipo de Cambio (si es USD) */}
          {moneda === Moneda.USD && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Cambio <span className="text-red-500">*</span>
                {tipoCambioActual && (
                  <span className="text-xs text-gray-500 ml-2">
                    (Actual: {tipoCambioActual.toFixed(2)})
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.0001"
                {...register('tipoCambio', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              />
              {errors.tipoCambio && (
                <p className="mt-1 text-sm text-red-600">{errors.tipoCambio.message}</p>
              )}
              {montoEnARS && (
                <p className="mt-1 text-sm text-gray-600">
                  Equivale a: {formatCurrency(montoEnARS)}
                </p>
              )}
            </div>
          )}

          {/* Fecha y Forma de Pago */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Pago <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('fecha')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              />
              {errors.fecha && (
                <p className="mt-1 text-sm text-red-600">{errors.fecha.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Forma de Pago <span className="text-red-500">*</span>
              </label>
              <select
                {...register('formaPago')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              >
                {FORMAS_PAGO.map((forma) => (
                  <option key={forma.value} value={forma.value}>
                    {forma.label}
                  </option>
                ))}
              </select>
              {errors.formaPago && (
                <p className="mt-1 text-sm text-red-600">{errors.formaPago.message}</p>
              )}
            </div>
          </div>

          {/* Referencia y Donde se Acredita */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referencia
              </label>
              <input
                type="text"
                {...register('referencia')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                placeholder="Número de referencia del pago..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Donde se Acredita
              </label>
              <input
                type="text"
                {...register('dondeSeAcredita')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                placeholder="Banco o cuenta donde se acredita..."
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Observaciones
            </label>
            <textarea
              rows={3}
              {...register('observaciones')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
              placeholder="Notas adicionales sobre el pago..."
            />
          </div>

          {/* Resumen del pago */}
          {monto && ventaSeleccionadaState && !isNaN(monto) && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Resumen del Pago</h3>
              <div className="space-y-1 text-sm text-blue-800">
                <div className="font-semibold">Monto: {formatCurrency(monto)} {moneda}</div>
                {moneda === Moneda.USD && montoEnARS && !isNaN(montoEnARS) && (
                  <div>Equivale a: {formatCurrency(montoEnARS)} ARS</div>
                )}
                <div className="mt-2 pt-2 border-t border-blue-300">
                  <div>Total a pagar: {formatCurrency(ventaSeleccionadaState.totalAPagar || 0)}</div>
                  <div>Ya pagado: {formatCurrency(ventaSeleccionadaState.totalPagado || 0)}</div>
                  <div className="font-semibold">Saldo pendiente: {formatCurrency(saldoPendiente)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !monto}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Registrando...' : 'Registrar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
