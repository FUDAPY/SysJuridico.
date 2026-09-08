const BaseLegal = require('../models/BaseLegal');
const AprendizajeSistema = require('../models/AprendizajeSistema');
const { buscarEnFuentesExternas } = require('./scraperService');
const { generarRespuestaIA } = require('./aiProviderService');

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
    const nombre =
      externa.fuente === 'csj' ? 'CSJ - Corte Suprema de Justicia (csj.gov.py)' : 'BaseLegal Paraguay (baselegal.com.py)';
    items.push(`- ${nombre}${externa.urlConsultada ? ` - [resultado de búsqueda](${externa.urlConsultada})` : ''}`);
  }

  if (!items.length) return '';
  return `\n\n---\n### Fuentes consultadas\n${items.join('\n')}`;
}

async function responderSaludo(pregunta) {
  const system =
    'Sos LexPY, el asistente jurídico del estudio LIN GROUP & Asociados (Paraguay). ' +
    'Respondé los saludos y mensajes de cortesía de forma breve, amable y profesional en español. ' +
    'No inventes información legal. Si piden una consulta jurídica concreta, invitá a realizarla directamente.';
  const respuesta = await generarRespuestaIA({ prompt: pregunta, contexto: null, system });
  return (
    respuesta ||
    '¡Hola! Soy LexPY, el asistente jurídico del estudio. ¿En qué puedo ayudarte hoy? ' +
      'Podés consultarme sobre leyes, códigos o trámites en Paraguay.'
  );
}

async function procesarConsultaTecnica(pregunta) {
  const { aprendizajes, baseLegal } = await buscarEnBaseLocal(pregunta);
  const totalLocal = aprendizajes.length + baseLegal.length;

  let contexto = construirContexto({ aprendizajes, baseLegal });
  let fuenteRespuesta = totalLocal > 0 ? 'base_local' : null;
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
    'Sos LexPY, un asistente jurídico especializado en legislación paraguaya. ' +
    'Respondé en español usando markdown simple (negritas, listas y encabezados cuando ayude). ' +
    'Basa tu respuesta en el contexto proporcionado y no inventes normas ni jurisprudencia. ' +
    'Si el contexto contiene fuentes, úsalas y dejá que el sistema agregue la lista final de fuentes consultadas.';

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

async function procesarConsultaLexPY({ pregunta, usuarioId }) {
  if (esSaludo(pregunta)) {
    const respuesta = await responderSaludo(pregunta);
    return { respuesta, fuente: 'ia_generativa', aprendizaje: false };
  }

  const resultado = await procesarConsultaTecnica(pregunta);

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
