const pdfParse = require('pdf-parse');
const { generarRespuestaIA } = require('./aiProviderService');
const { extraerNormasDeTexto } = require('./agentMemoryService');

/**
 * Servicio de Ingesta & Lectura Multimodal de Documentos
 * Procesa PDFs, escaneados, resoluciones y escritos judiciales adjuntos a un expediente.
 */

async function extraerTextoDeBuffer({ buffer, tipo = '', nombre = '' }) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return { texto: '', esEscaneado: false, paginas: 1 };
  }

  const nombreLower = nombre.toLowerCase();
  const tipoLower = tipo.toLowerCase();

  // 1. Archivo PDF
  if (tipoLower.includes('pdf') || nombreLower.endsWith('.pdf')) {
    try {
      const data = await pdfParse(buffer);
      const textoLimpio = (data.text || '').replace(/\s+/g, ' ').trim();
      const paginas = data.numpages || 1;

      // Si el texto es mínimo o vacío, es un PDF escaneado sin capa de texto seleccionable
      const esEscaneado = textoLimpio.length < 20;
      const textoFinal = esEscaneado
        ? '[PDF sin capa de texto seleccionable — requiere OCR]'
        : textoLimpio;

      return {
        texto: textoFinal,
        esEscaneado,
        paginas,
      };
    } catch (err) {
      console.warn('[DocProcessor] Error extrayendo texto de PDF:', err.message);
      return { texto: '[PDF sin capa de texto seleccionable — requiere OCR]', esEscaneado: true, paginas: 1 };
    }
  }

  // 2. Archivo Word / DOCX
  if (tipoLower.includes('word') || tipoLower.includes('docx') || nombreLower.endsWith('.docx') || nombreLower.endsWith('.doc')) {
    try {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      const textoLimpio = (result.value || '').replace(/\s+/g, ' ').trim();
      return {
        texto: textoLimpio || `[Documento Word "${nombre}" sin contenido de texto legible]`,
        esEscaneado: false,
        paginas: 1,
      };
    } catch (err) {
      console.warn('[DocProcessor] Error extrayendo texto de Word (.docx):', err.message);
      const fallback = buffer.toString('utf8').slice(0, 3000).replace(/[^\x20-\x7E\xA0-\xFF\n]/g, ' ').trim();
      return { texto: fallback || `[Documento Word: ${nombre}]`, esEscaneado: false, paginas: 1 };
    }
  }

  // 3. Imágenes (.png, .jpg, .jpeg, .webp) con OCR Tesseract en español
  if (tipoLower.includes('image') || /\.(png|jpe?g|webp|bmp|tiff?)$/i.test(nombreLower)) {
    try {
      const { createWorker } = require('tesseract.js');
      const worker = await createWorker('spa');
      const ret = await worker.recognize(buffer);
      await worker.terminate();
      const textoOcr = (ret.data?.text || '').replace(/\s+/g, ' ').trim();
      const esVacio = textoOcr.length < 10;
      return {
        texto: esVacio
          ? `[IMAGEN JUDICIAL: ${nombre}] Imagen adjunta sin texto legible detectado por OCR.`
          : `[TEXTO EXTRAÍDO POR OCR DE IMAGEN: ${nombre}]\n${textoOcr}`,
        esEscaneado: true,
        paginas: 1,
      };
    } catch (err) {
      console.warn('[DocProcessor] Error ejecutando OCR de imagen:', err.message);
      return {
        texto: `[DOCUMENTO ESCANEADO: ${nombre}] Imagen judicial adjunta.`,
        esEscaneado: true,
        paginas: 1,
      };
    }
  }

  // 4. Archivo HTML o Texto Plano
  if (tipoLower.includes('text') || tipoLower.includes('html') || nombreLower.endsWith('.html') || nombreLower.endsWith('.txt')) {
    const texto = buffer.toString('utf8').replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    return { texto, esEscaneado: false, paginas: 1 };
  }

  // Fallback genérico
  const fallbackTexto = buffer.toString('utf8').slice(0, 2000).replace(/[^\x20-\x7E\xA0-\xFF\n]/g, ' ').trim();
  return { texto: fallbackTexto, esEscaneado: false, paginas: 1 };
}

/**
 * Analiza el documento con DeepSeek para generar un resumen ejecutivo forense y entidades.
 */
async function analizarYResumirDocumento({ texto, nombre, caratulaExpediente = '' }) {
  if (!texto || texto.trim().length < 30) {
    return {
      resumenIA: `Documento "${nombre}" adjunto a la causa.`,
      entidadesClave: [],
    };
  }

  const normas = extraerNormasDeTexto(texto);

  try {
    const prompt =
      `Analiza el siguiente texto de un documento judicial paraguayo perteneciente a la causa: "${caratulaExpediente}".\n\n` +
      `NOMBRE DEL ARCHIVO: ${nombre}\n` +
      `TEXTO DEL DOCUMENTO (muestra):\n${texto.slice(0, 3500)}\n\n` +
      `Genera un resumen conciso en 2 oraciones indicando:\n` +
      `1) Qué tipo de escrito o resolución es.\n` +
      `2) Partes intervinientes, pretensión o decisión judicial principal.\n` +
      `Menciona montos o plazos si aparecen.`;

    const resumenIA = await generarRespuestaIA({
      prompt,
      contexto: null,
      system: 'Sos un analista jurídico forense paraguayo. Sé conciso y directo.',
    });

    const entidades = Array.from(new Set([...normas]));

    return {
      resumenIA: resumenIA || `Documento procesado: ${nombre}`,
      entidadesClave: entidades.slice(0, 8),
    };
  } catch (err) {
    console.warn('[DocProcessor] Error resumiendo documento:', err.message);
    return {
      resumenIA: `Documento adjunto: ${nombre}`,
      entidadesClave: normas,
    };
  }
}

/**
 * Obtiene el contexto consolidado de todos los documentos adjuntos a un expediente para el RAG.
 */
async function obtenerContextoDocumentosExpediente(expedienteId) {
  const mongoose = require('mongoose');
  if (!expedienteId || !mongoose.Types.ObjectId.isValid(expedienteId)) return null;

  const DocumentoExpediente = require('../models/DocumentoExpediente');
  const docs = await DocumentoExpediente.find({ expediente: expedienteId })
    .select('nombre tipo textoExtraido resumenIA entidadesClave createdAt')
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();

  if (!docs.length) return null;

  const bloques = docs.map((d) => {
    const resumen = d.resumenIA ? `Resumen IA: ${d.resumenIA}` : '';
    const extracto = d.textoExtraido ? `Fragmento clave: "${d.textoExtraido.slice(0, 500)}..."` : '(Documento escaneado / sin texto OCR)';
    const entidades = (d.entidadesClave || []).join(', ');

    return `[DOCUMENTO DEL CASO: ${d.nombre}]\n` +
      (resumen ? `${resumen}\n` : '') +
      (entidades ? `Normas / Entidades: ${entidades}\n` : '') +
      `${extracto}`;
  });

  return `### DOCUMENTACIÓN OFICIAL ADJUNTA AL EXPEDIENTE:\n${bloques.join('\n---\n')}`;
}

module.exports = {
  extraerTextoDeBuffer,
  analizarYResumirDocumento,
  obtenerContextoDocumentosExpediente,
};
