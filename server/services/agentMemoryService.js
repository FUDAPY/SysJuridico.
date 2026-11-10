const MemoriaAgente = require('../models/MemoriaAgente');
const Expediente = require('../models/Expediente');
const Cliente = require('../models/Cliente');
const BaseLegal = require('../models/BaseLegal');
const AprendizajeSistema = require('../models/AprendizajeSistema');
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
  const mongoose = require('mongoose');
  if (!usuarioId || !mongoose.Types.ObjectId.isValid(usuarioId)) return null;

  try {
    const filtros = [];

    if (expedienteId && mongoose.Types.ObjectId.isValid(expedienteId)) {
      filtros.push({ expediente: expedienteId });
    }
    if (clienteId && mongoose.Types.ObjectId.isValid(clienteId)) {
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
 * Obtiene todas las leyes, enseñanzas del RAG, causas y memorias en formato de nodos y aristas (Obsidian Graph).
 */
async function obtenerRedDeConocimiento({ usuarioId }) {
  const [memorias, expedientes, clientes, baseLegal, aprendizajes] = await Promise.all([
    MemoriaAgente.find(usuarioId ? { usuario: usuarioId } : {}).lean(),
    Expediente.find({}).select('caratula numero ano juzgado estado cliente materia fuero').lean(),
    Cliente.find({}).select('nombreCompleto cedula telefono').lean(),
    BaseLegal.find({}).select('titulo url fuente contenido').lean(),
    AprendizajeSistema.find({}).select('pregunta respuesta origen validado').lean(),
  ]);

  const nodosMap = new Map();
  const enlaces = [];

  // 1. Agregar Base Legal (Leyes, Códigos, Decretos, Acordadas CSJ)
  baseLegal.forEach((b) => {
    const id = `ley_${b._id}`;
    let tipo = 'ley';
    const tituloLower = (b.titulo || '').toLowerCase();
    if (tituloLower.includes('decreto')) tipo = 'decreto';
    else if (tituloLower.includes('acordada')) tipo = 'acordada';
    else if (tituloLower.includes('constituc')) tipo = 'constitucion';
    else if (tituloLower.includes('código') || tituloLower.includes('codigo')) tipo = 'codigo';

    nodosMap.set(id, {
      id,
      tipo,
      etiqueta: b.titulo || 'Norma Paraguaya',
      detalle: (b.contenido || '').slice(0, 240) + '...',
      url: b.url || '',
      fuente: b.fuente || 'BACN / CSJ',
      peso: tipo === 'constitucion' || tipo === 'codigo' ? 8 : 6,
    });
  });

  // 2. Agregar Enseñanzas ya guardadas en el RAG (AprendizajeSistema)
  aprendizajes.forEach((a) => {
    const id = `ensenanza_${a._id}`;
    nodosMap.set(id, {
      id,
      tipo: 'ensenanza',
      etiqueta: a.pregunta ? a.pregunta.slice(0, 48) : 'Enseñanza RAG',
      detalle: a.respuesta ? a.respuesta.slice(0, 220) + '...' : '',
      origen: a.origen || 'RAG Local',
      validado: a.validado,
      peso: 5,
    });

    // Enlace semántico: si la enseñanza cita alguna ley, creamos arista
    const textoCompleto = `${a.pregunta} ${a.respuesta}`.toLowerCase();
    baseLegal.forEach((b) => {
      const numMatch = (b.titulo || '').match(/\b\d+\b/);
      if (numMatch && textoCompleto.includes(numMatch[0])) {
        enlaces.push({
          source: id,
          target: `ley_${b._id}`,
          relacion: 'interpreta_norma',
        });
      } else if (b.titulo && textoCompleto.includes(b.titulo.toLowerCase().slice(0, 20))) {
        enlaces.push({
          source: id,
          target: `ley_${b._id}`,
          relacion: 'fundamentada_en',
        });
      }
    });
  });

  // 3. Agregar Clientes
  clientes.forEach((c) => {
    const id = `cliente_${c._id}`;
    nodosMap.set(id, {
      id,
      tipo: 'cliente',
      etiqueta: c.nombreCompleto || 'Cliente Titular',
      detalle: `C.I.: ${c.cedula || 'S/D'} | Tel: ${c.telefono || 'S/D'}`,
      peso: 4,
    });
  });

  // 4. Agregar Expedientes / Causas Judiciales
  expedientes.forEach((e) => {
    const id = `exp_${e._id}`;
    nodosMap.set(id, {
      id,
      tipo: 'expediente',
      etiqueta: e.caratula ? (e.caratula.length > 36 ? e.caratula.slice(0, 36) + '...' : e.caratula) : `Causa ${e.numero}`,
      detalle: `Juzgado: ${e.juzgado || 'S/D'} | Fuero: ${e.materia || e.fuero || 'Civil'} | Estado: ${e.estado || 'activo'}`,
      peso: 6,
    });

    // Enlace con cliente titular
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

    // Enlace con normativa según materia
    const materiaLower = (e.materia || e.fuero || '').toLowerCase();
    baseLegal.forEach((b) => {
      const bLower = (b.titulo || '').toLowerCase();
      if (
        (materiaLower.includes('laboral') && bLower.includes('laboral')) ||
        (materiaLower.includes('civil') && bLower.includes('civil')) ||
        (materiaLower.includes('penal') && bLower.includes('penal')) ||
        (materiaLower.includes('administrativo') && bLower.includes('administrativo'))
      ) {
        enlaces.push({
          source: id,
          target: `ley_${b._id}`,
          relacion: 'materia_regulada',
        });
      }
    });
  });

  // 5. Agregar Memorias Agénticas del Usuario
  memorias.forEach((m) => {
    const id = `memoria_${m._id}`;
    nodosMap.set(id, {
      id,
      tipo: 'memoria',
      etiqueta: m.tema || 'Memoria Legal',
      detalle: m.resumen,
      peso: 4,
    });

    if (m.expediente && nodosMap.has(`exp_${m.expediente}`)) {
      enlaces.push({
        source: id,
        target: `exp_${m.expediente}`,
        relacion: 'antecedente_de',
      });
    }

    if (m.cliente && nodosMap.has(`cliente_${m.cliente}`)) {
      enlaces.push({
        source: id,
        target: `cliente_${m.cliente}`,
        relacion: 'asesoria_a',
      });
    }

    // Normas citadas en la memoria
    (m.entidades?.normasCitadas || []).forEach((norma) => {
      const normaLower = norma.toLowerCase();
      baseLegal.forEach((b) => {
        if ((b.titulo || '').toLowerCase().includes(normaLower.slice(0, 15))) {
          enlaces.push({
            source: id,
            target: `ley_${b._id}`,
            relacion: 'cita_norma',
          });
        }
      });
    });
  });

  return {
    nodos: Array.from(nodosMap.values()),
    enlaces,
    estadisticas: {
      totalNodos: nodosMap.size,
      totalEnlaces: enlaces.length,
      leyes: baseLegal.length,
      ensenanzas: aprendizajes.length,
      expedientes: expedientes.length,
      clientes: clientes.length,
      memorias: memorias.length,
    },
  };
}

module.exports = {
  recuperarMemoriaContextual,
  destilarYGuardarMemoria,
  obtenerRedDeConocimiento,
  extraerNormasDeTexto,
};
