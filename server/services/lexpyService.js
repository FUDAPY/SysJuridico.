const BaseLegal = require('../models/BaseLegal');
const Jurisprudencia = require('../models/Jurisprudencia');
const AprendizajeSistema = require('../models/AprendizajeSistema');
const { buscarEnFuentesExternas } = require('./scraperService');
const { generarRespuestaIA } = require('./aiProviderService');
const { recuperarMemoriaContextual } = require('./agentMemoryService');
const { buscarEnOtelaxWisdom } = require('./otelaxWisdomService');

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

function esConsultaMetaOtelax(pregunta) {
  if (!pregunta || typeof pregunta !== 'string') return false;
  const p = textoPlano(pregunta).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const patrones = [
    /\b(motor.*rag|rag.*motor|rag)\b/,
    /\b(base.*conocimiento|nombre.*base)\b/,
    /\b(quien.*sos|quien.*eres|que.*sos|que.*eres)\b/,
    /\b(como.*te.*llamas|cual.*es.*tu.*nombre)\b/,
    /\b(como.*funcionas|que.*haces|que.*podes.*hacer|que.*puedes.*hacer)\b/,
    /\b(que.*modelo|que.*ia)\b/,
    /\b(otelax|otelaxwisdom|techapyra)\b/,
    /\b(que.*base.*datos|que.*leyes.*tenes|cuantas.*leyes)\b/,
  ];
  return patrones.some((rx) => rx.test(p));
}

async function buscarEnBaseLocal(consulta) {
  const q = String(consulta || '').trim();
  if (esConsultaMetaOtelax(q)) {
    return { aprendizajes: [], baseLegal: [], jurisprudencia: [] };
  }

  // Detección de número de ley específica (ej: 1462, 6715, 213, 1183, 1626, 834)
  const numLeyMatch = q.match(/\b(?:ley\s*(?:n[º°]?\s*)?|n[º°]?\s*)(\d+)(?:\/(\d{2,4}))?\b/i);
  let baseLegal = [];

  const filtroVigencia = {
    $or: [
      { estado: 'VIGENTE' },
      { estado: 'MODIFICADA' },
      { estadoNormativo: { $nin: ['Derogada', 'Histórica', 'derogada', 'historica'] } },
      { estado: { $exists: false }, estadoNormativo: { $exists: false } },
    ],
  };

  if (numLeyMatch) {
    const num = numLeyMatch[1];
    const regexLey = new RegExp(`\\b${num}\\b`, 'i');
    baseLegal = await BaseLegal.find({
      $or: [{ numeroLey: num }, { titulo: { $regex: regexLey } }],
      ...filtroVigencia,
    }).limit(2);
  }

  // Búsqueda por texto completo en base legal
  if (!baseLegal.length) {
    try {
      baseLegal = await BaseLegal.find(
        { $text: { $search: consulta }, ...filtroVigencia },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(3);
    } catch {
      baseLegal = await BaseLegal.find({
        ...filtroVigencia,
        $or: [
          { titulo: { $regex: consulta.slice(0, 30), $options: 'i' } },
          { contenido: { $regex: consulta.slice(0, 30), $options: 'i' } },
        ],
      }).limit(2);
    }
  }

  // Búsqueda en jurisprudencia CSJ y tribunales internacionales
  let jurisprudencia = [];
  try {
    jurisprudencia = await Jurisprudencia.find(
      { $text: { $search: consulta } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(2);
  } catch {
    jurisprudencia = [];
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

  return { aprendizajes, baseLegal, jurisprudencia };
}

function construirContexto({ aprendizajes, baseLegal, jurisprudencia = [] }) {
  const partes = [];

  baseLegal.forEach((b) => {
    const ref = b.fuenteOficialUrl || b.url ? ` (${b.fuenteOficialUrl || b.url})` : '';
    const fuero = b.fuero ? ` [FUERO ${b.fuero}]` : '';
    partes.push(`[${b.titulo}${fuero}${ref}]\nFUENTE: ${b.fuente || 'Oficial Paraguay'}\n${(b.contenido || '').slice(0, 1400)}`);
  });

  jurisprudencia.forEach((j) => {
    const num = j.numeroResolucion ? ` N° ${j.numeroResolucion}` : '';
    const sala = j.sala ? ` - ${j.sala}` : '';
    partes.push(`[PRECEDENTE CSJ: ${j.tipoResolucion}${num} / ${j.ano || ''}${sala}]\nCARÁTULA: ${j.caratula}\nDOCTRINA:\n${(j.contenido || j.doctrinaSumario || '').slice(0, 1200)}`);
  });

  aprendizajes.forEach((a) => {
    partes.push(`ENSEÑANZA PREVIA: ${a.pregunta}\nDOCTRINA/APLICACIÓN: ${a.respuesta}`);
  });

  return partes.join('\n\n---\n\n');
}

function notaDeFuentes({ aprendizajes = [], baseLegal = [], externa = null, docsOtelax = [] }) {
  const items = [];

  docsOtelax.forEach((d) => {
    items.push(`- **${d.titulo}** (${d.tipo}) — *OtelaxWisdom*`);
  });

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

const SYSTEM_PROMPT_TECHAPYRA = `Eres Techapyrã IA, el asistente jurídico profesional y experto legal de SysJurídico, impulsado por el Motor de Sabiduría OtelaxWisdom. Tu cometido es brindar asesoramiento técnico-jurídico, elaborar escritos forenses y fundamentar estrategias procesales bajo el derecho positivo vigente de la República del Paraguay.

### Principios Operativos y Criterio Jurídico:
1. Razonamiento Forense Directo: Ofrece análisis sustantivo y procesal riguroso, claro y fundamentado. Evita respuestas vacías o meras transcripciones mecánicas de artículos; explica con criterio práctico cómo se aplica la norma al caso y sugiere los pasos procesales concretos.
2. Motor OtelaxWisdom: Tu acervo de conocimiento curado abarca la Constitución Nacional de 1992, tratados internacionales vigentes, códigos procesales y de fondo, leyes especiales, acordadas y jurisprudencia paraguaya. Si en el contexto se te suministran extractos identificados como [DOCUMENTO OTELAXWISDOM: ...], fundaméntate de manera prioritaria en ellos citando sus preceptos aplicables.
3. Cobertura Normativa: Cuando un documento local específico no se encuentre adjunto en el contexto inmediato, fundamenta tu respuesta con base en la legislación positiva vigente, doctrina nacional consolidada y principios generales del derecho paraguayo sin inventar disposiciones ni alucinar fuentes inexistentes.
4. Tono y Rigor Procesal: Mantén un lenguaje forense sobrio, técnico, conciso y de alto nivel.
5. Principio de Vigencia Estricta: Aplica exclusivamente disposiciones vigentes. En caso de normas modificadas o derogadas, adviértelo explícitamente e invoca el texto vigente aplicable.
6. Licenciamiento y Seguridad: Todo código, script o plantilla generada se licencia bajo MIT para ZETTI DIGITAL PY de Giuliano Catella, manteniendo estricta confidencialidad de secretos y credenciales.`;

async function responderSaludo(pregunta) {
  const system =
    'Eres Techapyrã IA, el asistente jurídico profesional y experto legal de SysJurídico, impulsado por el Motor de Sabiduría OtelaxWisdom.\n' +
    'Responde los saludos y mensajes de cortesía de forma profesional, cordial y concisa en español.\n' +
    'Menciona que operas con el acervo normativo y jurisprudencial paraguayo de OtelaxWisdom.';
  const respuesta = await generarRespuestaIA({ prompt: pregunta, contexto: null, system });
  return (
    respuesta ||
    '¡Hola! Soy **Techapyrã IA**, el asistente jurídico profesional y experto legal de **SysJurídico**, impulsado por el Motor de Sabiduría **OtelaxWisdom**.\n\n' +
    'Estoy listo para resolver tus dudas jurídicas, proponer estrategias procesales, redactar escritos y analizar normativa o jurisprudencia positiva paraguaya. ¿En qué puedo asistirte hoy?'
  );
}

async function procesarConsultaMeta(pregunta) {
  const respuestaIA = await generarRespuestaIA({
    prompt: pregunta,
    contexto: null,
    system: `${SYSTEM_PROMPT_TECHAPYRA}\n\nResponde a la consulta meta o de identidad del usuario de forma directa, técnica y concisa.`,
  });
  if (respuestaIA) {
    return { respuesta: respuestaIA, fuente: 'ia_generativa' };
  }

  return {
    respuesta:
      '### Techapyrã IA — Motor de Sabiduría OtelaxWisdom\n\n' +
      'Soy **Techapyrã IA**, el asistente jurídico profesional y experto legal de **SysJurídico**, impulsado por el Motor de Sabiduría Jurídica **OtelaxWisdom**.\n\n' +
      '#### Arquitectura Cognitiva Local-First:\n' +
      '- 📚 **Acervo OtelaxWisdom:** Normas, tratados, códigos y doctrina paraguaya en documentos `.md` curados manualmente.\n' +
      '- ⚖️ **Jurisprudencia Oficial CSJ:** Acuerdos, Sentencias y Autos Interlocutorios indexados.\n' +
      '- 🏛️ **7 Fueros Centrales:** Civil y Comercial, Penal y Garantías, Laboral y Seg. Social, Niñez y Familia, Contencioso Administrativo & Constitucional, Tributario & Fiscal e Instituciones Públicas.\n' +
      '- 📁 **Causas y Documentos:** Lectura procesal de piezas y expedientes del cliente en tiempo real.\n' +
      '- 🛡️ **Vigencia Estricta:** Aplicación rigurosa de derecho positivo paraguayo vigente descartando disposiciones derogadas.\n\n' +
      '¿Qué consulta procesal o escrito judicial deseas trabajar hoy?',
    fuente: 'ia_generativa',
  };
}

async function procesarConsultaTecnica({ pregunta, usuarioId, expedienteId, clienteId }) {
  // 1. Búsqueda en OtelaxWisdom (documentos curados .md)
  let docsOtelax = [];
  try {
    const resOtelax = await buscarEnOtelaxWisdom(pregunta, { maxDocs: 3, minScore: 2 });
    docsOtelax = Array.isArray(resOtelax) ? resOtelax : (resOtelax?.resultados || []);
  } catch (err) {
    console.warn('[LexPY] Error al buscar en OtelaxWisdom:', err.message);
  }

  // 2. Búsqueda en base local MongoDB
  const { aprendizajes, baseLegal, jurisprudencia } = await buscarEnBaseLocal(pregunta);
  const totalLocal = aprendizajes.length + baseLegal.length + (jurisprudencia ? jurisprudencia.length : 0);

  const partesContexto = [];

  // Inyección de documentos OtelaxWisdom
  if (docsOtelax.length > 0) {
    docsOtelax.forEach((d) => {
      const fragmentos =
        d.fragmento ||
        (d.parrafosRelevantes && d.parrafosRelevantes.length ? d.parrafosRelevantes.join('\n\n') : '') ||
        (d.contenido || '').slice(0, 1500);
      partesContexto.push(`[DOCUMENTO OTELAXWISDOM: ${d.titulo} (${d.tipo})]\n${fragmentos}`);
    });
  }

  // Inyección de Base Legal interna
  const contextoBase = construirContexto({ aprendizajes, baseLegal, jurisprudencia });
  if (contextoBase) partesContexto.push(contextoBase);

  let contexto = partesContexto.join('\n\n---\n\n');
  let fuenteRespuesta = docsOtelax.length > 0 ? 'otelaxwisdom' : (totalLocal > 0 ? 'base_local' : null);
  let requiereAvisoFallback = false;

  // Inyección de memoria agéntica de largo plazo
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

  // Inyección de Documentos Oficiales del Expediente (RAG de causa)
  if (expedienteId) {
    const { obtenerContextoDocumentosExpediente } = require('./documentProcessorService');
    const docsContexto = await obtenerContextoDocumentosExpediente(expedienteId);
    if (docsContexto) {
      contexto = contexto ? `${docsContexto}\n---\n${contexto}` : docsContexto;
      if (!fuenteRespuesta) fuenteRespuesta = 'documentos_expediente';
    }
  }

  let externa = null;

  if (totalLocal + docsOtelax.length < UMBRAL_RESULTADOS_LOCALES) {
    requiereAvisoFallback = true;
    externa = await buscarEnFuentesExternas(pregunta);
    if (externa) {
      const bloqueExterno = `[FUENTE EXTERNA: ${externa.fuente}]${externa.urlConsultada ? ` (${externa.urlConsultada})` : ''}\n${externa.resultado}`;
      contexto = contexto ? `${contexto}\n---\n${bloqueExterno}` : bloqueExterno;
      fuenteRespuesta = externa.fuente === 'csj' ? 'externo_csj' : 'externo_baselegal';
    }
  }

  const promptFinal = pregunta;

  const respuestaIA = await generarRespuestaIA({
    prompt: promptFinal,
    contexto: contexto || null,
    system: SYSTEM_PROMPT_TECHAPYRA,
    activarGrounding: requiereAvisoFallback,
  });

  if (respuestaIA) {
    const nota = notaDeFuentes({ aprendizajes, baseLegal, externa, docsOtelax });
    const respuesta = nota && !respuestaIA.includes('Fuentes consultadas') ? respuestaIA + nota : respuestaIA;
    return { respuesta, fuente: fuenteRespuesta || 'ia_generativa' };
  }

  return {
    respuesta:
      'En este momento el servicio de inferencia jurídica de **Techapyrã IA** se encuentra con alta demanda o procesando solicitudes previas. Por favor, reintenta tu consulta en unos instantes.',
    fuente: 'temporalmente_no_disponible',
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

  if (esConsultaMetaOtelax(pregunta)) {
    const metaRes = await procesarConsultaMeta(pregunta);
    return { respuesta: metaRes.respuesta, fuente: 'ia_generativa', aprendizaje: false };
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

/**
 * Asistente IA especializado para el Editor Judicial (LibreOffice / Google Docs style)
 * Optimizado para bajo consumo de tokens y respuesta ultrarrápida (<3s).
 */
async function procesarAsistenteEditor({
  accion = 'redactar',
  textoSeleccionado = '',
  instrucciones = '',
  expedienteId = null,
  incluirCSJ = true,
  usuarioId = null,
}) {
  const Expediente = require('../models/Expediente');
  let datosCausa = '';
  let expedienteData = null;

  if (expedienteId) {
    try {
      const exp = await Expediente.findById(expedienteId).populate('cliente').lean();
      if (exp) {
        expedienteData = exp;
        const nombreCliente = exp.cliente?.nombreCompleto || 'Cliente';
        const docCliente = exp.cliente?.cedula || exp.cliente?.ruc || 'S/D';
        datosCausa =
          `DATOS DE LA CAUSA:\n` +
          `- Carátula: "${exp.caratula}" (N° ${exp.numero || 'S/N'}/${exp.ano || '2026'})\n` +
          `- Juzgado/Despacho: ${exp.juzgado || 'Juzgado de 1ra Instancia'}\n` +
          `- Fuero/Materia: ${exp.fuero || 'Civil y Comercial'} / ${exp.materia || 'General'}\n` +
          `- Cliente Titular: ${nombreCliente} (C.I./RUC: ${docCliente})\n`;

        // Contexto de documentos oficiales adjuntos (si existen)
        const { obtenerContextoDocumentosExpediente } = require('./documentProcessorService');
        const docsContexto = await obtenerContextoDocumentosExpediente(expedienteId);
        if (docsContexto) {
          datosCausa += `\nDOCUMENTOS DEL CASO:\n${docsContexto.slice(0, 800)}\n`;
        }
      }
    } catch (e) {
      console.warn('[EditorAI] Error obteniendo expediente:', e.message);
    }
  }

  // Búsqueda quirúrgica de jurisprudencia CSJ si se solicita
  let jurisprudenciaCSJ = '';
  if (incluirCSJ || /csj|jurisprudencia|corte|acordada/i.test(instrucciones)) {
    try {
      const acordadas = await BaseLegal.find({
        $or: [
          { fuero: 'Organización Judicial' },
          { titulo: /acordada|corte suprema|jurisprudencia/i },
          { tags: { $in: ['csj', 'jurisprudencia', 'acordada'] } },
        ],
        estadoNormativo: { $nin: ['Derogada', 'Histórica', 'derogada', 'historica'] },
      })
        .select('titulo contenido')
        .limit(2)
        .lean();

      if (acordadas.length) {
        jurisprudenciaCSJ =
          `\nJURISPRUDENCIA / ACORDADAS CSJ APLICABLES:\n` +
          acordadas.map((a) => `- ${a.titulo}: ${a.contenido.slice(0, 350)}...`).join('\n');
      }
    } catch (e) {
      console.warn('[EditorAI] Error obteniendo jurisprudencia CSJ:', e.message);
    }
  }

  // Ensamblado de prompt quirúrgico (bajo en tokens, directo al punto)
  let instruccionForense = '';
  switch (accion) {
    case 'mejorar':
      instruccionForense =
        `MEJORA Y PERFECCIONA el siguiente texto judicial manteniendo el sentido sustantivo pero elevando el rigor forense, la claridad y la elegancia estilística según la práctica de los tribunales paraguayos:\n\n"${textoSeleccionado}"`;
      break;
    case 'fundamentar_csj':
      instruccionForense =
        `INCORPORA FUNDAMENTOS DE DERECHO Y CRITERIOS DE LA CSJ DE PARAGUAY al siguiente fragmento, citando artículos específicos de la legislación paraguaya vigente:\n\n"${textoSeleccionado || instrucciones}"`;
      break;
    case 'polir':
      instruccionForense =
        `CORRIGE Y PULE la ortografía, puntuación, conectores lógicos y estilo formal forense del siguiente texto sin alterar su pretensión:\n\n"${textoSeleccionado}"`;
      break;
    case 'hechos':
      instruccionForense =
        `REDACTA LA SECCIÓN DE HECHOS (Capítulo II) de forma cronológica, ordenada y probatoriamente sólida según los antecedentes disponibles: ${instrucciones}`;
      break;
    case 'derecho':
      instruccionForense =
        `REDACTA LA SECCIÓN DE DERECHO (Capítulo III) fundamentando con leyes paraguayas positivas (Códigos sustantivos y procesales pertinentes) y doctrina aplicable: ${instrucciones}`;
      break;
    case 'petitorio':
      instruccionForense =
        `REDACTA EL PETITORIO JUDICIAL (Capítulo IV) con enumeración rigurosa de pretensiones procesales claras, cerrando con la fórmula de estilo "SERÁ JUSTICIA": ${instrucciones}`;
      break;
    case 'excepcion':
      instruccionForense =
        `REDACTA EL PLANTEO DE UNA EXCEPCIÓN PREVIA O DE FONDO (ej. prescripción, incompetencia, defecto legal, falta de acción) conforme al CPC o norma procesal aplicable: ${instrucciones}`;
      break;
    default:
      instruccionForense =
        textoSeleccionado
          ? `MODIFICA O COMPLEMENTA el siguiente fragmento judicial según estas instrucciones: "${instrucciones}"\n\nTexto original:\n"${textoSeleccionado}"`
          : `REDACTA un fragmento o escrito judicial formal según las siguientes instrucciones: "${instrucciones}"`;
  }

  const promptFinal =
    `${datosCausa}${jurisprudenciaCSJ}\n\n` +
    `INSTRUCCIÓN DE REDACCIÓN:\n${instruccionForense}\n\n` +
    `IMPORTANTE: Devuelve ÚNICAMENTE el texto redactado en formato listo para insertar en la hoja de trabajo judicial. No incluyas preámbulos como "Aquí tienes", ni despedidas. Solo el contenido forense.`;

  const system =
    'Eres Techapyrã IA, el asistente jurídico profesional y experto legal de SysJurídico, impulsado por el Motor de Sabiduría OtelaxWisdom.\n' +
    'Redactas escritos judiciales aplicando estrictamente el derecho paraguayo positivo y vigente bajo los más altos estándares procesales de la CSJ: precisión técnica, lenguaje procesal riguroso, citas normativas paraguayas exactas y vigentes.\n' +
    'Responde directamente con el texto judicial solicitado sin introducciones conversacionales ni preámbulos.';

  const textoGenerado = await generarRespuestaIA({ prompt: promptFinal, contexto: null, system });

  return {
    textoGenerado: textoGenerado || 'No se pudo generar la redacción solicitada con el motor de IA.',
    accion,
    expediente: expedienteData
      ? {
          id: expedienteData._id,
          caratula: expedienteData.caratula,
          juzgado: expedienteData.juzgado,
          cliente: expedienteData.cliente?.nombreCompleto,
        }
      : null,
  };
}

module.exports = { procesarConsultaLexPY, procesarAsistenteEditor, buscarEnBaseLocal };

