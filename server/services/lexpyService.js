const BaseLegal = require('../models/BaseLegal');
const AprendizajeSistema = require('../models/AprendizajeSistema');
const { buscarEnFuentesExternas } = require('./scraperService');
const { generarRespuestaIA } = require('./aiProviderService');
const { recuperarMemoriaContextual } = require('./agentMemoryService');

const UMBRAL_RESULTADOS_LOCALES = 1;

const SALUDOS = [
  'hola', 'holi', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches',
  'que tal', 'como estas', 'como estas hoy', 'quien eres', 'quien sos', 'que puedes hacer',
  'que haces', 'en que puedes ayudarme', 'podes ayudarme', 'ayuda', 'gracias', 'muchas gracias',
];

function textoPlano(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function esSaludo(pregunta) {
  const t = textoPlano(pregunta).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return SALUDOS.some((frase) => t === frase || t.startsWith(`${frase} `));
}

async function buscarEnBaseLocal(consulta) {
  const q = String(consulta || '').trim();
  // Detección de número de ley específica (ej: 1462, 6715, 213, 1183, 1626, 834)
  const numLeyMatch = q.match(/\b(?:ley\s*(?:n[º°]?\s*)?|n[º°]?\s*)(\d+)(?:\/(\d{2,4}))?\b/i);
  let baseLegal = [];

  if (numLeyMatch) {
    const num = numLeyMatch[1];
    const regexLey = new RegExp(`\\b${num}\\b`, 'i');
    baseLegal = await BaseLegal.find({ titulo: { $regex: regexLey } }).limit(2);
  }

  // Si no hubo match específico o no se encontraron, búsqueda por texto completo
  if (!baseLegal.length) {
    try {
      baseLegal = await BaseLegal.find(
        { $text: { $search: consulta } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(3);
    } catch {
      // Fallback si no hay índice de texto activo
      baseLegal = await BaseLegal.find({
        $or: [
          { titulo: { $regex: consulta.slice(0, 30), $options: 'i' } },
          { contenido: { $regex: consulta.slice(0, 30), $options: 'i' } },
        ],
      }).limit(2);
    }
  }

  let aprendizajes = [];
  try {
    aprendizajes = await AprendizajeSistema.find(
      { $text: { $search: consulta }, validado: true },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(2);
  } catch {
    aprendizajes = [];
  }

  return { aprendizajes, baseLegal };
}

function construirContexto({ aprendizajes, baseLegal }) {
  const partes = [];

  baseLegal.forEach((b) => {
    const ref = b.url ? ` (${b.url})` : '';
    partes.push(`[${b.titulo}${ref}]\nFUENTE: ${b.fuente || 'Oficial Paraguay'}\n${b.contenido.slice(0, 1200)}`);
  });

  aprendizajes.forEach((a) => {
    partes.push(`ENSEÑANZA PREVIA: ${a.pregunta}\nDOCTRINA/APLICACIÓN: ${a.respuesta}`);
  });

  return partes.join('\n\n---\n\n');
}

function notaDeFuentes({ aprendizajes, baseLegal, externa }) {
  const items = [];

  baseLegal.forEach((b) => {
    const origen = b.fuente || 'Base Legal interna';
    items.push(b.url ? `- [${b.titulo}](${b.url}) - ${origen}` : `- ${b.titulo} - ${origen}`);
  });

  aprendizajes.forEach((a) => {
    items.push(`- Respuesta validada del sistema (sobre: ${a.pregunta.slice(0, 60)})`);
  });

  if (externa) {
    if (externa.fuente === 'ecosistema_oficial_py') {
      items.push(`- Red Oficial de Justicia y Legislación de la República del Paraguay (CSJ Jurisprudencia, BACN Leyes, SILpy Congreso, Gaceta Oficial)`);
    } else {
      const nombre =
        externa.fuente === 'csj' ? 'CSJ - Corte Suprema de Justicia (csj.gov.py)' : 'BaseLegal Paraguay (baselegal.com.py)';
      items.push(`- ${nombre}${externa.urlConsultada ? ` - [resultado de búsqueda](${externa.urlConsultada})` : ''}`);
    }
  }

  if (!items.length) return '';
  return `\n\n---\n### Fuentes consultadas\n${items.join('\n')}`;
}

async function responderSaludo(pregunta) {
  const system =
    'Sos Techapyrã IA, el asistente jurídico del estudio LIN GROUP & Asociados (Paraguay). ' +
    'Respondé los saludos y mensajes de cortesía de forma breve, amable y profesional en español. ' +
    'No inventes información legal. Si piden una consulta jurídica concreta, invitá a realizarla directamente.';
  const respuesta = await generarRespuestaIA({ prompt: pregunta, contexto: null, system });
  return (
    respuesta ||
    '¡Hola! Soy Techapyrã IA, el asistente jurídico del estudio. ¿En qué puedo ayudarte hoy? ' +
    'Podés consultarme sobre leyes, códigos o trámites en Paraguay.'
  );
}

async function procesarConsultaTecnica({ pregunta, usuarioId, expedienteId, clienteId }) {
  const { aprendizajes, baseLegal } = await buscarEnBaseLocal(pregunta);
  const totalLocal = aprendizajes.length + baseLegal.length;

  let contexto = construirContexto({ aprendizajes, baseLegal });
  let fuenteRespuesta = totalLocal > 0 ? 'base_local' : null;

  // Inyección de memoria agéntica de largo plazo (evita re-enviar historial completo)
  if (usuarioId) {
    const memoriaContextual = await recuperarMemoriaContextual({
      usuarioId,
      expedienteId,
      clienteId,
      consulta: pregunta,
    });
    if (memoriaContextual) {
      contexto = contexto ? `${memoriaContextual}\n---\n${contexto}` : memoriaContextual;
      if (!fuenteRespuesta) fuenteRespuesta = 'memoria_agente';
    }
  }

  // Inyección de Documentos Oficiales del Expediente (RAG de causa: PDFs, escaneados, contratos)
  if (expedienteId) {
    const { obtenerContextoDocumentosExpediente } = require('./documentProcessorService');
    const docsContexto = await obtenerContextoDocumentosExpediente(expedienteId);
    if (docsContexto) {
      contexto = contexto ? `${docsContexto}\n---\n${contexto}` : docsContexto;
      if (!fuenteRespuesta) fuenteRespuesta = 'documentos_expediente';
    }
  }

  let externa = null;

  if (totalLocal < UMBRAL_RESULTADOS_LOCALES) {
    externa = await buscarEnFuentesExternas(pregunta);
    if (externa) {
      const bloqueExterno = `[FUENTE EXTERNA: ${externa.fuente}]${externa.urlConsultada ? ` (${externa.urlConsultada})` : ''}\n${externa.resultado}`;
      contexto = contexto ? `${contexto}\n---\n${bloqueExterno}` : bloqueExterno;
      fuenteRespuesta = externa.fuente === 'csj' ? 'externo_csj' : 'externo_baselegal';
    }
  }

  const system =
    'Sos Techapyrã IA, el asistente jurídico de LIN GROUP & Asociados especializado en legislación de la República del Paraguay.\n' +
    'DIRECTRICES OBLIGATORIAS:\n' +
    '1. Responde ÚNICA Y EXCLUSIVAMENTE a la consulta o norma jurídica que el usuario solicita. No agregues leyes no pertinentes ni temas fuera de la consulta.\n' +
    '2. Estructura TODA tu respuesta en Markdown limpio y profesional (# Títulos, ## Secciones, viñetas, tablas y citas textuales en bloque cuando sea oportuno).\n' +
    '3. Cita textualmente los artículos o disposiciones normativas pertinentes con su número y denominación oficial (ej: Ley 1462/1935, Ley 6715/2021, Código Civil Paraguayo, Constitución Nacional).\n' +
    '4. Si la consulta pide solo los artículos o el extracto, responde directamente con dicha normativa sin rodeos ni preámbulos innecesarios.';

  const respuestaIA = await generarRespuestaIA({ prompt: pregunta, contexto: contexto || null, system });

  if (respuestaIA) {
    const nota = notaDeFuentes({ aprendizajes, baseLegal, externa });
    const respuesta = nota && !respuestaIA.includes('Fuentes consultadas') ? respuestaIA + nota : respuestaIA;
    return { respuesta, fuente: fuenteRespuesta || 'ia_generativa' };
  }

  if (baseLegal.length || aprendizajes.length || contexto) {
    let salidaMarkdown = '';
    if (baseLegal.length) {
      salidaMarkdown = baseLegal
        .map(
          (b) =>
            `# ${b.titulo}\n\n` +
            `- **Fuente Oficial:** ${b.fuente || 'Biblioteca y Archivo Central del Congreso de la Nación (BACN)'}\n` +
            (b.url ? `- **URL Oficial:** [${b.url}](${b.url})\n` : '') +
            `- **Estado:** Vigente en la República del Paraguay\n\n` +
            `### Disposiciones y Artículos:\n\n${b.contenido}\n`
        )
        .join('\n---\n\n');
    } else {
      salidaMarkdown = contexto;
    }
    const nota = notaDeFuentes({ aprendizajes, baseLegal, externa });
    return {
      respuesta: salidaMarkdown + (nota || ''),
      fuente: fuenteRespuesta || 'base_local',
    };
  }

  return {
    respuesta: 'No se encontró información relevante en la base de conocimiento local ni en las fuentes externas configuradas.',
    fuente: null,
  };
}

async function procesarConsultaLexPY(payload, usuarioIdParam, expedienteIdParam, clienteIdParam) {
  const pregunta = typeof payload === 'object' && payload !== null ? payload.pregunta : String(payload || '');
  const usuarioId = typeof payload === 'object' && payload !== null ? payload.usuarioId : usuarioIdParam;
  const expedienteId = typeof payload === 'object' && payload !== null ? payload.expedienteId : expedienteIdParam;
  const clienteId = typeof payload === 'object' && payload !== null ? payload.clienteId : clienteIdParam;

  if (esSaludo(pregunta)) {
    const respuesta = await responderSaludo(pregunta);
    return { respuesta, fuente: 'ia_generativa', aprendizaje: false };
  }

  const resultado = await procesarConsultaTecnica({ pregunta, usuarioId, expedienteId, clienteId });

  // Auto-aprendizaje para retroalimentar el RAG local (pendiente de validación humana).
  if (resultado.respuesta && resultado.fuente) {
    await AprendizajeSistema.create({
      pregunta,
      respuesta: resultado.respuesta,
      origen: resultado.fuente === 'base_local' ? 'local' : resultado.fuente,
      validado: false,
      tags: [],
    }).catch((err) => console.warn('[LexPY] No se pudo registrar el aprendizaje:', err.message));
  }

  return resultado;
}

module.exports = { procesarConsultaLexPY };

