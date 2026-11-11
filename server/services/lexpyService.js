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
    return { aprendizajes: [], baseLegal: [] };
  }

  // Detección de número de ley específica (ej: 1462, 6715, 213, 1183, 1626, 834)
  const numLeyMatch = q.match(/\b(?:ley\s*(?:n[º°]?\s*)?|n[º°]?\s*)(\d+)(?:\/(\d{2,4}))?\b/i);
  let baseLegal = [];

  const filtroVigencia = { estadoNormativo: { $nin: ['Derogada', 'Histórica', 'derogada', 'historica'] } };

  if (numLeyMatch) {
    const num = numLeyMatch[1];
    const regexLey = new RegExp(`\\b${num}\\b`, 'i');
    baseLegal = await BaseLegal.find({
      $or: [{ numeroLey: num }, { titulo: { $regex: regexLey } }],
      ...filtroVigencia,
    }).limit(2);
  }

  // Si no hubo match específico o no se encontraron, búsqueda por texto completo
  if (!baseLegal.length) {
    try {
      baseLegal = await BaseLegal.find(
        { $text: { $search: consulta }, ...filtroVigencia },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(3);
    } catch {
      // Fallback si no hay índice de texto activo
      baseLegal = await BaseLegal.find({
        ...filtroVigencia,
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

const SYSTEM_PROMPT_TECHAPYRA = `Eres Techapyrã IA, el asistente jurídico profesional y experto legal de SysJurídico. Tu objetivo es resolver dudas, redactar escritos judiciales, proponer estrategias procesales y brindar soluciones en el ámbito jurídico, fiscal y personal, aplicando estrictamente el derecho paraguayo.

### Identidad y Flujo de Consulta (Regla Estricta)
1. Cita de Fuente Principal: Debes fundamentar todas tus respuestas procesales y sustantivas en tu base de conocimiento local. En cada intervención, menciona de forma profesional que estás extrayendo la información de tu núcleo cognitivo. (Ejemplo: "Consultando el Motor de Sabiduría OtelaxWisdom...", o "Según el acervo normativo de OtelaxWisdom...").
2. Estrategia Local-First: Prioriza siempre las normas, leyes y jurisprudencias de la BACN y la CSJ integradas en tu sistema.
3. Fallback a Búsqueda Externa (Estilo Gemini): Si el usuario solicita información sobre una normativa, resolución o doctrina que excede tu base de datos local (por ejemplo, si solo posees los metadatos pero no el texto íntegro), indícalo transparentemente con la fórmula exacta: "Esta disposición específica no cuenta con texto íntegro en el catálogo local de OtelaxWisdom, por lo que procedo a integrar información de fuentes externas/web para responder...".
4. Tono y Estilo: Mantén un lenguaje neutro. Sé directo, técnico y conciso. No te desgloses más de lo necesario a menos que se solicite un escrito judicial completo o un análisis profundo.
5. Licenciamiento y Seguridad: Si generas estructura técnica, scripts o plantillas informáticas, aplica licencia MIT a nombre de OTELAX DEV de Giuliano Catella, usa comentarios técnicos breves y jamás expongas credenciales.

### Motor de Sabiduría Jurídica: OtelaxWisdom
Tu conocimiento se organiza en 7 Fueros Centrales:
1. 🏛️ Fuero Civil y Comercial: Código Civil (Ley Nº 1183/1985), Código Procesal Civil (Ley Nº 1337/1988).
2. ⚖️ Fuero Penal y Garantías Constitucionales: Código Penal (Ley Nº 1160/1997 y modif.), Código Procesal Penal (Ley Nº 1286/1998).
3. 💼 Fuero Laboral y Seguridad Social: Código del Trabajo (Ley Nº 213/1993), Código Procesal del Trabajo (Ley Nº 742/1961), Normativa IPS.
4. 👶 Fuero de la Niñez, Adolescencia y Familia: Código de la Niñez y la Adolescencia (Ley Nº 1680/2001 y modif.).
5. 📜 Fuero Contencioso Administrativo & Constitucional: Constitución Nacional (1992), Tribunal de Cuentas (Ley Nº 1462/1935), Procedimientos Administrativos (Ley Nº 6715/2021).
6. 📊 Fuero Tributario & Fiscal: Ley Nº 6380/2019 de Modernización y Simplificación del Sistema Tributario Nacional (IRE, IRP, IVA, ISC, IDU).
7. 🇵🇾 Instituciones Públicas: Ministerio Público (Ley Nº 1562/2000), Policía Nacional (Ley Nº 7338/2024; plazos de aprehensión 6h policial / 24h fiscal), Patrulla Caminera (Ley Nº 5016/2014; Tolerancia 0.00 mg/L), Poder Judicial (Ley Nº 879/1981), Defensa Pública (Ley Nº 4423/2011), DNIT, MTESS, IPS y Municipalidades (Ley Nº 3966/2010).

Aplica siempre el principio de Vigencia Estricta (derecho positivo vigente) y descarta normas derogadas. Si una norma fue derogada, adviértelo expresamente y cita la norma vigente que la sustituye.

### Corpus Normativo y Jurisprudencial (Base de Datos Local)
Tienes integrado un catálogo documental validado con 0 errores pendientes:
- 📚 Legislación Paraguaya (BACN): 7.133 fichas normativas organizadas en archivos Markdown con 3.720 relaciones detectadas (modificaciones y derogaciones). Texto íntegro en HTML para 2.836 fichas; para las otras 4.297 fichas posees metadatos y enlaces de descarga oficial. Las modificaciones detectadas son referencias, no un texto consolidado oficial ni certificación de vigencia.
- ⚖️ Jurisprudencia Oficial (CSJ): 72.375 fallos judiciales en Markdown por tipo y año (45.469 Acuerdos y Sentencias, 26.900 Autos Interlocutorios y 6 no especificados). 70.928 resoluciones incluyen texto íntegro extraído; 1.447 conservan metadatos y enlaces oficiales de descarga de la CSJ sin texto legible. Todos los documentos conservan su enlace oficial.`;

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
      '- 📚 **Legislación Paraguaya (BACN):** 7.133 fichas normativas y 3.720 relaciones entre normas (2.836 con texto íntegro en HTML; 4.297 con metadatos y enlaces oficiales; 32.370 artículos indexados en BD).\n' +
      '- ⚖️ **Jurisprudencia Oficial CSJ:** 72.375 fallos judiciales por tipo y año (45.469 Acuerdos y Sentencias, 26.900 Autos Interlocutorios; 70.928 con texto íntegro extraído y 1.447 con enlaces de descarga oficial).\n' +
      '- 🏛️ **7 Fueros Centrales:** Civil y Comercial, Penal y Garantías, Laboral y Seg. Social, Niñez y Familia, Contencioso Administrativo & Constitucional, Tributario & Fiscal e Instituciones Públicas.\n' +
      '- 📁 **Causas y Documentos:** Lectura procesal de piezas y expedientes del cliente en tiempo real.\n' +
      '- 🛡️ **Vigencia Estricta:** Aplicación rigurosa de derecho positivo paraguayo vigente descartando disposiciones derogadas.\n\n' +
      '¿Qué consulta procesal o escrito judicial deseas trabajar hoy?',
    fuente: 'ia_generativa',
  };
}

async function procesarConsultaTecnica({ pregunta, usuarioId, expedienteId, clienteId }) {
  const { aprendizajes, baseLegal } = await buscarEnBaseLocal(pregunta);
  const totalLocal = aprendizajes.length + baseLegal.length;

  let contexto = construirContexto({ aprendizajes, baseLegal });
  let fuenteRespuesta = totalLocal > 0 ? 'base_local' : null;
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
    requiereAvisoFallback = true;
    externa = await buscarEnFuentesExternas(pregunta);
    if (externa) {
      const bloqueExterno = `[FUENTE EXTERNA: ${externa.fuente}]${externa.urlConsultada ? ` (${externa.urlConsultada})` : ''}\n${externa.resultado}`;
      contexto = contexto ? `${contexto}\n---\n${bloqueExterno}` : bloqueExterno;
      fuenteRespuesta = externa.fuente === 'csj' ? 'externo_csj' : 'externo_baselegal';
    }
  }

  const promptFinal = requiereAvisoFallback && !baseLegal.some((b) => b.contenido && b.contenido.length > 200)
    ? `AVISO DE FLUJO: Esta consulta aborda materias o normas donde el catálogo local cuenta con metadatos/enlaces o requiere complementar con fuentes externas oficiales.\n\n${pregunta}`
    : pregunta;

  const respuestaIA = await generarRespuestaIA({
    prompt: promptFinal,
    contexto: contexto || null,
    system: SYSTEM_PROMPT_TECHAPYRA,
  });

  if (respuestaIA) {
    let respuestaFinal = respuestaIA;
    // Si la respuesta proviene de fallback externo y no incluye el aviso reglamentario, se incorpora de forma transparente
    if (requiereAvisoFallback && !baseLegal.length && !respuestaFinal.includes('no cuenta con texto íntegro en el catálogo local de OtelaxWisdom')) {
      respuestaFinal =
        '> ℹ️ *Esta disposición específica no cuenta con texto íntegro en el catálogo local de OtelaxWisdom, por lo que procedo a integrar información de fuentes externas/web para responder...*\n\n' +
        respuestaFinal;
    } else if (!respuestaFinal.toLowerCase().includes('otelaxwisdom')) {
      respuestaFinal = 'Consultando el Motor de Sabiduría OtelaxWisdom...\n\n' + respuestaFinal;
    }

    const nota = notaDeFuentes({ aprendizajes, baseLegal, externa });
    const respuesta = nota && !respuestaFinal.includes('Fuentes consultadas') ? respuestaFinal + nota : respuestaFinal;
    return { respuesta, fuente: fuenteRespuesta || 'ia_generativa' };
  }

  if (baseLegal.length || aprendizajes.length || contexto) {
    let salidaMarkdown = 'Según el acervo normativo de OtelaxWisdom:\n\n';
    if (baseLegal.length) {
      salidaMarkdown += baseLegal
        .map((b) => {
          const extracto = b.contenido
            ? b.contenido.slice(0, 600).trim() + (b.contenido.length > 600 ? '...' : '')
            : '(Sin texto íntegro extraído en el catálogo local; ficha oficial conservada con enlace de descarga oficial)';
          return (
            `### ${b.titulo}\n\n` +
            `- **Fuente Oficial:** ${b.fuente || 'Biblioteca y Archivo Central del Congreso Nacional (BACN)'}\n` +
            (b.url ? `- **Ficha Oficial:** [Ver en BACN](${b.url})\n` : '') +
            `- **Estado:** Vigente en la República del Paraguay\n\n` +
            `> ℹ️ *Extracto normativo referencial indexado en OtelaxWisdom:*\n\n` +
            `${extracto}\n`
          );
        })
        .join('\n---\n\n');
    } else {
      salidaMarkdown += (contexto || '').slice(0, 1500);
    }
    const nota = notaDeFuentes({ aprendizajes, baseLegal, externa });
    return {
      respuesta: salidaMarkdown + (nota || ''),
      fuente: fuenteRespuesta || 'base_local',
    };
  }

  return {
    respuesta:
      'Esta disposición específica no cuenta con texto íntegro en el catálogo local de OtelaxWisdom, y no se obtuvieron resultados concluyentes en las fuentes externas conectadas. ' +
      'Por favor verifica el número de ley, año o carátula de resolución judicial.',
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

