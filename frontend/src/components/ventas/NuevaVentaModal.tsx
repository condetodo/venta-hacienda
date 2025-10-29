import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Establecimiento, 
  CategoriaAnimal,
  ESTABLECIMIENTOS,
  CATEGORIAS_ANIMAL
} from '../../types';
import { dutExtractionService } from '../../services/dut-extraction.service';

// Schema solo para información del DUT
const dutSchema = z.object({
  establecimientoEmisor: z.nativeEnum(Establecimiento),
  numeroDUT: z.string().min(1, 'Número de DUT es requerido'),
  titularDestino: z.string().min(1, 'Titular destino es requerido'),
  numeroRespaDestino: z.string().optional(),
  fechaEmisionDUT: z.string().min(1, 'Fecha de emisión es requerida'),
  fechaCargaDUT: z.string().min(1, 'Fecha de carga es requerida'),
  fechaVencimientoDUT: z.string().optional(),
  motivo: z.string().min(1, 'El motivo es requerido'),
  categoria: z.nativeEnum(CategoriaAnimal),
  valorDUT: z.number().min(0, 'Valor debe ser mayor o igual a 0'),
  valorGuia: z.number().min(0, 'Valor debe ser mayor o igual a 0'),
  cantidadEnDUT: z.number().min(1, 'Cantidad debe ser mayor a 0'),
});

type DUTFormData = z.infer<typeof dutSchema>;

interface NuevaVentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DUTFormData) => void;
}

export const NuevaVentaModal: React.FC<NuevaVentaModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [modoEntrada, setModoEntrada] = useState<'manual' | 'dut'>('manual');
  const [archivoDUT, setArchivoDUT] = useState<File | null>(null);
  const [extrayendoDUT, setExtrayendoDUT] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<DUTFormData>({
    resolver: zodResolver(dutSchema),
    defaultValues: {
      establecimientoEmisor: Establecimiento.LOCHIEL,
      motivo: '',
      categoria: CategoriaAnimal.OVEJA,
      valorDUT: 0,
      valorGuia: 0,
      cantidadEnDUT: 0,
    },
  });

  const establecimientoEmisor = watch('establecimientoEmisor');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setArchivoDUT(file);
    }
  };

  const extraerDatosDUT = async () => {
    console.log('Iniciando extracción de datos DUT...');
    console.log('Archivo seleccionado:', archivoDUT);
    
    if (!archivoDUT) {
      console.log('No hay archivo seleccionado');
      return;
    }

    setExtrayendoDUT(true);
    console.log('Estado extrayendoDUT cambiado a true');
    
    try {
      // Validar archivo
      const validacion = dutExtractionService.validateFile(archivoDUT);
      if (!validacion.valid) {
        alert(validacion.error);
        return;
      }

      // Determinar tipo de archivo
      const tipoArchivo = archivoDUT.type === 'application/pdf' ? 'pdf' : 'imagen';

      // Extraer datos del DUT (usando extracción real)
      console.log('Llamando a extractFromFile...');
      const resultado = await dutExtractionService.extractFromFile({
        archivo: archivoDUT,
        tipoArchivo
      });
      console.log('Resultado de extracción:', resultado);

      // Mostrar resultado de la extracción
      if (resultado.errores && resultado.errores.length > 0) {
        console.warn('Errores en la extracción:', resultado.errores);
      }

      // Llenar el formulario con los datos extraídos
      console.log('Llenando formulario con datos extraídos...');
      console.log('Datos completos del resultado:', JSON.stringify(resultado, null, 2));
      
      // Los datos están en resultado.data
      const datosExtraidos = resultado.data || resultado;
      console.log('Datos extraídos para mapear:', datosExtraidos);
      console.log('Estructura del resultado:', {
        hasData: !!resultado.data,
        hasDirectProps: !!resultado.numeroDUT,
        keys: Object.keys(resultado)
      });
      
      if (datosExtraidos.numeroDUT) {
        console.log('Estableciendo numeroDUT:', datosExtraidos.numeroDUT);
        setValue('numeroDUT', datosExtraidos.numeroDUT);
      } else {
        console.log('numeroDUT no encontrado en datosExtraidos');
      }
      if (datosExtraidos.titularDestino) {
        console.log('Estableciendo titularDestino:', datosExtraidos.titularDestino);
        setValue('titularDestino', datosExtraidos.titularDestino);
      } else {
        console.log('titularDestino no encontrado en datosExtraidos');
      }
      if (datosExtraidos.numeroRespaDestino) {
        console.log('Estableciendo numeroRespaDestino:', datosExtraidos.numeroRespaDestino);
        setValue('numeroRespaDestino', datosExtraidos.numeroRespaDestino);
      } else {
        console.log('numeroRespaDestino no encontrado en datosExtraidos');
      }
      if (datosExtraidos.fechaEmisionDUT) {
        console.log('Estableciendo fechaEmisionDUT:', datosExtraidos.fechaEmisionDUT);
        setValue('fechaEmisionDUT', datosExtraidos.fechaEmisionDUT);
      } else {
        console.log('fechaEmisionDUT no encontrado en datosExtraidos');
      }
      if (datosExtraidos.fechaCargaDUT) {
        console.log('Estableciendo fechaCargaDUT:', datosExtraidos.fechaCargaDUT);
        setValue('fechaCargaDUT', datosExtraidos.fechaCargaDUT);
      } else {
        console.log('fechaCargaDUT no encontrado en datosExtraidos');
      }
      if (datosExtraidos.fechaVencimientoDUT) {
        console.log('Estableciendo fechaVencimientoDUT:', datosExtraidos.fechaVencimientoDUT);
        setValue('fechaVencimientoDUT', datosExtraidos.fechaVencimientoDUT);
      } else {
        console.log('fechaVencimientoDUT no encontrado en datosExtraidos');
      }
      if (datosExtraidos.motivo) {
        console.log('Estableciendo motivo:', datosExtraidos.motivo);
        setValue('motivo', datosExtraidos.motivo);
      } else {
        console.log('motivo no encontrado en datosExtraidos');
      }
      if (datosExtraidos.categoria) {
        console.log('Estableciendo categoria:', datosExtraidos.categoria);
        setValue('categoria', datosExtraidos.categoria as CategoriaAnimal);
      } else {
        console.log('categoria no encontrado en datosExtraidos');
      }
      if (datosExtraidos.valorDUT) {
        console.log('Estableciendo valorDUT:', datosExtraidos.valorDUT);
        setValue('valorDUT', datosExtraidos.valorDUT);
      } else {
        console.log('valorDUT no encontrado en datosExtraidos');
      }
      if (datosExtraidos.valorGuia) {
        console.log('Estableciendo valorGuia:', datosExtraidos.valorGuia);
        setValue('valorGuia', datosExtraidos.valorGuia);
      } else {
        console.log('valorGuia no encontrado en datosExtraidos');
      }
      if (datosExtraidos.cantidadEnDUT) {
        console.log('Estableciendo cantidadEnDUT:', datosExtraidos.cantidadEnDUT);
        setValue('cantidadEnDUT', datosExtraidos.cantidadEnDUT);
      } else {
        console.log('cantidadEnDUT no encontrado en datosExtraidos');
      }

      // Mostrar nivel de confianza
      if (datosExtraidos.confianza) {
        const mensaje = `Datos extraídos con ${datosExtraidos.confianza}% de confianza`;
        if (datosExtraidos.confianza < 70) {
          alert(`⚠️ ${mensaje}. Por favor, revise los datos extraídos.`);
        } else {
          alert(`✅ ${mensaje}. Los datos se han cargado automáticamente.`);
        }
      }

      // Log final para verificar el estado del formulario
      console.log('Proceso de llenado completado. Verificando estado del formulario...');
      console.log('Valores actuales del formulario:', {
        numeroDUT: watch('numeroDUT'),
        titularDestino: watch('titularDestino'),
        numeroRespaDestino: watch('numeroRespaDestino'),
        fechaEmisionDUT: watch('fechaEmisionDUT'),
        fechaCargaDUT: watch('fechaCargaDUT'),
        fechaVencimientoDUT: watch('fechaVencimientoDUT'),
        motivo: watch('motivo'),
        categoria: watch('categoria'),
        valorDUT: watch('valorDUT'),
        valorGuia: watch('valorGuia'),
        cantidadEnDUT: watch('cantidadEnDUT'),
      });

    } catch (error: any) {
      console.error('Error extrayendo datos del DUT:', error);
      alert(`Error al extraer datos del DUT: ${error.message}`);
    } finally {
      setExtrayendoDUT(false);
    }
  };

  const handleFormSubmit = (data: DUTFormData) => {
    // Incluir el archivo DUT en los datos si existe
    const dataWithFile = {
      ...data,
      archivoDUT: archivoDUT
    };
    onSubmit(dataWithFile);
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    setArchivoDUT(null);
    setModoEntrada('manual');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Nueva Venta - Información del DUT</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Selector de modo de entrada */}
          <div className="mb-6">
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setModoEntrada('manual')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  modoEntrada === 'manual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Carga Manual
              </button>
              <button
                type="button"
                onClick={() => setModoEntrada('dut')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  modoEntrada === 'dut'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Subir DUT
              </button>
            </div>
          </div>

          {modoEntrada === 'dut' && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Subir Documento DUT</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar archivo DUT
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                
                {archivoDUT && (
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      Archivo seleccionado: {archivoDUT.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Botón Extraer Datos clickeado');
                        extraerDatosDUT();
                      }}
                      disabled={extrayendoDUT}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {extrayendoDUT ? 'Extrayendo...' : 'Extraer Datos'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('Test button clicked');
                        alert('Test button funciona!');
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Test
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Información General del DUT */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Información General del DUT</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Establecimiento Emisor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Establecimiento Emisor *
                  </label>
                  <select
                    {...register('establecimientoEmisor')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {ESTABLECIMIENTOS.map((establecimiento) => (
                      <option key={establecimiento.value} value={establecimiento.value}>
                        {establecimiento.label}
                      </option>
                    ))}
                  </select>
                  {errors.establecimientoEmisor && (
                    <p className="text-red-500 text-sm mt-1">{errors.establecimientoEmisor.message}</p>
                  )}
                </div>

                {/* Número DUT */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número DUT *
                  </label>
                  <input
                    type="text"
                    {...register('numeroDUT')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: DUT-2024-001"
                  />
                  {errors.numeroDUT && (
                    <p className="text-red-500 text-sm mt-1">{errors.numeroDUT.message}</p>
                  )}
                </div>

                {/* Titular Destino */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Titular Destino *
                  </label>
                  <input
                    type="text"
                    {...register('titularDestino')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Cliente que compra"
                  />
                  {errors.titularDestino && (
                    <p className="text-red-500 text-sm mt-1">{errors.titularDestino.message}</p>
                  )}
                </div>

                {/* Número Respa Destino */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número Respa Destino
                  </label>
                  <input
                    type="text"
                    {...register('numeroRespaDestino')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Número sanitario del comprador"
                  />
                </div>

                {/* Fechas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Emisión DUT *
                  </label>
                  <input
                    type="date"
                    {...register('fechaEmisionDUT')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.fechaEmisionDUT && (
                    <p className="text-red-500 text-sm mt-1">{errors.fechaEmisionDUT.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Carga DUT *
                  </label>
                  <input
                    type="date"
                    {...register('fechaCargaDUT')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.fechaCargaDUT && (
                    <p className="text-red-500 text-sm mt-1">{errors.fechaCargaDUT.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Vencimiento DUT
                  </label>
                  <input
                    type="date"
                    {...register('fechaVencimientoDUT')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Motivo y Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo *
                  </label>
                  <input
                    {...register('motivo')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Reproducción UE, Faena, Cría, etc."
                  />
                  {errors.motivo && (
                    <p className="text-red-500 text-sm mt-1">{errors.motivo.message}</p>
                  )}
                </div>

                {/* Categoría y Cantidad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría *
                  </label>
                  <select
                    {...register('categoria')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {CATEGORIAS_ANIMAL.map((categoria) => (
                      <option key={categoria.value} value={categoria.value}>
                        {categoria.label}
                      </option>
                    ))}
                  </select>
                  {errors.categoria && (
                    <p className="text-red-500 text-sm mt-1">{errors.categoria.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad en DUT *
                  </label>
                  <input
                    type="number"
                    {...register('cantidadEnDUT', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                  {errors.cantidadEnDUT && (
                    <p className="text-red-500 text-sm mt-1">{errors.cantidadEnDUT.message}</p>
                  )}
                </div>

                {/* Valores */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor DUT *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('valorDUT', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                  {errors.valorDUT && (
                    <p className="text-red-500 text-sm mt-1">{errors.valorDUT.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Guía {establecimientoEmisor === Establecimiento.LOCHIEL ? '*' : ''}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('valorGuia', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    disabled={establecimientoEmisor !== Establecimiento.LOCHIEL}
                  />
                  {establecimientoEmisor === Establecimiento.LOCHIEL && (
                    <p className="text-sm text-gray-500 mt-1">Solo aplica para Lochiel</p>
                  )}
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Crear Venta
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
