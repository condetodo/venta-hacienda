import api from './api';

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

export interface DUTExtractionRequest {
  archivo: File;
  tipoArchivo: 'pdf' | 'imagen';
}

export const dutExtractionService = {
  // Extraer datos de un archivo DUT
  extractFromFile: async (request: DUTExtractionRequest): Promise<DUTExtractionResult> => {
    const formData = new FormData();
    formData.append('archivo', request.archivo);
    formData.append('tipoArchivo', request.tipoArchivo);

    try {
      const response = await api.post('/dut/extract', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error extrayendo datos del DUT:', error);
      throw new Error(error.response?.data?.error || 'Error al procesar el archivo DUT');
    }
  },

  // Extraer datos y guardar documento asociado a una venta
  extractAndSaveDocument: async (request: DUTExtractionRequest & { ventaId: string }): Promise<DUTExtractionResult & { documento?: any }> => {
    const formData = new FormData();
    formData.append('archivo', request.archivo);
    formData.append('tipoArchivo', request.tipoArchivo);
    formData.append('ventaId', request.ventaId);

    try {
      const response = await api.post('/dut/extract-and-save', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error extrayendo datos y guardando documento:', error);
      throw new Error(error.response?.data?.error || 'Error al procesar el archivo DUT');
    }
  },

  // Subir documento a una venta existente
  uploadDocumentToVenta: async (request: { archivo: File; ventaId: string; tipoDocumento?: string }): Promise<{ documento: any }> => {
    const formData = new FormData();
    formData.append('archivo', request.archivo);
    formData.append('ventaId', request.ventaId);
    formData.append('tipoDocumento', request.tipoDocumento || 'DUT');

    try {
      const response = await api.post('/dut/upload-to-venta', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error subiendo documento:', error);
      throw new Error(error.response?.data?.error || 'Error al subir el documento');
    }
  },

  // Validar si un archivo es válido para procesamiento
  validateFile: (file: File): { valid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    
    if (file.size > maxSize) {
      return { valid: false, error: 'El archivo es demasiado grande. Máximo 10MB.' };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Tipo de archivo no soportado. Use PDF, JPG o PNG.' };
    }
    
    return { valid: true };
  },

  // Procesar texto extraído para encontrar datos específicos
  parseDUTData: (texto: string): Partial<DUTExtractionResult> => {
    const datos: Partial<DUTExtractionResult> = {};
    const errores: string[] = [];

    try {
      // Buscar número de DUT (patrones mejorados)
      const numeroDUTPatterns = [
        // Patrones específicos para DT-e
        /(?:DT-e\s*N°?\s*)(\d+[\w\-_]*)/i,
        /(?:DTe\s*-\s*DUT\s*N°?\s*)(\d+[\w\-_]*)/i,
        /(?:DUT\s*N°?\s*)(\d+[\w\-_]*)/i,
        /(?:N°?\s*de\s*DUT:\s*)(\d+)/i,
        /(?:Nro\.?\s*de\s*DUT:\s*)(\d+)/i,
        // Patrón específico para el formato del documento actual
        /(?:DT-e\s*N°\s*)(\d{9,}[\w\-_]*)/i,
        // Patrón para números que empiezan con 0 (como 017885409-7)
        /(?:N°\s*)(0\d{8,}[\w\-_]*)/i,
      ];
      
      for (const pattern of numeroDUTPatterns) {
        const match = texto.match(pattern);
        if (match) {
          datos.numeroDUT = match[1];
          break;
        }
      }

      // Buscar titular destino (cliente) - Patrones mejorados
      const clientePatterns = [
        // Patrón específico para la sección "Destino" en la parte inferior del documento
        /(?:Destino:\s*[^\n\r]*\s*Titular:\s*)([^\n\r]+?)(?:\s*Establecimiento|$)/i,
        // Patrón para "FRIGORÍFICO" seguido del nombre completo
        /(?:FRIGORÍFICO\s+)([^\n\r]+?)(?:\s*Localidad|$)/i,
        // Patrón específico para "DATOS DEL DESTINO" con "Titular:"
        /(?:DATOS\s+DEL\s+DESTINO[\s\S]*?Titular:\s*)([^\n\r]+?)(?:\s*CUIT|$)/i,
        // Patrón específico para encontrar el titular después de "DATOS DEL ORIGEN"
        /(?:DATOS\s+DEL\s+ORIGEN[\s\S]*?DATOS\s+DEL\s+DESTINO[\s\S]*?Titular:\s*)([^\n\r]+?)(?:\s*CUIT|$)/i,
        // Patrón para "ESTANCIA" seguido del nombre
        /(?:ESTANCIA\s+)([^\n\r]+?)(?:\s*SOCIEDAD|$)/i,
        // Patrón genérico para titular destino
        /(?:Titular:\s*)([^\n\r]+?)(?:\s*CUIT|$)/i,
        // Patrones de respaldo
        /(?:titular|destino|cliente)[\s:]*([^\n\r]+)/i,
        /(?:comprador|adquirente)[\s:]*([^\n\r]+)/i,
        /(?:establecimiento|empresa)[\s:]*([^\n\r]+)/i,
      ];
      
      // Buscar titular destino específicamente en la sección de destino
      let titularDestinoEncontrado = false;
      
      // PRIMERA PRIORIDAD: Buscar en la sección "Destino" que se repite 3 veces
      const seccionesDestino = texto.match(/Destino:\s*[^\n\r]*\s*Titular:\s*[^\n\r]*\s*Establecimiento:\s*[^\n\r]*/gi);
      if (seccionesDestino && seccionesDestino.length > 0) {
        // Tomar la primera ocurrencia de la sección "Destino"
        const primeraSeccionDestino = seccionesDestino[0];
        const titularEnDestino = primeraSeccionDestino.match(/Titular:\s*([^\n\r]+?)(?:\s*Establecimiento|$)/i);
        
        if (titularEnDestino && titularEnDestino[1].trim().length > 3) {
          datos.titularDestino = titularEnDestino[1].trim();
          titularDestinoEncontrado = true;
        }
      }
      
      // Segunda prioridad: buscar en la sección "DATOS DEL DESTINO" (que viene después de "DATOS DEL ORIGEN")
      const seccionDestino = texto.match(/(?:DATOS\s+DEL\s+DESTINO[\s\S]*?)(?=DATOS\s+DEL\s+ORIGEN|$)/i);
      if (seccionDestino) {
        const titularEnDestino = seccionDestino[0].match(/(?:Titular:\s*)([^\n\r]+?)(?:\s*CUIT|$)/i);
        if (titularEnDestino && titularEnDestino[1].trim().length > 3) {
          datos.titularDestino = titularEnDestino[1].trim();
          titularDestinoEncontrado = true;
        }
      }
      
      // Si no se encontró, buscar específicamente después de "DATOS DEL ORIGEN"
      if (!titularDestinoEncontrado) {
        const seccionDestinoDespuesOrigen = texto.match(/(?:DATOS\s+DEL\s+ORIGEN[\s\S]*?DATOS\s+DEL\s+DESTINO[\s\S]*?)(?=DATOS\s+DEL\s+MOVIMIENTO|$)/i);
        if (seccionDestinoDespuesOrigen) {
          const titularEnDestino = seccionDestinoDespuesOrigen[0].match(/(?:Titular:\s*)([^\n\r]+?)(?:\s*CUIT|$)/i);
          if (titularEnDestino && titularEnDestino[1].trim().length > 3) {
            datos.titularDestino = titularEnDestino[1].trim();
            titularDestinoEncontrado = true;
          }
        }
      }
      
      // Si no se encontró en la sección específica, usar patrones generales
      if (!titularDestinoEncontrado) {
        for (const pattern of clientePatterns) {
          const match = texto.match(pattern);
          if (match && match[1].trim().length > 3) {
            datos.titularDestino = match[1].trim();
            break;
          }
        }
      }

      // Buscar número Respa (código de DESTINO) - Patrones mejorados
      const respaPatterns = [
        // Patrón específico para "DATOS DEL DESTINO" con "ID Destino:"
        /(?:DATOS\s+DEL\s+DESTINO[\s\S]*?ID\s+Destino:\s*)([^\n\r]+)/i,
        // Patrón para "ID Destino:" específico
        /(?:ID\s+Destino:\s*)([^\n\r]+)/i,
        // Patrón específico para RENSPA de destino (formato: XX.XXX.X.XXXXX/XX)
        /(\d{2}\.\d{3}\.\d{1}\.\d{5}\/\d{2})/i,
        // Patrones de respaldo
        /(?:respa|rspa)[\s:]*(\d+)/i,
      ];
      
      // Buscar RENSPA de destino específicamente
      let renspaDestinoEncontrado = false;
      
      // Patrones específicos para encontrar RENSPA de destino
      const respaDestinoPatterns = [
        // Patrón específico para "Destino: XX.XXX.X.XXXXX/XX"
        /(?:Destino:\s*)(\d{2}\.\d{3}\.\d{1}\.\d{5}\/\d{2})/i,
        // Patrón para "RENSPA de Destino: XX.XXX.X.XXXXX/XX"
        /(?:RENSPA\s+de\s+Destino:\s*)(\d{2}\.\d{3}\.\d{1}\.\d{5}\/\d{2})/i,
        // Patrón para "ID Destino: XX.XXX.X.XXXXX/XX"
        /(?:ID\s+Destino:\s*)(\d{2}\.\d{3}\.\d{1}\.\d{5}\/\d{2})/i,
      ];
      
      // Buscar todos los RENSPA en el documento
      const todosLosRenspa = texto.match(/(\d{2}\.\d{3}\.\d{1}\.\d{5}\/\d{2})/g);
      
      if (todosLosRenspa && todosLosRenspa.length >= 2) {
        // Si hay múltiples RENSPA, tomar el segundo (que debería ser el de destino)
        // El primero suele ser el origen, el segundo el destino
        datos.numeroRespaDestino = todosLosRenspa[1];
        renspaDestinoEncontrado = true;
      } else {
        // Si no hay múltiples, usar patrones específicos
        for (const pattern of respaDestinoPatterns) {
          const match = texto.match(pattern);
          if (match) {
            const renspa = match[1].trim();
            if (/^\d{2}\.\d{3}\.\d{1}\.\d{5}\/\d{2}$/.test(renspa)) {
              datos.numeroRespaDestino = renspa;
              renspaDestinoEncontrado = true;
              break;
            }
          }
        }
      }
      
      // Si aún no se encontró, buscar en secciones específicas
      if (!renspaDestinoEncontrado) {
        // Buscar en la sección de destino específicamente
        const seccionDestinoMatch = texto.match(/(?:Destino:[\s\S]*?)(?=Consignatario|Especie|$)/i);
        if (seccionDestinoMatch) {
          const renspaEnDestino = seccionDestinoMatch[0].match(/(\d{2}\.\d{3}\.\d{1}\.\d{5}\/\d{2})/i);
          if (renspaEnDestino) {
            datos.numeroRespaDestino = renspaEnDestino[1];
          }
        }
      }

      // Buscar fechas
      const fechaPatterns = [
        /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,
        /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g,
      ];
      
      const fechas: string[] = [];
      for (const pattern of fechaPatterns) {
        const matches = texto.match(pattern);
        if (matches) {
          fechas.push(...matches);
        }
      }

      if (fechas.length > 0) {
        // Asumir que la primera fecha es emisión, segunda es carga
        datos.fechaEmisionDUT = fechas[0];
        if (fechas.length > 1) {
          datos.fechaCargaDUT = fechas[1];
        }
        if (fechas.length > 2) {
          datos.fechaVencimientoDUT = fechas[2];
        }
      }

      // Buscar motivo
      const motivoPatterns = [
        /(?:Motivo:\s*)([^\n\r]+?)(?:\n|Oficina|Telefono|$)/i,
        /(?:motivo|destino)[\s:]*([^\n\r]+?)(?:\n|Oficina|Telefono|$)/i,
        /(?:faena|cría|cria|reproducción|reproduccion|Reproducción\s+UE)/i,
      ];
      
      let motivoEncontrado = false;
      
      // Buscar específicamente "Reproducción UE" con patrones más flexibles
      const reproduccionUEPatterns = [
        /(?:Motivo:\s*)(Reproducción\s+UE)/i,
        /(?:Motivo:\s*)(Reproducción\s*UE)/i,
        /(?:Motivo:\s*)(Reproduccion\s+UE)/i,
        /(?:Motivo:\s*)(Reproduccion\s*UE)/i,
        /(?:Motivo:\s*)([^Oficina]*Reproducción[^Oficina]*UE[^Oficina]*)/i,
        /(?:Motivo:\s*)([^Oficina]*Reproduccion[^Oficina]*UE[^Oficina]*)/i,
      ];
      for (const pattern of reproduccionUEPatterns) {
        const reproduccionUEMatch = texto.match(pattern);
        if (reproduccionUEMatch) {
          datos.motivo = reproduccionUEMatch[1].trim();
          motivoEncontrado = true;
          break;
        }
      }
      
      // Si no se encontró "Reproducción UE", usar patrones generales
      if (!motivoEncontrado) {
        for (const pattern of motivoPatterns) {
          const match = texto.match(pattern);
          if (match) {
            const motivoTexto = match[1] || match[0];
            // Limpiar el motivo pero preservar acentos y caracteres especiales
            const motivoLimpio = motivoTexto.trim().replace(/[^\w\sáéíóúüñÁÉÍÓÚÜÑ]/g, '').trim();
            if (motivoLimpio.length > 2 && !motivoLimpio.toLowerCase().includes('oficina')) {
              datos.motivo = motivoLimpio;
              motivoEncontrado = true;
              break;
            }
          }
        }
      }
      
      // Si no se encontró motivo, inferir del destino (frigorífico = FAENA)
      if (!motivoEncontrado) {
        if (texto.toLowerCase().includes('frigorífico') || texto.toLowerCase().includes('frigorifico')) {
          datos.motivo = 'Faena';
        } else if (texto.toLowerCase().includes('reproducción') || texto.toLowerCase().includes('reproduccion')) {
          datos.motivo = 'Reproducción UE';
        }
      }

      // Buscar categoría de animal
      const categoriaPatterns = [
        /(?:categoría|categoria|tipo)[\s:]*([^\n\r]+)/i,
        /(?:oveja|borrego|cordero|capón|capon|carnero|borrega)/i,
      ];
      
      for (const pattern of categoriaPatterns) {
        const match = texto.match(pattern);
        if (match) {
          const categoriaTexto = match[1] || match[0];
          if (categoriaTexto.toLowerCase().includes('oveja')) {
            datos.categoria = 'OVEJA';
          } else if (categoriaTexto.toLowerCase().includes('borrego')) {
            datos.categoria = 'BORREGO';
          } else if (categoriaTexto.toLowerCase().includes('cordero')) {
            datos.categoria = 'CORDERO';
          } else if (categoriaTexto.toLowerCase().includes('capón') || categoriaTexto.toLowerCase().includes('capon')) {
            datos.categoria = 'CAPON';
          } else if (categoriaTexto.toLowerCase().includes('carnero')) {
            datos.categoria = 'CARNERO';
          } else if (categoriaTexto.toLowerCase().includes('borrega')) {
            datos.categoria = 'BORREGA';
          }
          break;
        }
      }

      // Buscar valores monetarios
      const valorPatterns = [
        /(?:valor|precio|importe)[\s:]*\$?[\s]*(\d+[.,]\d{2})/i,
        /(\d+[.,]\d{2})[\s]*pesos?/i,
        /(\d+[.,]\d{2})[\s]*dólares?/i,
      ];
      
      for (const pattern of valorPatterns) {
        const match = texto.match(pattern);
        if (match) {
          const valor = parseFloat(match[1].replace(',', '.'));
          if (!datos.valorDUT) {
            datos.valorDUT = valor;
          } else if (!datos.valorGuia) {
            datos.valorGuia = valor;
          }
        }
      }

      // Buscar cantidad
      const cantidadMatch = texto.match(/(?:cantidad|total)[\s:]*(\d+)/i);
      if (cantidadMatch) {
        datos.cantidadEnDUT = parseInt(cantidadMatch[1]);
      }

      // Calcular nivel de confianza
      let confianza = 0;
      if (datos.numeroDUT) confianza += 20;
      if (datos.titularDestino) confianza += 20;
      if (datos.fechaEmisionDUT) confianza += 15;
      if (datos.motivo) confianza += 10;
      if (datos.categoria) confianza += 10;
      if (datos.cantidadEnDUT) confianza += 15;
      if (datos.valorDUT) confianza += 10;

      datos.confianza = confianza;

      // Si la confianza es muy baja, agregar error
      if (confianza < 30) {
        errores.push('No se pudieron extraer suficientes datos del documento. Verifique que sea un DUT válido.');
      }

    } catch (error) {
      errores.push('Error al procesar el texto del documento.');
    }

    if (errores.length > 0) {
      datos.errores = errores;
    }

    return datos;
  },

  // Simular extracción para desarrollo (sin backend)
  simulateExtraction: async (archivo: File): Promise<DUTExtractionResult> => {
    console.log('simulateExtraction llamada con archivo:', archivo.name);
    // Simular delay de procesamiento
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Datos simulados basados en el nombre del archivo o contenido
    const nombreArchivo = archivo.name.toLowerCase();
    
    const datosSimulados: DUTExtractionResult = {
      numeroDUT: `DUT-2024-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      titularDestino: 'Frigorífico San Martín S.A.',
      numeroRespaDestino: '12345',
      fechaEmisionDUT: new Date().toISOString().split('T')[0],
      fechaCargaDUT: new Date().toISOString().split('T')[0],
      fechaVencimientoDUT: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      motivo: 'FAENA',
      categoria: 'OVEJA',
      valorDUT: 150.00,
      valorGuia: 50.00,
      cantidadEnDUT: 300,
      confianza: 85,
    };

    // Ajustar datos según el nombre del archivo
    if (nombreArchivo.includes('borrego')) {
      datosSimulados.categoria = 'BORREGO';
    } else if (nombreArchivo.includes('cordero')) {
      datosSimulados.categoria = 'CORDERO';
    }

    if (nombreArchivo.includes('cría') || nombreArchivo.includes('cria')) {
      datosSimulados.motivo = 'CRIA';
    }

    console.log('simulateExtraction completada, retornando:', datosSimulados);
    return datosSimulados;
  }
};
