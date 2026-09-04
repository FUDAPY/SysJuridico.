const BaseLegal = require('../models/BaseLegal');
const AprendizajeSistema = require('../models/AprendizajeSistema');
const { buscarEnFuentesExternas } = require('./scraperService');
const { generarRespuestaIA } = require('./aiProviderService');

const UMBRAL_RESULTADOS_LOCALES = 1;

/**
 * Paso 1: Busca en la base de conocimiento local de MongoDB (RAG local)
 * combinando aprendizajes ya validados y la base legal cargada.
 */
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
    partes.push(`[${b.categoria.toUpperCase()}] ${b.titulo}: ${b.contenido.slice(0, 800)}`);
  });

  return partes.join('\n---\n');
}

/**
 * Orquesta la respuesta del chat LexPY:
 * 1) RAG local en MongoDB.
 * 2) Fallback a fuentes externas públicas si no hay suficiente contexto local.
 * 3) IA generativa (si está configurada) para redactar la respuesta final.
 * 4) Guarda automáticamente el conocimiento nuevo para retroalimentar el sistema.
 */
async function procesarConsultaLexPY({ pregunta, usuarioId }) {
  const resultadosLocales = await buscarEnBaseLocal(pregunta);
  const totalLocal = resultadosLocales.aprendizajes.length + resultadosLocales.baseLegal.length;

  let fuenteRespuesta = 'base_local';
  let contexto = construirContexto(resultadosLocales);
  let infoExterna = null;

  if (totalLocal < UMBRAL_RESULTADOS_LOCALES) {
    infoExterna = await buscarEnFuentesExternas(pregunta);
    if (infoExterna) {
      contexto = `${contexto}\n---\n[FUENTE EXTERNA: ${infoExterna.fuente}]\n${infoExterna.resultado}`.trim();
      fuenteRespuesta = infoExterna.fuente === 'csj' ? 'externo_csj' : 'externo_baselegal';
    }
  }

  let respuestaFinal = null;
  const respuestaIA = await generarRespuestaIA({ prompt: pregunta, contexto });

  if (respuestaIA) {
    respuestaFinal = respuestaIA;
    if (!contexto) fuenteRespuesta = 'ia_generativa';
  } else if (contexto) {
    // Sin proveedor de IA configurado: se devuelve el contexto recopilado como respuesta directa
    respuestaFinal = `No hay un modelo de IA generativa configurado (LEXPY_AI_PROVIDER). Contexto relevante encontrado:\n\n${contexto}`;
  } else {
    respuestaFinal =
      'No se encontró información relevante en la base de conocimiento local ni en las fuentes externas configuradas.';
    fuenteRespuesta = null;
  }

  // Auto-aprendizaje: guarda la interacción para futuras consultas (pendiente de validación)
  if (respuestaFinal && fuenteRespuesta) {
    await AprendizajeSistema.create({
      pregunta,
      respuesta: respuestaFinal,
      origen: fuenteRespuesta === 'base_local' ? 'local' : fuenteRespuesta,
      validado: false,
      tags: [],
    }).catch((err) => console.warn('[LexPY] No se pudo registrar el aprendizaje:', err.message));
  }

  return { respuesta: respuestaFinal, fuente: fuenteRespuesta };
}

module.exports = { procesarConsultaLexPY };
