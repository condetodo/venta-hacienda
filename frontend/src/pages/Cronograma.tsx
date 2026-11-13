import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Check } from 'lucide-react';
import {
  CargaProgramada,
  CargaProgramadaInput,
  SugerenciasCronograma,
  cronogramaService,
} from '../services/cronograma.service';
import { CargaModal } from '../components/cronograma/CargaModal';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/common/ToastContainer';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Un color por comprador, como en la planilla original
const PALETA = [
  { fondo: '#e8f3ec', borde: '#2f7d4f', texto: '#1d5c38' }, // verde
  { fondo: '#e9eefb', borde: '#3f5fbf', texto: '#2c4391' }, // azul
  { fondo: '#fbeaea', borde: '#c0392b', texto: '#96281b' }, // rojo
  { fondo: '#fdf3dc', borde: '#c98a06', texto: '#8a5d00' }, // ocre
  { fondo: '#f4eafa', borde: '#8e44ad', texto: '#6c2f87' }, // violeta
  { fondo: '#fde9f2', borde: '#c2417f', texto: '#962c5f' }, // rosa
  { fondo: '#e4f4f6', borde: '#1f8a99', texto: '#136673' }, // turquesa
  { fondo: '#eeeeee', borde: '#555555', texto: '#2b2b2b' }, // gris
];

const colorDe = (comprador: string) => {
  let hash = 0;
  for (const char of comprador.toUpperCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return PALETA[hash % PALETA.length];
};

const pad = (value: number) => String(value).padStart(2, '0');
const aFecha = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const numero = (value: number) => value.toLocaleString('es-AR');

interface DiaGrilla {
  fecha: string;
  dia: number;
  delMes: boolean;
}

// Semanas completas (lunes a domingo) que cubren el mes
const armarGrilla = (anio: number, mes: number): DiaGrilla[] => {
  const primero = new Date(anio, mes, 1);
  const desfase = (primero.getDay() + 6) % 7; // lunes = 0
  const diasDelMes = new Date(anio, mes + 1, 0).getDate();
  const celdas = Math.ceil((desfase + diasDelMes) / 7) * 7;

  return Array.from({ length: celdas }, (_, index) => {
    const date = new Date(anio, mes, 1 - desfase + index);
    return { fecha: aFecha(date), dia: date.getDate(), delMes: date.getMonth() === mes };
  });
};

const TarjetaCarga: React.FC<{ carga: CargaProgramada; onClick: () => void }> = ({ carga, onClick }) => {
  const color = colorDe(carga.comprador);
  const cancelada = carga.estado === 'CANCELADA';
  return (
    <button
      type="button"
      onClick={onClick}
      title="Editar carga"
      className={`w-full text-left rounded-md border-l-4 px-2 py-1.5 transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        cancelada ? 'opacity-55' : ''
      }`}
      style={{ backgroundColor: color.fondo, borderLeftColor: color.borde, color: color.texto }}
    >
      <span className={`flex items-center gap-1 text-xs font-bold leading-tight ${cancelada ? 'line-through' : ''}`}>
        {carga.estado === 'CARGADA' && <Check className="h-3 w-3 flex-shrink-0" aria-label="Cargada" />}
        <span className="break-words">{numero(carga.cantidad)} {carga.categoria}</span>
      </span>
      <span className="block text-[11px] font-semibold leading-tight break-words">{carga.comprador}</span>
      {carga.origen && <span className="block text-[11px] leading-tight break-words">{carga.origen}</span>}
      {carga.condiciones && (
        <span className="block text-[11px] leading-tight opacity-80 break-words">{carga.condiciones}</span>
      )}
      {cancelada && <span className="block text-[10px] font-semibold uppercase">Cancelada</span>}
    </button>
  );
};

export const Cronograma: React.FC = () => {
  const hoy = useMemo(() => new Date(), []);
  const hoyStr = aFecha(hoy);
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [cargas, setCargas] = useState<CargaProgramada[]>([]);
  const [sugerencias, setSugerencias] = useState<SugerenciasCronograma>({
    compradores: [], categorias: [], origenes: [],
  });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ carga: CargaProgramada | null; fecha: string } | null>(null);
  const { toasts, showSuccess, showError, removeToast } = useToast();

  const grilla = useMemo(() => armarGrilla(anio, mes), [anio, mes]);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const [lista, sugeridas] = await Promise.all([
        cronogramaService.getRango(grilla[0].fecha, grilla[grilla.length - 1].fecha),
        cronogramaService.getSugerencias(),
      ]);
      setCargas(lista);
      setSugerencias(sugeridas);
    } catch (error) {
      console.error('Error al cargar el cronograma:', error);
      showError('Error', 'No se pudo cargar el cronograma');
    } finally {
      setLoading(false);
    }
  }, [grilla, showError]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const porFecha = useMemo(() => {
    const mapa = new Map<string, CargaProgramada[]>();
    for (const carga of cargas) {
      mapa.set(carga.fecha, [...(mapa.get(carga.fecha) ?? []), carga]);
    }
    return mapa;
  }, [cargas]);

  // Resumen del mes (no cuenta canceladas ni días de meses vecinos)
  const resumen = useMemo(() => {
    const prefijo = `${anio}-${pad(mes + 1)}-`;
    const delMes = cargas.filter((carga) => carga.fecha.startsWith(prefijo) && carga.estado !== 'CANCELADA');
    const porComprador = new Map<string, number>();
    for (const carga of delMes) {
      porComprador.set(carga.comprador, (porComprador.get(carga.comprador) ?? 0) + carga.cantidad);
    }
    return {
      cargas: delMes.length,
      cabezas: delMes.reduce((total, carga) => total + carga.cantidad, 0),
      compradores: [...porComprador.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [cargas, anio, mes]);

  const cambiarMes = (delta: number) => {
    const destino = new Date(anio, mes + delta, 1);
    setAnio(destino.getFullYear());
    setMes(destino.getMonth());
  };

  const irAHoy = () => {
    setAnio(hoy.getFullYear());
    setMes(hoy.getMonth());
  };

  const handleSave = async (data: CargaProgramadaInput, id?: string) => {
    if (id) {
      await cronogramaService.update(id, data);
      showSuccess('Carga actualizada', `${numero(data.cantidad)} ${data.categoria} · ${data.comprador}`);
    } else {
      await cronogramaService.create(data);
      showSuccess('Carga agregada', `${numero(data.cantidad)} ${data.categoria} · ${data.comprador}`);
    }
    setModal(null);
    await cargar();
  };

  const handleDelete = async (id: string) => {
    await cronogramaService.delete(id);
    showSuccess('Carga eliminada', 'Se quitó del cronograma');
    setModal(null);
    await cargar();
  };

  const fechaNueva = hoyStr.startsWith(`${anio}-${pad(mes + 1)}-`) ? hoyStr : `${anio}-${pad(mes + 1)}-01`;
  const diasConCargas = grilla.filter((dia) => dia.delMes && porFecha.has(dia.fecha));

  return (
    <div className="space-y-5">
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Encabezado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cronograma de cargas</h1>
          <p className="text-sm text-muted-foreground">Ventas previstas por día, comprador y cuadro.</p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ carga: null, fecha: fechaNueva })}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Nueva carga
        </button>
      </div>

      {/* Navegación de mes + resumen */}
      <div className="rounded-xl border border-border bg-white p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => cambiarMes(-1)}
              aria-label="Mes anterior"
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="min-w-[11rem] text-center text-lg font-bold text-foreground">
              {MESES[mes]} de {anio}
            </h2>
            <button
              type="button"
              onClick={() => cambiarMes(1)}
              aria-label="Mes siguiente"
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={irAHoy}
              className="ml-1 rounded-lg border border-input px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Hoy
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-bold text-foreground">{numero(resumen.cabezas)}</span> cabezas en{' '}
            <span className="font-bold text-foreground">{resumen.cargas}</span>{' '}
            {resumen.cargas === 1 ? 'carga' : 'cargas'}
          </p>
        </div>

        {resumen.compradores.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {resumen.compradores.map(([comprador, cabezas]) => {
              const color = colorDe(comprador);
              return (
                <span
                  key={comprador}
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold"
                  style={{ backgroundColor: color.fondo, borderColor: color.borde, color: color.texto }}
                >
                  {comprador}
                  <span className="font-normal opacity-80">{numero(cabezas)}</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Calendario (pantallas medianas y grandes) */}
      <div className={`hidden md:block rounded-xl border border-border bg-white overflow-hidden ${loading ? 'opacity-60' : ''}`}>
        <div className="grid grid-cols-7 border-b border-border bg-muted/60">
          {DIAS.map((dia) => (
            <div key={dia} className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {dia}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grilla.map((dia, index) => {
            const delDia = porFecha.get(dia.fecha) ?? [];
            const esHoy = dia.fecha === hoyStr;
            return (
              <div
                key={dia.fecha}
                className={`group relative min-h-[7.5rem] border-border p-1.5 ${index % 7 !== 6 ? 'border-r' : ''} ${
                  index < grilla.length - 7 ? 'border-b' : ''
                } ${dia.delMes ? '' : 'bg-muted/40'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1 text-xs font-bold ${
                      esHoy
                        ? 'bg-primary text-primary-foreground'
                        : dia.delMes ? 'text-foreground' : 'text-muted-foreground/60'
                    }`}
                  >
                    {dia.dia}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModal({ carga: null, fecha: dia.fecha })}
                    aria-label={`Agregar carga el ${dia.fecha}`}
                    className="rounded p-0.5 text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100 focus:opacity-100"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  {delDia.map((carga) => (
                    <TarjetaCarga
                      key={carga.id}
                      carga={carga}
                      onClick={() => setModal({ carga, fecha: carga.fecha })}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda (celular) */}
      <div className={`md:hidden space-y-3 ${loading ? 'opacity-60' : ''}`}>
        {diasConCargas.length === 0 && !loading && (
          <p className="rounded-xl border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
            No hay cargas programadas este mes.
          </p>
        )}
        {diasConCargas.map((dia) => {
          const date = new Date(`${dia.fecha}T12:00:00`);
          return (
            <div key={dia.fecha} className="rounded-xl border border-border bg-white p-3">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {DIAS[(date.getDay() + 6) % 7]} {dia.dia}
                {dia.fecha === hoyStr && <span className="ml-2 text-primary">Hoy</span>}
              </p>
              <div className="space-y-1.5">
                {(porFecha.get(dia.fecha) ?? []).map((carga) => (
                  <TarjetaCarga
                    key={carga.id}
                    carga={carga}
                    onClick={() => setModal({ carga, fecha: carga.fecha })}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <CargaModal
          key={modal.carga?.id ?? `nueva-${modal.fecha}`}
          carga={modal.carga}
          fechaInicial={modal.fecha}
          sugerencias={sugerencias}
          onClose={() => setModal(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};
