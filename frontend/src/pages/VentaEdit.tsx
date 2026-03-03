import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Venta } from '../types';
import { ventasService } from '../services/ventas.service';
import { VentaForm } from '../components/ventas/VentaForm';

// Convierte fecha ISO "2025-10-31T00:00:00.000Z" a "2025-10-31" para inputs date
const formatDateForInput = (dateStr?: string | null): string | undefined => {
  if (!dateStr) return undefined;
  try {
    return dateStr.substring(0, 10); // "2025-10-31T..." -> "2025-10-31"
  } catch {
    return undefined;
  }
};

export const VentaEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [venta, setVenta] = useState<Venta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchVenta();
    }
  }, [id]);

  const fetchVenta = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ventasService.getById(id!);
      setVenta(response.venta);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar la venta');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    navigate(`/ventas/${id}`);
  };

  const handleCancel = () => {
    navigate(`/ventas/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => navigate('/ventas')}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          Volver a ventas
        </button>
      </div>
    );
  }

  if (!venta) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Venta no encontrada</p>
      </div>
    );
  }

  // Preparar datos para el formulario con fechas formateadas para inputs date
  const initialData = {
    ...venta,
    fechaEmisionDUT: formatDateForInput(venta.fechaEmisionDUT) || '',
    fechaCargaDUT: formatDateForInput(venta.fechaCargaDUT) || '',
    fechaVencimientoDUT: formatDateForInput(venta.fechaVencimientoDUT),
    fechaCargaReal: formatDateForInput(venta.fechaCargaReal),
    fechaPago: formatDateForInput(venta.fechaPago),
  };

  return (
    <VentaForm
      initialData={initialData}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
};
