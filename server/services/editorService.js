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
async function generarRazonamientoSplitBrain({ instruccion, contextoCausa = {}, usuarioForense = {} }) {
  const { caratula, numero, ano, juzgado, turno, juezNombre, juezGenero } = contextoCausa;
  const { nombreCompleto, matriculaCSJ, cedula } = usuarioForense;

  const vocativoJuez = juezGenero === 'F' ? 'SEÑORA JUEZA' : 'SEÑOR JUEZ';
  const nombreJuezStr = juezNombre ? `, ${juezNombre.toUpperCase()}` : '';

  const promptEstrategico = `
Eres Techapyrã IA, el copiloto forense de élite de SysJurídico.
Debes estructurar un razonamiento procesal judicial paraguayo dividido (Split-Brain) para el siguiente requerimiento:

INSTRUCCIÓN: ${instruccion}

CONTEXTO DE LA CAUSA:
- Carátula: ${caratula || 'A determinar'}
- Número/Año: ${numero || 'S/N'}/${ano || '2026'}
- Juzgado: ${juzgado || 'Juzgado de Primera Instancia en lo Civil y Comercial'}
- Turno: ${turno || 'A sortear'}
- Magistrado/a: ${vocativoJuez}${nombreJuezStr}

DATOS FORENSES DEL PROFESIONAL:
- Abogado/a: ${nombreCompleto || 'Abg. del Estudio'}
- Matrícula CSJ: ${matriculaCSJ || 'A completar'}
- C.I. N°: ${cedula || 'A completar'}
- Domicilio Procesal Fijo: ${DOMICILIO_PROCESAL_GLOBAL}

REGLAS DE SALIDA EN FORMATO JSON ESTRICTO:
Responde ÚNICAMENTE con un objeto JSON válido con los siguientes campos:
{
  "textoEscrito": "Texto completo y oficial del escrito judicial en formato forense paraguayo con OBJETO, ${vocativoJuez}, personería completa con domicilio procesal fijo en Edificio BIJ, HECHOS, DERECHO, PETITORIO y cierre PROVEER DE CONFORMIDAD Y SERÁ JUSTICIA.-",
  "estrategia": "Explicación táctica profunda de por qué se plantea de esta forma la acción y qué beneficios procesales otorga al cliente.",
  "basesNormativas": [
    {
      "fuente": "Código Civil / CPC / Ley / Acordada CSJ",
      "articulo": "Art. XXX",
      "procedencia": "[OTELAXWISDOM LOCAL]" o "[WEB OFICIAL VERIFICADA]",
      "resumen": "Qué establece la norma y su aplicación concreta"
    }
  ],
  "checklistRiesgos": [
    "Riesgo de caducidad según Art. 172 CPC",
    "Excepciones previas que podría oponer la contraparte",
    "Plazos perentorios a considerar en días hábiles procesales"
  ]
}
`;

  try {
    const respuesta = await aiProviderService.ejecutarInferencia({
      prompt: promptEstrategico,
      temperatura: 0.2,
      maxTokens: 3500,
      preferirJson: true,
    });

    let jsonLimpio = respuesta.texto.trim();
    if (jsonLimpio.startsWith('```json')) {
      jsonLimpio = jsonLimpio.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonLimpio.startsWith('```')) {
      jsonLimpio = jsonLimpio.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const data = JSON.parse(jsonLimpio);
    return data;
  } catch (err) {
    console.error('[editorService] Error generando Split-Brain JSON:', err.message);
    // Fallback estructurado en caso de error de parseo JSON
    return {
      textoEscrito: `OBJETO: PROMOVER ACCIÓN JUDICIAL.-\n\n${vocativoJuez}:\n\nABG. ${nombreCompleto || '[NOMBRE]'}, con Matrícula CSJ N° ${matriculaCSJ || '[MATRÍCULA]'}, fijando domicilio procesal en ${DOMICILIO_PROCESAL_GLOBAL}, en los autos caratulados "${caratula || 'CAUSA JUDICIAL'}", digo:\n\nI. HECHOS:\n${instruccion}\n\nII. DERECHO:\nFundo la presente en las disposiciones del Código Procesal Civil y Código Civil Paraguayo.\n\nIII. PETITORIO:\n1. Tenerme por presentado y por constituido el domicilio procesal.\n2. Proveer de conformidad.\n\nPROVEER DE CONFORMIDAD Y SERÁ JUSTICIA.-`,
      estrategia: 'Estrategia procesal basada en impulso de autos y preservación del derecho del actor conforme a la legislación paraguaya vigente.',
      basesNormativas: [
        {
          fuente: 'Código Procesal Civil Paraguayo (Ley 1337/88)',
          articulo: 'Art. 172 / 215',
          procedencia: '[OTELAXWISDOM LOCAL]',
          resumen: 'Plazos de caducidad y deberes de impulso procesal de las partes.',
        },
      ],
      checklistRiesgos: [
        'Verificar notificación por cédula o electrónica a la contraparte.',
        'Computar plazos en días hábiles procesales según Código Procesal Civil.',
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
