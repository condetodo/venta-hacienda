import React, { useEffect, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import {
  CargaProgramada,
  CargaProgramadaInput,
  EstadoCarga,
  SugerenciasCronograma,
} from '../../services/cronograma.service';

interface CargaModalProps {
  carga: CargaProgramada | null; // null = nueva
  fechaInicial: string;
  sugerencias: SugerenciasCronograma;
  onClose: () => void;
  onSave: (data: CargaProgramadaInput, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const ESTADOS: { value: EstadoCarga; label: string }[] = [
  { value: 'PROGRAMADA', label: 'Programada' },
  { value: 'CARGADA', label: 'Cargada' },
  { value: 'CANCELADA', label: 'Cancelada' },
];

const inputClass =
  'w-full rounded-lg border border-input bg-white px-3 py-2 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring';
const labelClass = 'block text-xs font-semibold text-foreground mb-1';

export const CargaModal: React.FC<CargaModalProps> = ({
  carga,
  fechaInicial,
  sugerencias,
  onClose,
  onSave,
  onDelete,
}) => {
  const [fecha, setFecha] = useState(carga?.fecha ?? fechaInicial);
  const [cantidad, setCantidad] = useState(carga ? String(carga.cantidad) : '');
  const [categoria, setCategoria] = useState(carga?.categoria ?? '');
  const [comprador, setComprador] = useState(carga?.comprador ?? '');
  const [origen, setOrigen] = useState(carga?.origen ?? '');
  const [condiciones, setCondiciones] = useState(carga?.condiciones ?? '');
  const [notas, setNotas] = useState(carga?.notas ?? '');
  const [estado, setEstado] = useState<EstadoCarga>(carga?.estado ?? 'PROGRAMADA');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const cantidadNum = Number(cantidad);
    if (!fecha) return setError('Elegí una fecha.');
    if (!Number.isInteger(cantidadNum) || cantidadNum <= 0) return setError('La cantidad debe ser un número mayor a 0.');
    if (!categoria.trim()) return setError('Indicá la categoría (corderos, capones, ovejas...).');
    if (!comprador.trim()) return setError('Indicá el comprador.');

    setError(null);
    setSaving(true);
    try {
      await onSave(
        {
          fecha,
          cantidad: cantidadNum,
          categoria: categoria.trim().toUpperCase(),
          comprador: comprador.trim().toUpperCase(),
          origen: origen.trim().toUpperCase() || null,
          condiciones: condiciones.trim() || null,
          notas: notas.trim() || null,
          estado,
        },
        carga?.id,
      );
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudo guardar la carga.');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!carga) return;
    setSaving(true);
    try {
      await onDelete(carga.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'No se pudo eliminar la carga.');
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={carga ? 'Editar carga' : 'Nueva carga'}
        className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">
            {carga ? 'Editar carga' : 'Nueva carga'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="carga-fecha" className={labelClass}>Fecha de carga</label>
              <input
                id="carga-fecha"
                type="date"
                value={fecha}
                onChange={(event) => setFecha(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="carga-cantidad" className={labelClass}>Cantidad (cabezas)</label>
              <input
                id="carga-cantidad"
                type="number"
                min={1}
                inputMode="numeric"
                placeholder="450"
                value={cantidad}
                onChange={(event) => setCantidad(event.target.value)}
                className={inputClass}
                autoFocus={!carga}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="carga-categoria" className={labelClass}>Categoría</label>
              <input
                id="carga-categoria"
                list="carga-categorias"
                placeholder="CORDEROS"
                value={categoria}
                onChange={(event) => setCategoria(event.target.value)}
                className={`${inputClass} uppercase`}
              />
              <datalist id="carga-categorias">
                {sugerencias.categorias.map((item) => <option key={item} value={item} />)}
              </datalist>
            </div>
            <div>
              <label htmlFor="carga-comprador" className={labelClass}>Comprador</label>
              <input
                id="carga-comprador"
                list="carga-compradores"
                placeholder="MONTECARLO"
                value={comprador}
                onChange={(event) => setComprador(event.target.value)}
                className={`${inputClass} uppercase`}
              />
              <datalist id="carga-compradores">
                {sugerencias.compradores.map((item) => <option key={item} value={item} />)}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="carga-origen" className={labelClass}>
                Cuadro de origen <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <input
                id="carga-origen"
                list="carga-origenes"
                placeholder="AMARILLA CHICA"
                value={origen}
                onChange={(event) => setOrigen(event.target.value)}
                className={`${inputClass} uppercase`}
              />
              <datalist id="carga-origenes">
                {sugerencias.origenes.map((item) => <option key={item} value={item} />)}
              </datalist>
            </div>
            <div>
              <label htmlFor="carga-condiciones" className={labelClass}>
                Precio / condiciones <span className="font-normal text-muted-foreground">(opcional)</span>
              </label>
              <input
                id="carga-condiciones"
                placeholder="7.000 + IVA"
                value={condiciones}
                onChange={(event) => setCondiciones(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <span className={labelClass}>Estado</span>
            <div className="grid grid-cols-3 gap-2">
              {ESTADOS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setEstado(item.value)}
                  aria-pressed={estado === item.value}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    estado === item.value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-white text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="carga-notas" className={labelClass}>
              Notas <span className="font-normal text-muted-foreground">(opcional)</span>
            </label>
            <textarea
              id="carga-notas"
              rows={2}
              value={notas}
              onChange={(event) => setNotas(event.target.value)}
              className={inputClass}
            />
          </div>

          {carga?.venta && (
            <p className="text-xs text-muted-foreground">
              Asociada a la venta con DUT <span className="font-semibold text-foreground">{carga.venta.numeroDUT}</span>.
            </p>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            {carga ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving}
                    className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    Sí, eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </button>
              )
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-60"
              >
                {saving ? 'Guardando…' : carga ? 'Guardar cambios' : 'Agregar carga'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
