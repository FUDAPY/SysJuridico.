const MemoriaAgente = require('../models/MemoriaAgente');
const Expediente = require('../models/Expediente');
const Cliente = require('../models/Cliente');
const { generarRespuestaIA } = require('./aiProviderService');

/**
 * Servicio de Memoria Agéntica Constante (Agentic Long-Term Memory).
 * Inspirado en Obsidian: sintetiza hechos, normas y antecedentes en notas atómicas
 * con backlinks y metadatos estructurados para minimizar el consumo de tokens.
 */

// Expresiones regulares para capturar normas paraguayas comunes
const REGEX_NORMAS = [
  /Ley\s+(?:N[°ºo]?\s*)?(\d+[\/\d]*)/gi,
  /C[óo]digo\s+(?:Civil|Procesal\s+Civil|Laboral|Penal|Procesal\s+Penal|de\s+la\s+Ni[ñn]ez)/gi,
  /Art[íi]culo\s+(\d+)/gi,
  /Acordada\s+(?:N[°ºo]?\s*)?(\d+)/gi,
  /Constituci[óo]n\s+(?:Nacional|de\s+1992)/gi,
];

function extraerNormasDeTexto(texto) {
  const normas = new Set();
  if (!texto) return [];

  REGEX_NORMAS.forEach((regex) => {
    let match;
    while ((match = regex.exec(texto)) !== null) {
      normas.add(match[0].trim());
    }
  });

  return Array.from(normas).slice(0, 8);
}

/**
 * Recupera la memoria contextual comprimida relevante para la consulta actual.
 * Devuelve un resumen ultra-eficiente en tokens (< 250 tokens).
 */
async function recuperarMemoriaContextual({ usuarioId, expedienteId, clienteId, consulta }) {
  if (!usuarioId) return null;

  try {
    const filtros = [];

    if (expedienteId) {
      filtros.push({ expediente: expedienteId });
    }
    if (clienteId) {
      filtros.push({ cliente: clienteId });
    }

    // Búsqueda textual por temas similares
    if (consulta && consulta.length > 5) {
      filtros.push({
        usuario: usuarioId,
        $text: { $search: consulta },
      });
    }

    let memorias = [];
    if (filtros.length > 0) {
      memorias = await MemoriaAgente.find({ $or: filtros })
        .sort({ updatedAt: -1 })
        .limit(3)
        .lean();
    }

    if (!memorias.length) {
      // Fallback: últimas memorias del usuario
      memorias = await MemoriaAgente.find({ usuario: usuarioId })
        .sort({ updatedAt: -1 })
        .limit(2)
        .lean();
    }

    if (!memorias.length) return null;

    const bloques = memorias.map((m) => {
      const hechos = (m.hechosRelevantes || []).map((h) => `  * ${h}`).join('\n');
      const normas = (m.entidades?.normasCitadas || []).join(', ');
      const links = (m.backlinks || []).map((b) => `[[${b.etiqueta}]]`).join(' ');

      return `[MEMORIA PERSISTENTE - TEMA: ${m.tema}]\n` +
        `Resumen destilado: ${m.resumen}\n` +
        (hechos ? `Hechos acreditados:\n${hechos}\n` : '') +
        (normas ? `Normas vinculadas: ${normas}\n` : '') +
        (links ? `Nodos vinculados: ${links}\n` : '');
    });

    return bloques.join('\n---\n');
  } catch (error) {
    console.warn('[AgentMemory] Error recuperando memoria:', error.message);
    return null;
  }
}

/**
 * Destila y guarda la interacción en notas atómicas persistentes.
 * Ejecución en segundo plano para no demorar la respuesta del usuario.
 */
async function destilarYGuardarMemoria({ usuarioId, expedienteId, clienteId, pregunta, respuesta }) {
  if (!usuarioId || !pregunta || !respuesta) return;

  // Evitar destilar saludos o consultas triviales
  if (pregunta.trim().length < 15 || respuesta.trim().length < 30) return;

  try {
    // Extraer normas y referencias
    const normas = extraerNormasDeTexto(`${pregunta} ${respuesta}`);

    // Contexto de expediente si existe
    let expedienteDoc = null;
    if (expedienteId) {
      expedienteDoc = await Expediente.findById(expedienteId).lean();
    }

    let clienteDoc = null;
    if (clienteId) {
      clienteDoc = await Cliente.findById(clienteId).lean();
    }

    const promptDestilacion =
      `Sintetiza la siguiente interacción jurídica paraguaya en formato de memoria atómica para un asistente legal.\n\n` +
      `PREGUNTA: ${pregunta}\n` +
      `RESPUESTA: ${respuesta.slice(0, 1500)}\n\n` +
      `Responde EXCLUSIVAMENTE en formato JSON con la siguiente estructura (sin bloques markdown extras):\n` +
      `{\n` +
      `  "tema": "Título conciso del tema o causa",\n` +
      `  "resumen": "Resumen conciso en 1 o 2 oraciones (máximo 40 palabras)",\n` +
      `  "hechos": ["Hecho relevante 1", "Hecho relevante 2"],\n` +
      `  "pretension": "Pretensión o acción legal concreta si aplica",\n` +
      `  "juzgado": "Juzgado o fuero si se menciona"\n` +
      `}`;

    let datosDestilados = null;
    try {
      const respuestaIA = await generarRespuestaIA({
        prompt: promptDestilacion,
        contexto: null,
        system: 'Sos un sintetizador de memoria semántica legal para base de conocimiento tipo Obsidian. Generá JSON estricto.',
      });

      const jsonStr = (respuestaIA || '').replace(/```json/g, '').replace(/```/g, '').trim();
      datosDestilados = JSON.parse(jsonStr);
    } catch {
      // Fallback heurístico si la IA falla o da formato no válido
      datosDestilados = {
        tema: pregunta.slice(0, 50),
        resumen: respuesta.slice(0, 140) + '...',
        hechos: [pregunta.slice(0, 100)],
        pretension: '',
        juzgado: expedienteDoc?.juzgado || '',
      };
    }

    const backlinks = [];
    if (expedienteDoc) {
      backlinks.push({
        nodoId: String(expedienteDoc._id),
        tipo: 'expediente',
        etiqueta: `Exp. ${expedienteDoc.numero || expedienteDoc.caratula?.slice(0, 30)}`,
      });
    }
    if (clienteDoc) {
      backlinks.push({
        nodoId: String(clienteDoc._id),
        tipo: 'cliente',
        etiqueta: `${clienteDoc.nombre} ${clienteDoc.apellido || ''}`.trim(),
      });
    }
    normas.forEach((norma) => {
      backlinks.push({
        nodoId: `norma_${norma.replace(/\s+/g, '_')}`,
        tipo: 'ley',
        etiqueta: norma,
      });
    });

    const tokensAproximados = Math.round((pregunta.length + respuesta.length) / 4);

    // Buscar si ya existe una memoria activa sobre este tema y expediente para actualizarla
    const filtroExistente = {
      usuario: usuarioId,
      ...(expedienteId ? { expediente: expedienteId } : { tema: datosDestilados.tema }),
    };

    let memoria = await MemoriaAgente.findOne(filtroExistente);
    if (memoria) {
      memoria.resumen = datosDestilados.resumen || memoria.resumen;
      memoria.hechosRelevantes = Array.from(new Set([...(memoria.hechosRelevantes || []), ...(datosDestilados.hechos || [])])).slice(-6);
      memoria.entidades = {
        ...memoria.entidades,
        normasCitadas: Array.from(new Set([...(memoria.entidades?.normasCitadas || []), ...normas])),
        juzgado: datosDestilados.juzgado || memoria.entidades?.juzgado,
        pretension: datosDestilados.pretension || memoria.entidades?.pretension,
      };
      memoria.backlinks = Array.from(new Set([...memoria.backlinks, ...backlinks]));
      memoria.tokensAproximados += tokensAproximados;
      await memoria.save();
    } else {
      await MemoriaAgente.create({
        usuario: usuarioId,
        expediente: expedienteId || null,
        cliente: clienteId || null,
        tema: datosDestilados.tema || pregunta.slice(0, 40),
        resumen: datosDestilados.resumen || 'Interacción jurídica registrada.',
        hechosRelevantes: datosDestilados.hechos || [],
        entidades: {
          partes: clienteDoc ? [`${clienteDoc.nombre} ${clienteDoc.apellido || ''}`.trim()] : [],
          juzgado: datosDestilados.juzgado || expedienteDoc?.juzgado || '',
          pretension: datosDestilados.pretension || '',
          normasCitadas: normas,
        },
        backlinks,
        tokensAproximados,
      });
    }
  } catch (error) {
    console.warn('[AgentMemory] Error guardando memoria:', error.message);
  }
}

/**
 * Obtiene todas las memorias del usuario en formato de nodos y aristas (Obsidian Graph).
 */
async function obtenerRedDeConocimiento({ usuarioId }) {
  const memorias = await MemoriaAgente.find({ usuario: usuarioId }).lean();
  const expedientes = await Expediente.find({}).select('caratula numero juzgado estado cliente').lean();
  const clientes = await Cliente.find({}).select('nombre apellido ci ruc').lean();

  const nodosMap = new Map();
  const enlaces = [];

  // Agregar clientes
  clientes.forEach((c) => {
    const id = `cliente_${c._id}`;
    nodosMap.set(id, {
      id,
      tipo: 'cliente',
      etiqueta: `${c.nombre} ${c.apellido || ''}`.trim(),
      detalle: `CI/RUC: ${c.ci || c.ruc || 'S/D'}`,
      peso: 3,
    });
  });

  // Agregar expedientes
  expedientes.forEach((e) => {
    const id = `exp_${e._id}`;
    nodosMap.set(id, {
      id,
      tipo: 'expediente',
      etiqueta: e.caratula ? e.caratula.slice(0, 40) : `Exp. ${e.numero}`,
      detalle: `Juzgado: ${e.juzgado || 'S/D'} | Estado: ${e.estado || 'activo'}`,
      peso: 5,
    });

    if (e.cliente) {
      const clienteId = `cliente_${e.cliente}`;
      if (nodosMap.has(clienteId)) {
        enlaces.push({
          source: clienteId,
          target: id,
          relacion: 'titular_de',
        });
      }
    }
  });

  // Agregar memorias y leyes
  memorias.forEach((m) => {
    const id = `memoria_${m._id}`;
    nodosMap.set(id, {
      id,
      tipo: 'concepto',
      etiqueta: m.tema,
      detalle: m.resumen,
      peso: 4,
    });

    if (m.expediente) {
      enlaces.push({
        source: id,
        target: `exp_${m.expediente}`,
        relacion: 'antecedente_de',
      });
    }

    if (m.cliente) {
      enlaces.push({
        source: id,
        target: `cliente_${m.cliente}`,
        relacion: 'asesoria_a',
      });
    }

    // Normas citadas
    (m.entidades?.normasCitadas || []).forEach((norma) => {
      const normaId = `norma_${norma.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      if (!nodosMap.has(normaId)) {
        nodosMap.set(normaId, {
          id: normaId,
          tipo: 'ley',
          etiqueta: norma,
          detalle: 'Legislación Paraguaya citada en la causa o consulta',
          peso: 4,
        });
      }
      enlaces.push({
        source: id,
        target: normaId,
        relacion: 'fundamentada_en',
      });
    });
  });

  return {
    nodos: Array.from(nodosMap.values()),
    enlaces,
    estadisticas: {
      totalNodos: nodosMap.size,
      totalEnlaces: enlaces.length,
      totalMemorias: memorias.length,
    },
  };
}

module.exports = {
  recuperarMemoriaContextual,
  destilarYGuardarMemoria,
  obtenerRedDeConocimiento,
  extraerNormasDeTexto,
};
