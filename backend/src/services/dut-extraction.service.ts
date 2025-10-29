import { DUTExtractionResult } from '../../types/dut-extraction';
const pdfParse = require('pdf-parse');

export const dutExtractionService = {
  // Procesar archivo DUT y extraer datos
  processFile: async (file: Express.Multer.File, tipoArchivo: string): Promise<DUTExtractionResult> => {
    try {
      let textoExtraido = '';

      if (tipoArchivo === 'pdf') {
        textoExtraido = await extractTextFromPDF(file.buffer);
      } else if (tipoArchivo === 'imagen') {
        textoExtraido = await extractTextFromImage(file.buffer);
      } else {
        throw new Error('Tipo de archivo no soportado');
      }

      // Parsear el texto extraído para obtener datos específicos
      const datosExtraidos = parseDUTData(textoExtraido);

      return {
        ...datosExtraidos,
        confianza: calcularConfianza(datosExtraidos),
        errores: datosExtraidos.errores || []
      };

    } catch (error: any) {
      console.error('Error procesando archivo DUT:', error);
      throw new Error(`Error al procesar el archivo: ${error.message}`);
    }
  }
};

// Extraer texto de PDF usando pdf-parse
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    console.log('Iniciando extracción real de PDF con pdf-parse...');
    console.log('Tamaño del buffer:', buffer.length);
    
    const data = await pdfParse(buffer);
    
    console.log('Texto extraído del PDF:', data.text.substring(0, 500) + '...');
    console.log('Número de páginas:', data.numpages);
    console.log('Información del PDF:', data.info);
    
    return data.text;
  } catch (error) {
    console.error('Error extrayendo texto del PDF:', error);
    console.error('Stack trace:', error.stack);
    throw new Error(`Error al extraer texto del PDF: ${error.message}`);
  }
}

// Extraer texto de imagen usando OCR
async function extractTextFromImage(buffer: Buffer): Promise<string> {
  try {
    // TODO: Implementar OCR real (Tesseract.js, Google Vision API, etc.)
    // Por ahora simulamos la extracción
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Texto simulado extraído de imagen
    return `
      DUT N° 2024-002
      Establecimiento: CABO CURIOSO
      Titular Destino: Frigorífico del Sur S.A.
      Respa: 67890
      Fecha Emisión: 25/10/2024
      Fecha Carga: 25/10/2024
      Motivo: FAENA
      Categoría: BORREGO
      Cantidad: 250
      Valor DUT: $200.00
    `;
  } catch (error) {
    throw new Error('Error al extraer texto de la imagen');
  }
}

// Parsear datos específicos del DUT
function parseDUTData(texto: string): Partial<DUTExtractionResult> {
  const datos: Partial<DUTExtractionResult> = {};
  const errores: string[] = [];

  try {
    // Buscar número de DUT (patrones específicos para DTE)
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
    
    console.log('🔍 Buscando número de DUT...');
    console.log('Texto a buscar:', texto.substring(0, 500));
    
    for (let i = 0; i < numeroDUTPatterns.length; i++) {
      const pattern = numeroDUTPatterns[i];
      const match = texto.match(pattern);
      console.log(`Patrón ${i + 1}:`, pattern.source);
      console.log(`Match encontrado:`, match);
      
      if (match) {
        datos.numeroDUT = match[1];
        console.log('✅ Número DUT encontrado:', datos.numeroDUT);
        break;
      }
    }
    
    if (!datos.numeroDUT) {
      console.log('❌ No se encontró número de DUT');
    }

    // Buscar titular destino (patrones específicos para DTE - DESTINO)
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
      /(?:Destino:[\s\S]*?Titular:\s*)([^\n\r]+)/i,
      /(?:HACIA[\s\S]*?Titular:\s*)([^\n\r]+)/i,
      /(?:titular|destino|cliente)[\s:]*([^\n\r]+)/i,
      /(?:comprador|adquirente)[\s:]*([^\n\r]+)/i,
      /(?:establecimiento|empresa)[\s:]*([^\n\r]+)/i,
    ];
    
    // DEBUG: Log del texto extraído para entender la estructura
    console.log('=== DEBUG: Texto extraído del PDF ===');
    console.log('Primeros 1000 caracteres:', texto.substring(0, 1000));
    console.log('=====================================');
    
    // Buscar todas las secciones "DATOS DEL"
    const seccionesDatados = texto.match(/DATOS\s+DEL\s+[A-Z]+/gi);
    console.log('Secciones encontradas:', seccionesDatados);
    
    // Buscar titular destino específicamente en la sección de destino
    let titularDestinoEncontrado = false;
    
    // DEBUG: Buscar todas las ocurrencias de "Titular:"
    const todosLosTitulares = texto.match(/Titular:\s*[^\n\r]+/gi);
    console.log('Todos los titulares encontrados:', todosLosTitulares);
    
    // DEBUG: Buscar específicamente la sección "Destino" que se repite 3 veces
    const seccionesDestino = texto.match(/Destino:\s*[^\n\r]*\s*Titular:\s*[^\n\r]*\s*Establecimiento:\s*[^\n\r]*/gi);
    console.log('Secciones Destino encontradas:', seccionesDestino);
    
    // PRIMERA PRIORIDAD: Buscar en la sección "Destino" que se repite 3 veces
    if (seccionesDestino && seccionesDestino.length > 0) {
      // Tomar la primera ocurrencia de la sección "Destino"
      const primeraSeccionDestino = seccionesDestino[0];
      console.log('Primera sección Destino:', primeraSeccionDestino);
      
      const titularEnDestino = primeraSeccionDestino.match(/Titular:\s*([^\n\r]+?)(?:\s*Establecimiento|$)/i);
      console.log('Titular en sección Destino:', titularEnDestino);
      
      if (titularEnDestino && titularEnDestino[1].trim().length > 3) {
        datos.titularDestino = titularEnDestino[1].trim();
        titularDestinoEncontrado = true;
        console.log('✅ Titular destino encontrado en sección Destino:', datos.titularDestino);
      }
    }
    
    // Segunda prioridad: buscar en la sección "DATOS DEL DESTINO" (que viene después de "DATOS DEL ORIGEN")
    const seccionDestino = texto.match(/(?:DATOS\s+DEL\s+DESTINO[\s\S]*?)(?=DATOS\s+DEL\s+ORIGEN|$)/i);
    console.log('Sección destino encontrada:', seccionDestino ? seccionDestino[0].substring(0, 200) + '...' : 'No encontrada');
    
    if (seccionDestino) {
      const titularEnDestino = seccionDestino[0].match(/(?:Titular:\s*)([^\n\r]+?)(?:\s*CUIT|$)/i);
      console.log('Titular en sección destino:', titularEnDestino);
      if (titularEnDestino && titularEnDestino[1].trim().length > 3) {
        datos.titularDestino = titularEnDestino[1].trim();
        titularDestinoEncontrado = true;
        console.log('✅ Titular destino encontrado en sección destino:', datos.titularDestino);
      }
    }
    
    // Si no se encontró, buscar específicamente después de "DATOS DEL ORIGEN"
    if (!titularDestinoEncontrado) {
      const seccionDestinoDespuesOrigen = texto.match(/(?:DATOS\s+DEL\s+ORIGEN[\s\S]*?DATOS\s+DEL\s+DESTINO[\s\S]*?)(?=DATOS\s+DEL\s+MOVIMIENTO|$)/i);
      console.log('Sección destino después de origen:', seccionDestinoDespuesOrigen ? seccionDestinoDespuesOrigen[0].substring(0, 200) + '...' : 'No encontrada');
      
      if (seccionDestinoDespuesOrigen) {
        const titularEnDestino = seccionDestinoDespuesOrigen[0].match(/(?:Titular:\s*)([^\n\r]+?)(?:\s*CUIT|$)/i);
        console.log('Titular en sección destino después de origen:', titularEnDestino);
        if (titularEnDestino && titularEnDestino[1].trim().length > 3) {
          datos.titularDestino = titularEnDestino[1].trim();
          titularDestinoEncontrado = true;
          console.log('✅ Titular destino encontrado después de origen:', datos.titularDestino);
        }
      }
    }
    
    // Si no se encontró en la sección específica, usar patrones generales
    if (!titularDestinoEncontrado) {
      console.log('🔍 Buscando con patrones generales...');
      for (let i = 0; i < clientePatterns.length; i++) {
        const pattern = clientePatterns[i];
        const match = texto.match(pattern);
        console.log(`Patrón ${i + 1}:`, pattern.source);
        console.log(`Match encontrado:`, match);
        if (match && match[1].trim().length > 3) {
          datos.titularDestino = match[1].trim();
          console.log('✅ Titular destino encontrado con patrón general:', datos.titularDestino);
          break;
        }
      }
    }
    
    console.log('🎯 Titular destino final:', datos.titularDestino);

    // Buscar número Respa (código de DESTINO) - Priorizar destino sobre origen
    const respaPatterns = [
      // Patrón específico para "DATOS DEL DESTINO" con "ID Destino:"
      /(?:DATOS\s+DEL\s+DESTINO[\s\S]*?ID\s+Destino:\s*)([^\n\r]+)/i,
      // Patrón para "ID Destino:" específico
      /(?:ID\s+Destino:\s*)([^\n\r]+)/i,
      // Patrón para "Destino:" con "Code:"
      /(?:Destino:[\s\S]*?Code:\s*)([^\n\r]+)/i,
      // Patrón para "HACIA" con "ID Destino:"
      /(?:HACIA[\s\S]*?ID\s+Destino:\s*)([^\n\r]+)/i,
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

    // Buscar fechas (patrones específicos para DTE)
    const fechaPatterns = [
      /(?:Fecha\s+Carga:\s*)(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /(?:Fecha\s+Vencimiento:\s*)(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /(?:Fecha\s+y\s+hora\s+de\s+emisión:\s*)(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
      /(?:Fecha\s+Emisión:\s*)(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
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
      // Mapear fechas específicas según el contexto
      for (let i = 0; i < fechas.length; i++) {
        const fecha = fechas[i];
        // Buscar contexto específico para cada fecha
        const contextoEmision = texto.match(new RegExp(`(?:Fecha\\s+y\\s+hora\\s+de\\s+emisión|Fecha\\s+Emisión)[\\s:]*${fecha.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'));
        const contextoCarga = texto.match(new RegExp(`(?:Fecha\\s+Carga)[\\s:]*${fecha.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'));
        const contextoVencimiento = texto.match(new RegExp(`(?:Fecha\\s+Vencimiento)[\\s:]*${fecha.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'));
        
        if (contextoEmision) {
          datos.fechaEmisionDUT = convertirFecha(fecha);
        } else if (contextoCarga) {
          datos.fechaCargaDUT = convertirFecha(fecha);
        } else if (contextoVencimiento) {
          datos.fechaVencimientoDUT = convertirFecha(fecha);
        } else {
          // Si no hay contexto específico, asignar por orden
          if (!datos.fechaEmisionDUT) {
            datos.fechaEmisionDUT = convertirFecha(fecha);
          } else if (!datos.fechaCargaDUT) {
            datos.fechaCargaDUT = convertirFecha(fecha);
          } else if (!datos.fechaVencimientoDUT) {
            datos.fechaVencimientoDUT = convertirFecha(fecha);
          }
        }
      }
    }

    // Buscar motivo (patrones específicos para DTE)
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

    // Buscar categoría de animal (patrones específicos para DTE)
    const categoriaPatterns = [
      /(?:Categorias:\s*)([^\n\r]+)/i,
      /(?:categoría|categoria|tipo)[\s:]*([^\n\r]+)/i,
      /(?:oveja|borrego|cordero|capón|capon|carnero|borrega)/i,
      /(?:Ovinos\s*-\s*)([^\n\r]+)/i, // Patrón específico para "Ovinos - Carnero"
    ];
    
    for (const pattern of categoriaPatterns) {
      const match = texto.match(pattern);
      if (match) {
        const categoriaTexto = match[1] || match[0];
        if (categoriaTexto.toLowerCase().includes('carnero')) {
          datos.categoria = 'CARNERO';
        } else if (categoriaTexto.toLowerCase().includes('oveja')) {
          datos.categoria = 'OVEJA';
        } else if (categoriaTexto.toLowerCase().includes('borrego')) {
          datos.categoria = 'BORREGO';
        } else if (categoriaTexto.toLowerCase().includes('cordero')) {
          datos.categoria = 'CORDERO';
        } else if (categoriaTexto.toLowerCase().includes('capón') || categoriaTexto.toLowerCase().includes('capon')) {
          datos.categoria = 'CAPON';
        } else if (categoriaTexto.toLowerCase().includes('borrega')) {
          datos.categoria = 'BORREGA';
        }
        break;
      }
    }

    // Buscar valores monetarios (patrones específicos para DTE)
    const valorPatterns = [
      /(?:Res\.\s*189\/2018\s*Cod\.\s*SA008\s*\$)(\d+[.,]\d+)/i,
      /(?:Res\.\s*189\/2018\s*Cod\.\s*SA013\s*\$)(\d+[.,]\d+)/i,
      /(?:Res\.\s*1\/2022\s*Cod\.\s*SA008-A\s*\$)(\d+[.,]\d+)/i,
      /(?:valor|precio|importe)[\s:]*\$?[\s]*(\d+[.,]\d{2})/i,
      /(\d+[.,]\d{2})[\s]*pesos?/i,
      /(\d+[.,]\d{2})[\s]*dólares?/i,
      /(\d+[.,]\d+)[\s]*\$/, // Patrón genérico para valores con $
      /(\d+[.,]\d+)[\s]*pesos?/i, // Patrón genérico para pesos
      /(\d+[.,]\d+)[\s]*dólares?/i, // Patrón genérico para dólares
    ];
    
    const valores: number[] = [];
    for (const pattern of valorPatterns) {
      const matches = texto.match(new RegExp(pattern.source, 'gi'));
      if (matches) {
        for (const match of matches) {
          const valorMatch = match.match(/(\d+[.,]\d+)/);
          if (valorMatch) {
            const valor = parseFloat(valorMatch[1].replace(',', '.'));
            valores.push(valor);
          }
        }
      }
    }
    
    if (valores.length > 0) {
      // Buscar valores específicos por contexto
      const valorDUTMatch = texto.match(/(?:Res\.\s*189\/2018\s*Cod\.\s*SA008\s*\$)(\d+[.,]\d+)/i);
      const valorGuiaMatch = texto.match(/(?:Res\.\s*189\/2018\s*Cod\.\s*SA013\s*\$)(\d+[.,]\d+)/i);
      
      if (valorDUTMatch) {
        datos.valorDUT = parseFloat(valorDUTMatch[1].replace(',', '.'));
      } else {
        datos.valorDUT = valores[0];
      }
      
      if (valorGuiaMatch) {
        datos.valorGuia = parseFloat(valorGuiaMatch[1].replace(',', '.'));
      } else if (valores.length > 1) {
        datos.valorGuia = valores[1];
      }
    }

    // Buscar cantidad (patrones específicos para DTE)
    const cantidadPatterns = [
      /(?:Cantidad Total:\s*)(\d+)/i,
      /(?:Cantidad:\s*)(\d+)/i,
      /(?:cantidad|total)[\s:]*(\d+)/i,
      /(?:ESPECIE:\s*[^\n\r]*\s*CANTIDAD:\s*)(\d+)/i, // Patrón específico para "ESPECIE: Ovinos - CANTIDAD: 4"
    ];
    
    for (const pattern of cantidadPatterns) {
      const match = texto.match(pattern);
      if (match) {
        datos.cantidadEnDUT = parseInt(match[1]);
        break;
      }
    }

    // Si no se encontraron datos suficientes, agregar errores
    if (!datos.numeroDUT) {
      errores.push('No se pudo extraer el número de DUT');
    }
    if (!datos.titularDestino) {
      errores.push('No se pudo extraer el titular destino');
    }
    if (!datos.fechaEmisionDUT) {
      errores.push('No se pudo extraer la fecha de emisión');
    }

  } catch (error) {
    errores.push('Error al procesar el texto del documento');
  }

  if (errores.length > 0) {
    datos.errores = errores;
  }

  return datos;
}

// Calcular nivel de confianza de la extracción
function calcularConfianza(datos: Partial<DUTExtractionResult>): number {
  let confianza = 0;
  
  if (datos.numeroDUT) confianza += 20;
  if (datos.titularDestino) confianza += 20;
  if (datos.fechaEmisionDUT) confianza += 15;
  if (datos.motivo) confianza += 10;
  if (datos.categoria) confianza += 10;
  if (datos.cantidadEnDUT) confianza += 15;
  if (datos.valorDUT) confianza += 10;

  return Math.min(confianza, 100);
}

// Convertir fecha al formato ISO
function convertirFecha(fecha: string): string {
  try {
    // Limpiar la fecha de espacios y caracteres extraños
    let fechaLimpia = fecha.trim().replace(/[^\d\/\-\.]/g, '');
    
    // Si la fecha es muy corta o no tiene formato válido, retornar tal como está
    if (fechaLimpia.length < 6) {
      console.log('Fecha muy corta o inválida:', fecha);
      return fecha;
    }
    
    // Manejar diferentes formatos de fecha
    let fechaFormateada = fechaLimpia;
    
    // Si tiene formato DD/MM/YYYY, convertir a YYYY-MM-DD
    if (fechaLimpia.includes('/')) {
      const partes = fechaLimpia.split('/');
      if (partes.length === 3) {
        const dia = partes[0].padStart(2, '0');
        const mes = partes[1].padStart(2, '0');
        const año = partes[2].length === 2 ? `20${partes[2]}` : partes[2];
        fechaFormateada = `${año}-${mes}-${dia}`;
      }
    }
    
    // Si tiene formato DD-MM-YYYY, convertir a YYYY-MM-DD
    if (fechaLimpia.includes('-') && fechaLimpia.split('-')[0].length <= 2) {
      const partes = fechaLimpia.split('-');
      if (partes.length === 3) {
        const dia = partes[0].padStart(2, '0');
        const mes = partes[1].padStart(2, '0');
        const año = partes[2].length === 2 ? `20${partes[2]}` : partes[2];
        fechaFormateada = `${año}-${mes}-${dia}`;
      }
    }

    // Validar que la fecha sea válida
    const fechaObj = new Date(fechaFormateada);
    if (isNaN(fechaObj.getTime())) {
      console.log('Fecha inválida después de conversión:', fechaFormateada);
      return fecha; // Retornar fecha original si no se puede convertir
    }

    return fechaFormateada;
  } catch (error) {
    console.error('Error convirtiendo fecha:', error);
    return fecha;
  }
}
