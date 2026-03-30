import Anthropic from '@anthropic-ai/sdk';
import { DUTExtractionResult } from '../types/dut-extraction';
import { env } from '../config/env';
const pdfParse = require('pdf-parse');

// ============================================================================
// Cliente Anthropic (lazy init)
// ============================================================================

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

// ============================================================================
// System Prompt para extracción de DUTs (se cachea con prompt caching)
// ============================================================================

const DUT_EXTRACTION_SYSTEM_PROMPT = `Sos un experto en documentos DUT (Documento Único de Tránsito) de SENASA Argentina para hacienda ovina.

TAREA: Extraer datos de un DUT y devolver JSON puro.

## ERRORES COMUNES QUE DEBES EVITAR:

ERROR 1 - MOTIVO: El campo "Motivo:" está en la esquina superior derecha de la página 1, dentro de un recuadro junto a "Fecha Carga" y "Fecha Vencimiento". El valor es "Faena", "Cría", "Reproducción" o similar. CERCA aparece otro campo "Oficina Local:" con el nombre de una oficina SENASA. "Oficina Local" NO ES el motivo. Si extraes "Oficina Local:" como motivo, ESTÁ MAL.

ERROR 2 - FECHAS CARGA/VENCIMIENTO: "Fecha Carga" y "Fecha Vencimiento" están en el MISMO recuadro que el motivo (esquina superior derecha página 1). NO confundir con "Fecha y hora de emisión" que está en la página 2. Los tres son campos DIFERENTES.

ERROR 3 - VALOR GUÍA: "valorGuia" es el TOTAL A PAGAR de la boleta ARECH (Agencia de Recaudación provincial Chubut). Es una PÁGINA SEPARADA del DUT (generalmente la última página). Tiene un encabezado "ARECH" y dice "TOTAL A PAGAR $ XXXXX". Este valor suele ser un número redondo grande (ej: 24000, 15000). NO confundir con la tasa SA013 de SENASA que es un monto chico (~$229).

ERROR 4 - VALOR DUT: "valorDUT" es el "Total:" que aparece en la sección "CONFORMIDAD DEL SOLICITANTE" de la página 1. Es la SUMA de todas las tasas SENASA (SA008-A + SA013 + otras). NO es solo SA008-A.

## ESTRUCTURA DEL DOCUMENTO

PÁGINA 1:
- Superior derecha: recuadro con Fecha Carga, Fecha Vencimiento, Motivo
- Izquierda: código de barras + N° DUT
- Centro: DATOS DEL ORIGEN (izq) y DATOS DEL DESTINO (der)
- Centro-abajo: DETALLES DE CARGA (especie, categoría, cantidad)
- Inferior: CONFORMIDAD DEL SOLICITANTE con desglose de tasas y Total

PÁGINA 2:
- "Fecha y hora de emisión: DD/MM/YYYY HH:MM" (esta es fechaEmisionDUT)
- Triplicado del DUT

PÁGINA 3 (o última):
- Boleta ARECH provincial con "TOTAL A PAGAR $ XXXXX" (esta es valorGuia)

## JSON A DEVOLVER (sin markdown, sin backticks, sin explicaciones):

{
  "numeroDUT": "N° del DUT, ej: 030565163-5",
  "titularDestino": "Titular de DATOS DEL DESTINO (NO el origen)",
  "numeroRespaDestino": "RENSPA del DESTINO, formato XX.XXX.X.XXXXX/XX",
  "fechaEmisionDUT": "YYYY-MM-DD de 'Fecha y hora de emisión' (página 2)",
  "fechaCargaDUT": "YYYY-MM-DD de 'Fecha Carga' (recuadro superior derecho página 1)",
  "fechaVencimientoDUT": "YYYY-MM-DD de 'Fecha Vencimiento' (recuadro superior derecho página 1)",
  "motivo": "SOLO: Faena|Cría|Reproducción UE|Reproducción (del recuadro superior derecho, NUNCA Oficina Local)",
  "categoria": "OVEJA|BORREGO|CORDERO|CAPON|CARNERO|BORREGA",
  "valorDUT": "number - Total de CONFORMIDAD DEL SOLICITANTE (suma tasas SENASA)",
  "valorGuia": "number - TOTAL A PAGAR de boleta ARECH provincial (última página). null si no existe",
  "cantidadEnDUT": "number entero - cantidad de animales",
  "confianza": "number 0-100",
  "errores": ["campos no encontrados"]
}

## REGLAS:
1. Fechas: DD/MM/YYYY → YYYY-MM-DD siempre
2. Montos argentinos: punto=miles, coma=decimal. "27.005,00" = 27005.00
3. Si un campo no se encuentra → null
4. Devolvé SOLO el JSON, nada más`;

// ============================================================================
// Extracción principal con Claude Vision
// ============================================================================

async function extractWithClaudeVision(
  client: Anthropic,
  file: Express.Multer.File,
  tipoArchivo: string
): Promise<DUTExtractionResult> {
  const base64Data = file.buffer.toString('base64');

  // Construir el content block según el tipo de archivo
  let contentBlock: Anthropic.Messages.ContentBlockParam;

  if (tipoArchivo === 'pdf') {
    contentBlock = {
      type: 'document' as any,
      source: {
        type: 'base64',
        media_type: 'application/pdf',
        data: base64Data,
      },
    } as any;
  } else {
    // Imagen (JPG/PNG)
    const mediaType = file.mimetype as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
    contentBlock = {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: base64Data,
      },
    };
  }

  console.log('🤖 Enviando documento a Claude Vision...');
  console.log(`   Tipo: ${tipoArchivo}, Tamaño: ${(file.size / 1024).toFixed(1)}KB`);

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: DUT_EXTRACTION_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          contentBlock,
          {
            type: 'text',
            text: 'Extraé los datos de este documento DUT y devolvelos en el formato JSON especificado.',
          },
        ],
      },
    ],
  });

  // Parsear respuesta de Claude
  const textContent = response.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('Claude no devolvió contenido de texto');
  }

  console.log('🤖 Respuesta de Claude recibida');
  console.log(`   Tokens: input=${response.usage.input_tokens}, output=${response.usage.output_tokens}`);
  console.log('🤖 Respuesta RAW de Claude:', textContent.text);

  // Extraer JSON (Claude puede envolverlo en code blocks)
  const rawText = textContent.text;
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('No se encontró JSON en la respuesta:', rawText);
    throw new Error('No se pudo parsear JSON de la respuesta de Claude');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Mapear y normalizar la respuesta
  const result: DUTExtractionResult = {
    numeroDUT: parsed.numeroDUT || undefined,
    titularDestino: parsed.titularDestino || undefined,
    numeroRespaDestino: parsed.numeroRespaDestino || undefined,
    fechaEmisionDUT: parsed.fechaEmisionDUT || undefined,
    fechaCargaDUT: parsed.fechaCargaDUT || undefined,
    fechaVencimientoDUT: parsed.fechaVencimientoDUT || undefined,
    motivo: parsed.motivo || undefined,
    categoria: normalizeCategoria(parsed.categoria),
    valorDUT: typeof parsed.valorDUT === 'number' ? parsed.valorDUT : parseNumberSafe(parsed.valorDUT),
    valorGuia: typeof parsed.valorGuia === 'number' ? parsed.valorGuia : parseNumberSafe(parsed.valorGuia),
    cantidadEnDUT: typeof parsed.cantidadEnDUT === 'number' ? parsed.cantidadEnDUT : parseIntSafe(parsed.cantidadEnDUT),
    confianza: typeof parsed.confianza === 'number' ? parsed.confianza : 85,
    errores: Array.isArray(parsed.errores) ? parsed.errores : [],
  };

  console.log('✅ Extracción Claude Vision exitosa:', {
    numeroDUT: result.numeroDUT,
    titularDestino: result.titularDestino,
    confianza: result.confianza,
  });

  return result;
}

// ============================================================================
// Helpers
// ============================================================================

function normalizeCategoria(cat: string | undefined | null): string | undefined {
  if (!cat) return undefined;
  const upper = cat
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const map: Record<string, string> = {
    OVEJA: 'OVEJA',
    BORREGO: 'BORREGO',
    CORDERO: 'CORDERO',
    CAPON: 'CAPON',
    CARNERO: 'CARNERO',
    BORREGA: 'BORREGA',
  };
  return map[upper] || cat.toUpperCase();
}

function parseNumberSafe(val: any): number | undefined {
  if (val === null || val === undefined) return undefined;
  const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : Number(val);
  return isNaN(num) ? undefined : num;
}

function parseIntSafe(val: any): number | undefined {
  if (val === null || val === undefined) return undefined;
  const num = typeof val === 'string' ? parseInt(val, 10) : Math.round(Number(val));
  return isNaN(num) ? undefined : num;
}

// ============================================================================
// Fallback: Extracción con regex (método anterior)
// ============================================================================

async function extractWithRegexFallback(
  file: Express.Multer.File,
  tipoArchivo: string
): Promise<DUTExtractionResult> {
  let textoExtraido = '';

  if (tipoArchivo === 'pdf') {
    const data = await pdfParse(file.buffer);
    textoExtraido = data.text;
  } else {
    // Sin OCR disponible, retornar vacío para entrada manual
    return {
      confianza: 0,
      errores: ['No hay API de Claude configurada y OCR no está disponible. Ingrese los datos manualmente.'],
    };
  }

  const datos = parseDUTDataRegex(textoExtraido);

  return {
    ...datos,
    confianza: calcularConfianzaRegex(datos),
    errores: datos.errores || [],
  };
}

// Parseo regex simplificado (fallback)
function parseDUTDataRegex(texto: string): Partial<DUTExtractionResult> {
  const datos: Partial<DUTExtractionResult> = {};
  const errores: string[] = [];

  try {
    // Número de DUT
    const dutPatterns = [
      /(?:DTe\s*-\s*DUT\s*N°?\s*)(\d+[\w\-_]*)/i,
      /(?:DT-e\s*N°?\s*)(\d+[\w\-_]*)/i,
      /(?:DUT\s*N°?\s*)(\d+[\w\-_]*)/i,
      /(?:N°?\s*de\s*DUT:\s*)(\d+)/i,
      /(?:Nro\.?\s*de\s*DUT:\s*)(\d+)/i,
    ];
    for (const p of dutPatterns) {
      const m = texto.match(p);
      if (m) { datos.numeroDUT = m[1]; break; }
    }

    // Titular destino
    const seccionesDestino = texto.match(
      /Destino:\s*[^\n\r]*\s*Titular:\s*[^\n\r]*\s*Establecimiento:\s*[^\n\r]*/gi
    );
    if (seccionesDestino && seccionesDestino.length > 0) {
      const titularMatch = seccionesDestino[0].match(/Titular:\s*([^\n\r]+?)(?:\s*Establecimiento|$)/i);
      if (titularMatch && titularMatch[1].trim().length > 3) {
        datos.titularDestino = titularMatch[1].trim();
      }
    }

    // RENSPA destino (segundo RENSPA del documento)
    const todosRenspa = texto.match(/(\d{2}\.\d{3}\.\d{1}\.\d{5}\/\d{2})/g);
    if (todosRenspa && todosRenspa.length >= 2) {
      datos.numeroRespaDestino = todosRenspa[1];
    }

    // Fechas (las fechas pueden estar en la misma línea o en la línea siguiente)
    const fechaEmision = texto.match(/(?:Fecha\s+y\s+hora\s+de\s+emisi[oó]n[:\s]*)(\d{1,2}\/\d{1,2}\/\d{4})/i);
    const fechaCarga = texto.match(/(?:Fecha\s+Carga[:\s]*?)(\d{1,2}\/\d{1,2}\/\d{4})/i)
      || texto.match(/Fecha\s+Carga\s*\n\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    const fechaVenc = texto.match(/(?:Fecha\s+Vencimiento[:\s]*?)(\d{1,2}\/\d{1,2}\/\d{4})/i)
      || texto.match(/Fecha\s+Vencimiento\s*\n\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
    if (fechaEmision) datos.fechaEmisionDUT = convertirFecha(fechaEmision[1]);
    if (fechaCarga) datos.fechaCargaDUT = convertirFecha(fechaCarga[1]);
    if (fechaVenc) datos.fechaVencimientoDUT = convertirFecha(fechaVenc[1]);

    // Motivo (puede estar en la misma línea o en la siguiente; nunca es "Oficina Local")
    const motivoMatch = texto.match(/Motivo:\s*\n\s*([^\n\r]+)/i)
      || texto.match(/Motivo:\s*([^\n\r]+)/i);
    if (motivoMatch) {
      let motivo = motivoMatch[1].trim();
      // Filtrar si capturó "Oficina Local" por error
      if (!/oficina\s*local/i.test(motivo) && motivo.length > 0) {
        datos.motivo = motivo;
      }
    }
    if (!datos.motivo) {
      if (texto.toLowerCase().includes('frigorífico') || texto.toLowerCase().includes('frigorifico') || texto.toLowerCase().includes('faena')) {
        datos.motivo = 'Faena';
      } else if (/cr[ií]a\s*UE/i.test(texto)) {
        datos.motivo = 'Cría UE';
      }
    }

    // Categoría
    const catMatch = texto.match(/(?:Ovinos\s*-\s*)([^\n\r]+)/i);
    if (catMatch) {
      const catText = catMatch[1].toLowerCase();
      if (catText.includes('capón') || catText.includes('capon')) datos.categoria = 'CAPON';
      else if (catText.includes('oveja')) datos.categoria = 'OVEJA';
      else if (catText.includes('carnero')) datos.categoria = 'CARNERO';
      else if (catText.includes('borrego')) datos.categoria = 'BORREGO';
      else if (catText.includes('cordero')) datos.categoria = 'CORDERO';
      else if (catText.includes('borrega')) datos.categoria = 'BORREGA';
    }

    // Cantidad
    const cantMatch = texto.match(/(?:Cantidad Total:\s*)(\d+)/i) || texto.match(/(?:CANTIDAD\s*)(\d+)/i);
    if (cantMatch) datos.cantidadEnDUT = parseInt(cantMatch[1]);

    // Valores monetarios
    // valorDUT = Total de tasas SENASA (sección CONFORMIDAD DEL SOLICITANTE)
    const totalSenasaMatch = texto.match(/Total:\s*\$\s*([\d.,]+)/i);
    if (totalSenasaMatch) {
      datos.valorDUT = parseFloat(totalSenasaMatch[1].replace(/\./g, '').replace(',', '.'));
    } else {
      // Fallback: buscar SA008-A individual
      const valorDUTMatch = texto.match(/(?:Res\.\s*501\/2023\s*Cod\.\s*SA008-A\s*\$?\s*)([\d.,]+)/i)
        || texto.match(/(?:Res\.\s*189\/2018\s*Cod\.\s*SA008\s*\$?\s*)([\d.,]+)/i);
      if (valorDUTMatch) datos.valorDUT = parseFloat(valorDUTMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    // valorGuia = TOTAL A PAGAR de boleta provincial ARECH (página 2/3)
    const valorGuiaProvincial = texto.match(/TOTAL\s+A\s+PAGAR\s*\$\s*([\d.,]+)/i);
    if (valorGuiaProvincial) {
      datos.valorGuia = parseFloat(valorGuiaProvincial[1].replace(/\./g, '').replace(',', '.'));
    } else {
      // Fallback: buscar tasa SA013
      const valorGuiaMatch = texto.match(/(?:Res\.\s*501\/2023\s*Cod\.\s*SA013\s*\$?\s*)([\d.,]+)/i)
        || texto.match(/(?:Res\.\s*189\/2018\s*Cod\.\s*SA013\s*\$?\s*)([\d.,]+)/i);
      if (valorGuiaMatch) datos.valorGuia = parseFloat(valorGuiaMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    // Reportar campos faltantes
    if (!datos.numeroDUT) errores.push('No se pudo extraer el número de DUT');
    if (!datos.titularDestino) errores.push('No se pudo extraer el titular destino');
    if (!datos.fechaEmisionDUT) errores.push('No se pudo extraer la fecha de emisión');
  } catch (error) {
    errores.push('Error al procesar el texto del documento');
  }

  if (errores.length > 0) datos.errores = errores;
  return datos;
}

function calcularConfianzaRegex(datos: Partial<DUTExtractionResult>): number {
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

function convertirFecha(fecha: string): string {
  try {
    const limpia = fecha.trim().replace(/[^\d\/\-\.]/g, '');
    if (limpia.length < 6) return fecha;

    if (limpia.includes('/')) {
      const partes = limpia.split('/');
      if (partes.length === 3) {
        const dia = partes[0].padStart(2, '0');
        const mes = partes[1].padStart(2, '0');
        const año = partes[2].length === 2 ? `20${partes[2]}` : partes[2];
        return `${año}-${mes}-${dia}`;
      }
    }

    if (limpia.includes('-') && limpia.split('-')[0].length <= 2) {
      const partes = limpia.split('-');
      if (partes.length === 3) {
        const dia = partes[0].padStart(2, '0');
        const mes = partes[1].padStart(2, '0');
        const año = partes[2].length === 2 ? `20${partes[2]}` : partes[2];
        return `${año}-${mes}-${dia}`;
      }
    }

    return limpia;
  } catch {
    return fecha;
  }
}

// ============================================================================
// Servicio público
// ============================================================================

export const dutExtractionService = {
  processFile: async (
    file: Express.Multer.File,
    tipoArchivo: string
  ): Promise<DUTExtractionResult> => {
    try {
      // Intentar con Claude Vision primero
      const client = getAnthropicClient();
      if (client) {
        try {
          const result = await extractWithClaudeVision(client, file, tipoArchivo);
          return result;
        } catch (error: any) {
          console.error('⚠️ Claude Vision falló, cayendo a regex:', error.message);
          // Caer al fallback regex
        }
      } else {
        console.log('ℹ️ ANTHROPIC_API_KEY no configurada, usando extracción regex');
      }

      // Fallback: regex
      return await extractWithRegexFallback(file, tipoArchivo);
    } catch (error: any) {
      console.error('Error procesando archivo DUT:', error);
      throw new Error(`Error al procesar el archivo: ${error.message}`);
    }
  },
};
