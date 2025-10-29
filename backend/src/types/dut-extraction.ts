export interface DUTExtractionResult {
  numeroDUT?: string;
  titularDestino?: string;
  numeroRespaDestino?: string;
  fechaEmisionDUT?: string;
  fechaCargaDUT?: string;
  fechaVencimientoDUT?: string;
  motivo?: string;
  categoria?: string;
  valorDUT?: number;
  valorGuia?: number;
  cantidadEnDUT?: number;
  confianza?: number; // Nivel de confianza de la extracción (0-100)
  errores?: string[];
}




