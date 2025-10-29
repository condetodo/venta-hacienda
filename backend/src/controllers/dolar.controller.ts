import { Request, Response } from 'express';
import axios from 'axios';
import { env } from '../config/env';

interface CotizacionDolar {
  tipo: string;
  compra: number;
  venta: number;
  fecha: string;
}

export const dolarController = {
  // Obtener todas las cotizaciones
  getCotizaciones: async (req: Request, res: Response): Promise<void> => {
    try {
      const response = await axios.get(`${env.DOLAR_API_URL}/dolares`);
      const cotizaciones = response.data;

      // Formatear datos para el frontend
      const cotizacionesFormateadas = cotizaciones.map((cot: any) => ({
        tipo: cot.casa,
        compra: cot.compra,
        venta: cot.venta,
        fecha: cot.fechaActualizacion,
      }));

      res.json({ cotizaciones: cotizacionesFormateadas });
    } catch (error) {
      console.error('Error en getCotizaciones:', error);
      res.status(500).json({
        error: 'Error obteniendo cotizaciones del dólar',
        code: 'DOLAR_API_ERROR',
      });
    }
  },

  // Obtener cotización específica
  getCotizacion: async (req: Request, res: Response): Promise<void> => {
    try {
      const { tipo } = req.params;

      const response = await axios.get(`${env.DOLAR_API_URL}/dolares/${tipo}`);
      const cotizacion = response.data;

      res.json({ cotizacion });
    } catch (error) {
      console.error('Error en getCotizacion:', error);
      res.status(500).json({
        error: 'Error obteniendo cotización del dólar',
        code: 'DOLAR_API_ERROR',
      });
    }
  },
};

