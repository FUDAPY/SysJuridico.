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
  const [aprendizajes, baseLegal] = await Promise.all([
    AprendizajeSistema.find(
      { $text: { $search: consulta }, validado: true },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(3),
    BaseLegal.find(
      { $text: { $search: consulta } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(3),
  ]);

  return { aprendizajes, baseLegal };
}

function construirContexto({ aprendizajes, baseLegal }) {
  const partes = [];

  aprendizajes.forEach((a) => {
    partes.push(`P: ${a.pregunta}\nR: ${a.respuesta}`);
  });

  baseLegal.forEach((b) => {
    const ref = b.url ? ` (${b.url})` : '';
    partes.push(`[${b.titulo}${ref}]\n${b.contenido.slice(0, 800)}`);
  });

  return partes.join('\n---\n');
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
    'Sos Techapyrã IA, el asistente jurídico de LIN GROUP & Asociados especializado en legislación de la República del Paraguay. ' +
    'Respondé en español usando markdown profesional (negritas, viñetas y citas precisas a artículos y leyes). ' +
    'Basa tu respuesta en el contexto normativo y en la memoria del expediente proporcionada sin inventar hechos. ' +
    'Si existen artículos o leyes relevantes, citalos con su número oficial (ej: Ley 213/93, Ley 1183/85, Constitución de 1992).';

  const respuestaIA = await generarRespuestaIA({ prompt: pregunta, contexto: contexto || null, system });

  if (respuestaIA) {
    const nota = notaDeFuentes({ aprendizajes, baseLegal, externa });
    const respuesta = nota && !respuestaIA.includes('Fuentes consultadas') ? respuestaIA + nota : respuestaIA;
    return { respuesta, fuente: fuenteRespuesta || 'ia_generativa' };
  }

  if (contexto) {
    return {
      respuesta: `El proveedor de IA no respondió (revisá la clave/API y los créditos del servicio). Contexto relevante encontrado:\n\n${contexto}`,
      fuente: fuenteRespuesta,
    };
  }

  return {
    respuesta: 'No se encontró información relevante en la base de conocimiento local ni en las fuentes externas configuradas.',
    fuente: null,
  };
}

async function procesarConsultaLexPY({ pregunta, usuarioId, expedienteId, clienteId }) {
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

