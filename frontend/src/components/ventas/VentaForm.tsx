import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Venta,
  Establecimiento, 
  CategoriaAnimal, 
  FormaPago,
  ESTABLECIMIENTOS,
  CATEGORIAS_ANIMAL,
  FORMAS_PAGO
} from '../../types';
import { ventasService } from '../../services/ventas.service';
// import { useAuth } from '../../contexts/AuthContext'; // No se usa actualmente

// Schema de validación para el formulario de venta
const ventaSchema = z.object({
  // === INFORMACIÓN GENERAL DEL DUT ===
  establecimientoEmisor: z.nativeEnum(Establecimiento),
  numeroDUT: z.string().min(1, 'Número DUT es requerido'),
  titularDestino: z.string().min(1, 'Titular destino es requerido'),
  numeroRespaDestino: z.string().optional(),
  fechaEmisionDUT: z.string().min(1, 'Fecha de emisión DUT es requerida'),
  fechaCargaDUT: z.string().min(1, 'Fecha de carga DUT es requerida'),
  fechaVencimientoDUT: z.string().optional(),
  motivo: z.string().min(1, 'El motivo es requerido'),
  categoria: z.nativeEnum(CategoriaAnimal),
  valorDUT: z.number().min(0, 'Debe ser mayor o igual a 0').default(0),
  valorGuia: z.number().min(0, 'Debe ser mayor o igual a 0').default(0),
  
  // === CONTROL DE CANTIDADES ===
  cantidadEnDUT: z.number().min(1, 'Cantidad debe ser mayor a 0'),
  fechaCargaReal: z.string().optional(),
  cantidadCargada: z.number().optional(),
  cantidadRomaneo: z.number().optional(),
  
  // === FAENA ===
  totalKgs: z.number().optional(),
  kiloLimpioPorCabeza: z.number().optional(),
  
  // === PRECIOS Y CÁLCULOS ===
  precioKg: z.number().optional(),
  precioCabeza: z.number().optional(),
  importeEnUSD: z.number().optional(),
  tipoCambio: z.number().optional(),
  importeOriginal: z.number().optional(),
  importeNeto: z.number().optional(),
  
  // === FACTURACIÓN ===
  iva: z.number().min(0).max(100).default(10.5),
  totalOperacion: z.number().optional(),
  retencion: z.number().min(0).default(0),
  totalAPagar: z.number().optional(),
  sinFacturar: z.boolean().default(false),
  numeroFactura: z.string().optional(),
  
  // === INFORMACIÓN DE PAGO ===
  formaPago: z.nativeEnum(FormaPago).optional(),
  dondeSeAcredita: z.string().optional(),
  fechaPago: z.string().optional(),
  
  // === ADICIONALES ===
  observaciones: z.string().optional(),
  estado: z.string().default('ABIERTO'),
});

type VentaFormSchema = z.infer<typeof ventaSchema>;

interface VentaFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: Partial<Venta>;
}

export const VentaForm: React.FC<VentaFormProps> = ({ 
  onSuccess, 
  onCancel, 
  initialData 
}) => {
  // const { user } = useAuth(); // No se usa actualmente
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<VentaFormSchema>({
    resolver: zodResolver(ventaSchema),
    defaultValues: {
      establecimientoEmisor: Establecimiento.LOCHIEL,
      motivo: 'Faena',
      categoria: CategoriaAnimal.OVEJA,
      valorDUT: 0,
      valorGuia: 0,
      iva: 10.5,
      retencion: 0,
      sinFacturar: false,
      estado: 'ABIERTO',
      ...initialData,
    },
  });

  // Calcular totales automáticamente
  const watchedValues = watch();
  React.useEffect(() => {
    const { totalKgs, precioKg, iva, retencion, valorDUT, valorGuia, tipoCambio } = watchedValues;
    
    if (totalKgs && precioKg) {
      const importeEnUSD = totalKgs * precioKg;
      const importeOriginal = importeEnUSD * (tipoCambio || 1);
      const importeNeto = importeOriginal;
      const totalOperacion = importeNeto * (1 + iva / 100);
      const totalAPagar = totalOperacion - retencion - (valorDUT || 0) - (valorGuia || 0);
      
      setValue('importeEnUSD', importeEnUSD);
      setValue('importeOriginal', importeOriginal);
      setValue('importeNeto', importeNeto);
      setValue('totalOperacion', totalOperacion);
      setValue('totalAPagar', totalAPagar);
    }
  }, [watchedValues.totalKgs, watchedValues.precioKg, watchedValues.tipoCambio, watchedValues.iva, watchedValues.retencion, watchedValues.valorDUT, watchedValues.valorGuia, setValue]);

  const onSubmit = async (data: VentaFormSchema) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      if (initialData?.id) {
        // Actualizar venta existente
        await ventasService.update(initialData.id, data);
      } else {
        // Crear nueva venta
        await ventasService.create(data);
      }
      
      reset();
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar la venta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {initialData?.id ? 'Editar Venta' : 'Nueva Venta'}
          </h2>
          <p className="text-sm text-gray-600">
            Complete la información de la venta de hacienda
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Información General del DUT */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Información General del DUT</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Establecimiento Emisor *
                </label>
                <select
                  {...register('establecimientoEmisor')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                >
                  {ESTABLECIMIENTOS.map((est) => (
                    <option key={est.value} value={est.value}>
                      {est.label}
                    </option>
                  ))}
                </select>
                {errors.establecimientoEmisor && (
                  <p className="mt-1 text-sm text-red-600">{errors.establecimientoEmisor.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Número DUT *
                </label>
                <input
                  {...register('numeroDUT')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="DUT-2024-001"
                />
                {errors.numeroDUT && (
                  <p className="mt-1 text-sm text-red-600">{errors.numeroDUT.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Titular Destino *
                </label>
                <input
                  {...register('titularDestino')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="ZARCO MONICA"
                />
                {errors.titularDestino && (
                  <p className="mt-1 text-sm text-red-600">{errors.titularDestino.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Número Respa Destino
                </label>
                <input
                  {...register('numeroRespaDestino')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="12345"
                />
              </div>
            </div>
          </div>

          {/* Fechas y Costos del DUT */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Fechas y Costos del DUT</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fecha Emisión DUT *
                </label>
                <input
                  {...register('fechaEmisionDUT')}
                  type="date"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
                {errors.fechaEmisionDUT && (
                  <p className="mt-1 text-sm text-red-600">{errors.fechaEmisionDUT.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fecha Carga DUT *
                </label>
                <input
                  {...register('fechaCargaDUT')}
                  type="date"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
                {errors.fechaCargaDUT && (
                  <p className="mt-1 text-sm text-red-600">{errors.fechaCargaDUT.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fecha Vencimiento DUT
                </label>
                <input
                  {...register('fechaVencimientoDUT')}
                  type="date"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Motivo de Venta *
                </label>
                <input
                  {...register('motivo')}
                  type="text"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Ej: Reproducción UE, Faena, Cría, etc."
                />
                {errors.motivo && (
                  <p className="mt-1 text-sm text-red-600">{errors.motivo.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Categoría del Animal *
                </label>
                <select
                  {...register('categoria')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                >
                  {CATEGORIAS_ANIMAL.map((categoria) => (
                    <option key={categoria.value} value={categoria.value}>
                      {categoria.label}
                    </option>
                  ))}
                </select>
                {errors.categoria && (
                  <p className="mt-1 text-sm text-red-600">{errors.categoria.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Valor DUT
                </label>
                <input
                  {...register('valorDUT', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="150.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Valor Guía (solo Lochiel)
                </label>
                <input
                  {...register('valorGuia', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="50.00"
                />
              </div>
            </div>
          </div>

          {/* Control de Cantidades (Triple Control) */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Control de Cantidades (Triple Control)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cantidad en DUT *
                </label>
                <input
                  {...register('cantidadEnDUT', { valueAsNumber: true })}
                  type="number"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="300"
                />
                {errors.cantidadEnDUT && (
                  <p className="mt-1 text-sm text-red-600">{errors.cantidadEnDUT.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Cantidad autorizada en el DUT</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cantidad Cargada
                </label>
                <input
                  {...register('cantidadCargada', { valueAsNumber: true })}
                  type="number"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="290"
                />
                <p className="mt-1 text-xs text-gray-500">Cantidad real retirada del campo</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cantidad Romaneo
                </label>
                <input
                  {...register('cantidadRomaneo', { valueAsNumber: true })}
                  type="number"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="288"
                />
                <p className="mt-1 text-xs text-gray-500">Cantidad recibida en frigorífico</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fecha Carga Real
                </label>
                <input
                  {...register('fechaCargaReal')}
                  type="date"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
                <p className="mt-1 text-xs text-gray-500">Fecha real del remito (puede coincidir con DUT)</p>
              </div>
            </div>
          </div>

          {/* Faena */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Faena</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Total Kilos
                </label>
                <input
                  {...register('totalKgs', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="8640.00"
                />
                <p className="mt-1 text-xs text-gray-500">Kilos totales obtenidos</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Kilo Limpio por Cabeza
                </label>
                <input
                  {...register('kiloLimpioPorCabeza', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="30.00"
                />
                <p className="mt-1 text-xs text-gray-500">Peso promedio por animal</p>
              </div>
            </div>
          </div>

          {/* Precios y Cálculos */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Precios y Cálculos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Precio por Kg (USD)
                </label>
                <input
                  {...register('precioKg', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="2.50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Precio por Cabeza (USD)
                </label>
                <input
                  {...register('precioCabeza', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="75.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tipo de Cambio
                </label>
                <input
                  {...register('tipoCambio', { valueAsNumber: true })}
                  type="number"
                  step="0.0001"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="1200.0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  IVA (%)
                </label>
                <input
                  {...register('iva', { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="10.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Retenciones
                </label>
                <input
                  {...register('retencion', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Totales Calculados */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Totales Calculados</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Importe en USD
                  </label>
                  <input
                    {...register('importeEnUSD', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    readOnly
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Importe Original (ARS)
                  </label>
                  <input
                    {...register('importeOriginal', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    readOnly
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Total Operación (con IVA)
                  </label>
                  <input
                    {...register('totalOperacion', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    readOnly
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Total a Pagar
                  </label>
                  <input
                    {...register('totalAPagar', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    readOnly
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Facturación */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Facturación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  {...register('sinFacturar')}
                  type="checkbox"
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700">
                  Sin Facturar
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Número de Factura
                </label>
                <input
                  {...register('numeroFactura')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="FAC-2024-001"
                />
              </div>
            </div>
          </div>

          {/* Información de Pago */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Información de Pago</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Forma de Pago
                </label>
                <select
                  {...register('formaPago')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                >
                  <option value="">Seleccionar...</option>
                  {FORMAS_PAGO.map((forma) => (
                    <option key={forma.value} value={forma.value}>
                      {forma.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Donde se Acredita
                </label>
                <input
                  {...register('dondeSeAcredita')}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="CREDICOOP"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fecha de Pago
                </label>
                <input
                  {...register('fechaPago')}
                  type="date"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Información Adicional</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Observaciones
              </label>
              <textarea
                {...register('observaciones')}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : (initialData?.id ? 'Actualizar' : 'Crear Venta')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
