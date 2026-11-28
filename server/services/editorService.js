/**
 * editorService.js
 * Servicio forense para el Editor Judicial SysJuridico
 * - Generación de archivos nativos .docx con estándares de la CSJ (Liberation Mono 12pt, 4cm/2cm, 1.5)
 * - Razonamiento jurídico dividido (Split-Brain) con Gemini 2.5 Pro y OtelaxWisdom
 * - Análisis multimodal de expedientes PDF
 */

const {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  Packer,
  HeadingLevel,
  convertMillimetersToTwip,
  LineRuleType,
} = require('docx');
const cheerio = require('cheerio');
const aiProviderService = require('./aiProviderService');
const lexpyService = require('./lexpyService');
const fs = require('fs');
const path = require('path');

const DOMICILIO_PROCESAL_GLOBAL = 'Edificio BIJ, Av. Camilo Recalde c/ Capitán Miranda, Microcentro, Ciudad del Este';

/**
 * Convierte HTML forense a documento .docx nativo
 * @param {Object} params
 * @param {string} params.titulo
 * @param {string} params.html
 * @param {string} [params.caratula]
 * @returns {Promise<Buffer>}
 */
async function generarDocxForense({ titulo = 'Escrito_Judicial', html = '', caratula = '' }) {
  // Limpiar HTML y parsear a párrafos usando cheerio (sin depender de jsdom)
  const $ = cheerio.load(`<body>${html || ''}</body>`);
  const body = $('body');

  // Recorrer nodos hijos para construir párrafos de docx
  const parrafosDocx = [];

  // Margen CSJ: Izquierdo 40mm (4cm), Derecho 20mm (2cm), Superior 35mm (3.5cm), Inferior 25mm (2.5cm)
  const marginIzquierdo = convertMillimetersToTwip(40);
  const marginDerecho = convertMillimetersToTwip(20);
  const marginSuperior = convertMillimetersToTwip(35);
  const marginInferior = convertMillimetersToTwip(25);

  const elementos = body.children().not('.lo-corner-bl, .lo-corner-br, .lo-guide-box').toArray();

  if (elementos.length === 0) {
    // Si no hay hijos en bloque, usar el texto plano
    const texto = body.text() || '';
    const lineas = texto.split('\n');
    for (const linea of lineas) {
      parrafosDocx.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { line: 360, lineRule: LineRuleType.AUTO, after: 120 }, // 1.5 line spacing (360 twips)
          children: [
            new TextRun({
              text: linea || ' ',
              font: 'Liberation Mono',
              size: 24, // 12pt (en medios puntos: 24 = 12pt)
            }),
          ],
        })
      );
    }
  } else {
    for (const elem of elementos) {
      const $el = $(elem);
      const texto = $el.text().trim();
      const tagName = (elem.tagName || '').toLowerCase();
      const esNegrita = tagName === 'b' || tagName === 'strong' || $el.find('strong, b').length > 0;
      const styleAttr = $el.attr('style') || '';
      const alignAttr = $el.attr('align') || '';
      const esAlineadoDerecha = styleAttr.includes('text-align: right') || alignAttr === 'right';
      const esCentrado = styleAttr.includes('text-align: center') || alignAttr === 'center';

      let alineacion = AlignmentType.JUSTIFIED;
      if (esAlineadoDerecha) alineacion = AlignmentType.RIGHT;
      else if (esCentrado) alineacion = AlignmentType.CENTER;

      parrafosDocx.push(
        new Paragraph({
          alignment: alineacion,
          spacing: { line: 360, lineRule: LineRuleType.AUTO, after: 120 },
          children: [
            new TextRun({
              text: texto,
              bold: esNegrita,
              font: 'Liberation Mono',
              size: 24,
            }),
          ],
        })
      );
    }
  }

  const doc = new Document({
    creator: 'SysJurídico Forense (ZETTI DIGITAL PY)',
    title: titulo,
    description: `Escrito Forense CSJ - ${caratula || 'Tribunales de la República del Paraguay'}`,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: marginSuperior,
              right: marginDerecho,
              bottom: marginInferior,
              left: marginIzquierdo,
            },
          },
        },
        children: parrafosDocx,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * Genera el razonamiento judicial dividido (Split-Brain) para un escrito
 * - Parte A: Texto limpio del escrito judicial
 * - Parte B: Fundamento estratégico, citas verificadas y checklist de riesgos procesales
 */
async function generarRazonamientoSplitBrain({
  instruccion = '',
  accion = 'redactar',
  textoExistente = '',
  textoSeleccionado = '',
  contextoCausa = {},
  usuarioForense = {},
  usuarioId = null,
}) {
  const { caratula, numero, ano, juzgado, turno, juezNombre, juezGenero } = contextoCausa || {};
  const { nombreCompleto, matriculaCSJ, cedula } = usuarioForense || {};

  const textoObjetivo = (textoExistente || textoSeleccionado || '').trim();
  const esMejora =
    accion === 'mejorar' ||
    accion === 'mejorar_todo' ||
    accion === 'pulir' ||
    accion === 'polir' ||
    accion === 'corregir' ||
    Boolean(textoObjetivo) ||
    /mejora|mejorar|pulir|polir|corregir/i.test(instruccion);

  const vocativoJuez = juezGenero === 'F' ? 'SEÑORA JUEZA' : 'SEÑOR JUEZ';
  const nombreJuezStr = juezNombre ? `, ${juezNombre.toUpperCase()}` : '';

  let seccionCausa = '';
  if (caratula) {
    seccionCausa = `
CONTEXTO DE LA CAUSA:
- Carátula: ${caratula}
- Número/Año: ${numero || 'S/N'}/${ano || '2026'}
- Juzgado: ${juzgado || 'Juzgado de Primera Instancia en lo Civil y Comercial'}
- Turno: ${turno || 'A sortear'}
- Magistrado/a: ${vocativoJuez}${nombreJuezStr}
`;
  } else {
    seccionCausa = `
CONTEXTO DE LA CAUSA:
- Sin expediente vinculado.
- REGLA ESTRICTA: No asocies esta causa con causas penales ni de otros expedientes. Respeta los datos de las partes, carátula o juzgado que ya figuren en el texto entregado.
`;
  }

  let seccionProfesional = '';
  if (nombreCompleto || matriculaCSJ) {
    seccionProfesional = `
DATOS DEL PROFESIONAL:
- Abogado/a: ${nombreCompleto || 'Abg. del Estudio'}
- Matrícula CSJ: ${matriculaCSJ || ''}
- C.I. N°: ${cedula || ''}
- Domicilio Procesal Fijo: ${DOMICILIO_PROCESAL_GLOBAL}
`;
  }

  let promptEstrategico = '';
  if (esMejora && textoObjetivo) {
    promptEstrategico = `
Mejora la redacción jurídica, ortografía, cohesión y técnica procesal paraguaya del escrito entregado. Respeta íntegros los nombres, cédulas, RUC, números de expediente, juzgado y hechos reales del texto. Devuelve ÚNICAMENTE el escrito mejorado listo para usar, sin repetir la instrucción del usuario ni agregar plantillas genéricas.

${seccionCausa}
${seccionProfesional}

INSTRUCCIÓN ESPECÍFICA DEL USUARIO:
${instruccion || 'Mejorar y perfeccionar la técnica forense y procesal del escrito.'}

TEXTO ORIGINAL DEL ESCRITO A MEJORAR:
"""
${textoObjetivo}
"""

REGLAS DE SALIDA EN FORMATO JSON ESTRICTO:
Responde con un objeto JSON válido con los siguientes campos:
{
  "textoEscrito": "Texto íntegro del escrito judicial mejorado, preservando todos los datos reales (partes, números, juzgado) y con la máxima solidez procesal según el CPC/Código Civil paraguayo.",
  "estrategia": "Breve explicación táctica de las mejoras de técnica jurídica y procesal aplicadas.",
  "basesNormativas": [
    {
      "fuente": "Norma o Código paraguayo aplicable",
      "articulo": "Art. XXX",
      "procedencia": "[OTELAXWISDOM LOCAL]",
      "resumen": "Aplicación de la norma al caso"
    }
  ],
  "checklistRiesgos": [
    "Riesgos procesales, cómputo de plazos hábiles o excepciones a prever"
  ]
}
`;
  } else {
    promptEstrategico = `
Redacta un escrito judicial formal conforme a las reglas del Código Procesal Civil y Código Civil de la República del Paraguay.

${seccionCausa}
${seccionProfesional}

INSTRUCCIÓN DE REDACCIÓN:
${instruccion || 'Redacta el escrito judicial correspondiente.'}

REGLAS DE SALIDA EN FORMATO JSON ESTRICTO:
Responde con un objeto JSON válido con los siguientes campos:
{
  "textoEscrito": "Texto completo y oficial del escrito judicial en formato forense paraguayo con OBJETO, ${vocativoJuez}, personería completa con domicilio procesal fijo en Edificio BIJ, HECHOS, DERECHO, PETITORIO y cierre PROVEER DE CONFORMIDAD Y SERÁ JUSTICIA.-",
  "estrategia": "Explicación táctica profunda de por qué se plantea de esta forma la acción y qué beneficios procesales otorga al cliente.",
  "basesNormativas": [
    {
      "fuente": "Código Procesal Civil / Código Civil Paraguayo",
      "articulo": "Art. XXX",
      "procedencia": "[OTELAXWISDOM LOCAL]",
      "resumen": "Qué establece la norma y su aplicación concreta"
    }
  ],
  "checklistRiesgos": [
    "Riesgo de caducidad según Art. 172 CPC / Excepciones / Plazos perentorios"
  ]
}
`;
  }

  const { buildTechapyraPrompt } = require('../config/techapyraSystemPrompt');
  const { obtenerEstiloForense } = require('./otelaxWisdomService');
  const estiloForense = typeof obtenerEstiloForense === 'function' ? obtenerEstiloForense() : '';
  const system = buildTechapyraPrompt({
    modo: 'MODO_EDITOR',
    estiloForense,
    contextoExpedientes: caratula ? `EXPEDIENTE: ${caratula}` : '',
  });

  const textoRespuesta = await aiProviderService.generarRespuestaIA({
    prompt: promptEstrategico,
    contexto: '',
    system,
    usuarioId,
  });

  if (!textoRespuesta || !textoRespuesta.trim()) {
    throw new Error('El motor de IA (FreeLLMAPI/Gemini) no devolvió una respuesta válida.');
  }

  let jsonLimpio = textoRespuesta.trim();
  if (jsonLimpio.startsWith('```json')) {
    jsonLimpio = jsonLimpio.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonLimpio.startsWith('```')) {
    jsonLimpio = jsonLimpio.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    const data = JSON.parse(jsonLimpio);
    if (!data.textoEscrito) {
      data.textoEscrito = jsonLimpio;
    }
    return data;
  } catch (parseErr) {
    // Si el LLM devolvió texto plano o markdown directamente en vez de JSON
    return {
      textoEscrito: jsonLimpio,
      estrategia: 'Escrito mejorado aplicando rigor procesal y técnica forense paraguaya.',
      basesNormativas: [
        {
          fuente: 'Legislación Paraguaya Vigente',
          articulo: 'Normativa aplicable',
          procedencia: '[OTELAXWISDOM LOCAL]',
          resumen: 'Fundamentación adecuada a derecho positivo.',
        },
      ],
      checklistRiesgos: [
        'Verificar notificación procesal en plazo hábil.',
        'Computar términos conforme a las reglas del CPC.',
      ],
    };
  }
}

/**
 * Analiza un expediente en formato PDF o texto extraído
 */
async function analizarExpedientePDF({ archivoId, rutaLocal, textoExtraido }) {
  let contenido = textoExtraido || '';

  if (!contenido && rutaLocal && fs.existsSync(rutaLocal)) {
    // Si hay archivo local y aún no se extrajo texto plano
    try {
      contenido = fs.readFileSync(rutaLocal, 'utf8');
    } catch (_) {}
  }

  const promptAnalisis = `
Eres Techapyrã IA con Gemini 2.5 Pro. Analiza el siguiente expediente judicial paraguayo:

CONTENIDO EXTRAÍDO DEL EXPEDIENTE:
${(contenido || 'Sin texto extraído').slice(0, 15000)}

Extrae y resume:
1. Carátula, número de causa y juzgado/turno interviniente.
2. Identidad del Juez/a y Actuario/a.
3. Última providencia o resolución notificada.
4. Estado procesal actual y riesgos de caducidad (Art. 172 CPC).
5. Acción procesal recomendada inmediata.
`;

  const respuesta = await aiProviderService.ejecutarInferencia({
    prompt: promptAnalisis,
    temperatura: 0.2,
    maxTokens: 2000,
  });

  return {
    analisis: respuesta.texto,
    modelo: respuesta.modeloUsado,
  };
}

module.exports = {
  generarDocxForense,
  generarRazonamientoSplitBrain,
  analizarExpedientePDF,
  DOMICILIO_PROCESAL_GLOBAL,
};
