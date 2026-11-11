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
async function obtenerRedDeConocimiento({ usuarioId } = {}) {
  const [memorias, expedientes, clientes, aprendizajes, totalLeyesEnBD, baseLegalRaw] = await Promise.all([
    MemoriaAgente.find(usuarioId ? { usuario: usuarioId } : {}).lean(),
    Expediente.find({}).select('caratula numero ano juzgado estado cliente materia fuero').lean(),
    Cliente.find({}).select('nombreCompleto cedula telefono').lean(),
    AprendizajeSistema.find({}).select('pregunta respuesta origen validado tags').lean(),
    BaseLegal.countDocuments({ estadoNormativo: { $nin: ['Derogada', 'Histórica', 'derogada', 'historica'] } }),
    // Núcleo estructural de la Red de Conocimiento: Códigos, Instituciones, Constitución y Leyes Marco
    BaseLegal.find({
      estadoNormativo: { $nin: ['Derogada', 'Histórica', 'derogada', 'historica'] },
      $or: [
        { categoria: 'codigo' },
        { fuero: { $in: ['Constitucional', 'Organización Judicial'] } },
        {
          numeroLey: {
            $in: [
              '1183', '1337', '1160', '1286', '213', '742', '1680', '1462', '6715',
              '6380', '1562', '7338', '5016', '1652', '879', '4423', '7143', '5115', '3966', '7704'
            ],
          },
        },
      ],
    })
      .select('titulo url fuente contenido fuero estadoNormativo numeroLey tags')
      .lean(),
  ]);

  const nodosMap = new Map();
  const enlaces = [];

  // =========================================================================
  // 1. CREACIÓN DE HUBS TEMÁTICOS FORENSES (OtelaxWisdom - Centros de Gravedad)
  // =========================================================================
  const HUBS_TEMATICOS = [
    {
      id: 'hub_civil',
      fuero: 'Civil y Comercial',
      etiqueta: '🏛️ Fuero Civil y Comercial',
      detalle: 'Código Civil (Ley 1183), Código Procesal Civil (Ley 1337), obligaciones, contratos, sucesiones, derechos reales y juicios ejecutivos.',
      tipo: 'hub',
      peso: 14,
    },
    {
      id: 'hub_penal',
      fuero: 'Penal',
      etiqueta: '⚖️ Fuero Penal y Garantías',
      detalle: 'Código Penal (Ley 1160), Código Procesal Penal (Ley 1286), garantías constitucionales, tipos penales y debido proceso.',
      tipo: 'hub',
      peso: 14,
    },
    {
      id: 'hub_laboral',
      fuero: 'Laboral',
      etiqueta: '💼 Fuero Laboral y Seg. Social',
      detalle: 'Código Laboral (Ley 213/93), Código Procesal Laboral (Ley 742/61), estabilidad especial, despidos, indemnizaciones y seguridad social.',
      tipo: 'hub',
      peso: 14,
    },
    {
      id: 'hub_ninez',
      fuero: 'Niñez y Adolescencia',
      etiqueta: '👶 Niñez, Adolescencia y Familia',
      detalle: 'Código de la Niñez y la Adolescencia (Ley 1680/01), prestación de alimentos, régimen de relacionamiento, patria potestad y tutela.',
      tipo: 'hub',
      peso: 14,
    },
    {
      id: 'hub_administrativo',
      fuero: 'Contencioso Administrativo',
      etiqueta: '📜 Contencioso Administrativo & Constitucional',
      detalle: 'Constitución Nacional 1992, Procedimiento Contencioso Administrativo (Ley 1462/35), Procedimientos Administrativos (Ley 6715/21).',
      tipo: 'hub',
      peso: 14,
    },
    {
      id: 'hub_tributario',
      fuero: 'Tributario',
      etiqueta: '📊 Fuero Tributario & Fiscal',
      detalle: 'Ley 6380/2019 de Modernización Tributaria, IRE, IRP, IVA, prescripción de obligaciones fiscales (5 años) y régimen impositivo.',
      tipo: 'hub',
      peso: 14,
    },
    {
      id: 'hub_instituciones',
      fuero: 'Organización Judicial',
      etiqueta: '🇵🇾 Instituciones Públicas del Paraguay',
      detalle: 'Competencias, leyes orgánicas y atribuciones: Ministerio Público, Policía Nacional, Patrulla Caminera, CSJ, Min. Justicia, DNIT, IPS.',
      tipo: 'hub',
      peso: 14,
    },
  ];

  HUBS_TEMATICOS.forEach((hub) => {
    nodosMap.set(hub.id, hub);
  });

  // La Constitución Nacional (1992) se conecta como norma suprema a todos los hubs
  const idConstitucion = 'ley_constitucion_1992';

  // =========================================================================
  // 2. AGREGAR BASE LEGAL (Leyes, Códigos, Decretos, Acordadas e Instituciones)
  // =========================================================================
  const mapLeyCodigos = {}; // Para interconectar sustantivo con procesal

  baseLegalRaw.forEach((b) => {
    const id = `ley_${b._id}`;
    let tipo = 'ley';
    const tituloLower = (b.titulo || '').toLowerCase();
    const tagsLower = (b.tags || []).join(' ').toLowerCase();

    // Detección de Instituciones Públicas del Paraguay
    const esInstitucion =
      tituloLower.includes('ministerio público') ||
      tituloLower.includes('fiscalía') ||
      tituloLower.includes('policía nacional') ||
      tituloLower.includes('patrulla caminera') ||
      tituloLower.includes('ministerio de justicia') ||
      tituloLower.includes('corte suprema') ||
      tituloLower.includes('poder judicial') ||
      tituloLower.includes('defensa pública') ||
      tituloLower.includes('dnit') ||
      tituloLower.includes('mtess') ||
      tituloLower.includes('ips') ||
      tituloLower.includes('municipalidad') ||
      tituloLower.includes('pmt') ||
      b.fuero === 'Organización Judicial';

    if (esInstitucion) tipo = 'institucion';
    else if (tituloLower.includes('constituc')) tipo = 'constitucion';
    else if (tituloLower.includes('código') || tituloLower.includes('codigo')) tipo = 'codigo';
    else if (tituloLower.includes('acordada')) tipo = 'acordada';
    else if (tituloLower.includes('decreto')) tipo = 'decreto';

    nodosMap.set(id, {
      id,
      tipo,
      etiqueta: b.titulo || 'Norma Paraguaya',
      detalle: b.contenido || '',
      contenido: b.contenido || '',
      url: b.url || '',
      fuente: b.fuente || 'BACN / CSJ',
      fuero: b.fuero || 'General',
      estadoNormativo: b.estadoNormativo || 'Vigente',
      numeroLey: b.numeroLey || '',
      tags: b.tags || [],
      peso: tipo === 'constitucion' ? 10 : tipo === 'codigo' ? 9 : tipo === 'institucion' ? 8 : 6,
    });

    // Registrar códigos para vínculos bilaterales sustantivo <-> adjetivo
    if (b.numeroLey === '1183') mapLeyCodigos['CC'] = id;
    if (b.numeroLey === '1337') mapLeyCodigos['CPC'] = id;
    if (b.numeroLey === '1160') mapLeyCodigos['CP'] = id;
    if (b.numeroLey === '1286') mapLeyCodigos['CPP'] = id;
    if (b.numeroLey === '213') mapLeyCodigos['CL'] = id;
    if (b.numeroLey === '742') mapLeyCodigos['CPL'] = id;
    if (b.numeroLey === '1462') mapLeyCodigos['L1462'] = id;
    if (b.numeroLey === '6715') mapLeyCodigos['L6715'] = id;
    if (tipo === 'constitucion') mapLeyCodigos['CN'] = id;

    // Enlace directo al Hub de su fuero
    const fuero = b.fuero;
    if (fuero === 'Civil y Comercial') {
      enlaces.push({ source: id, target: 'hub_civil', relacion: 'rama_derecho' });
    } else if (fuero === 'Penal') {
      enlaces.push({ source: id, target: 'hub_penal', relacion: 'rama_derecho' });
    } else if (fuero === 'Laboral') {
      enlaces.push({ source: id, target: 'hub_laboral', relacion: 'rama_derecho' });
    } else if (fuero === 'Niñez y Adolescencia') {
      enlaces.push({ source: id, target: 'hub_ninez', relacion: 'rama_derecho' });
    } else if (fuero === 'Contencioso Administrativo' || fuero === 'Constitucional') {
      enlaces.push({ source: id, target: 'hub_administrativo', relacion: 'rama_derecho' });
    } else if (fuero === 'Tributario') {
      enlaces.push({ source: id, target: 'hub_tributario', relacion: 'rama_derecho' });
    }

    // Si es institución pública, se vincula al Hub de Instituciones Y a sus fueros operativos
    if (tipo === 'institucion') {
      enlaces.push({ source: id, target: 'hub_instituciones', relacion: 'organo_estatal' });

      if (tagsLower.includes('accion penal') || tagsLower.includes('policia') || tagsLower.includes('fiscalia')) {
        enlaces.push({ source: id, target: 'hub_penal', relacion: 'organo_investigacion' });
      }
      if (tagsLower.includes('alcotest') || tagsLower.includes('caminera')) {
        enlaces.push({ source: id, target: 'hub_administrativo', relacion: 'policia_vial' });
        enlaces.push({ source: id, target: 'hub_penal', relacion: 'delito_art217' });
      }
      if (tagsLower.includes('dnit') || tagsLower.includes('tribut')) {
        enlaces.push({ source: id, target: 'hub_tributario', relacion: 'autoridad_tributaria' });
      }
      if (tagsLower.includes('mtess') || tagsLower.includes('ips') || tagsLower.includes('laboral')) {
        enlaces.push({ source: id, target: 'hub_laboral', relacion: 'autoridad_laboral' });
      }
      if (tagsLower.includes('poder judicial') || tagsLower.includes('corte suprema') || tagsLower.includes('registros')) {
        enlaces.push({ source: id, target: 'hub_civil', relacion: 'jurisdiccion_civil' });
        enlaces.push({ source: id, target: 'hub_penal', relacion: 'jurisdiccion_penal' });
      }
    }
  });

  // Interconexión estructural de Códigos Procesales y Sustantivos
  if (mapLeyCodigos['CC'] && mapLeyCodigos['CPC']) {
    enlaces.push({ source: mapLeyCodigos['CPC'], target: mapLeyCodigos['CC'], relacion: 'procedimiento_aplicable' });
  }
  if (mapLeyCodigos['CP'] && mapLeyCodigos['CPP']) {
    enlaces.push({ source: mapLeyCodigos['CPP'], target: mapLeyCodigos['CP'], relacion: 'garantias_y_enjuiciamiento' });
  }
  if (mapLeyCodigos['CL'] && mapLeyCodigos['CPL']) {
    enlaces.push({ source: mapLeyCodigos['CPL'], target: mapLeyCodigos['CL'], relacion: 'rito_procesal_laboral' });
  }
  if (mapLeyCodigos['L6715'] && mapLeyCodigos['L1462']) {
    enlaces.push({ source: mapLeyCodigos['L6715'], target: mapLeyCodigos['L1462'], relacion: 'agotamiento_via_administrativa' });
  }
  if (mapLeyCodigos['CN']) {
    HUBS_TEMATICOS.forEach((hub) => {
      enlaces.push({ source: mapLeyCodigos['CN'], target: hub.id, relacion: 'supremacia_constitucional' });
    });
  }

  // =========================================================================
  // 3. ENSEÑANZAS Y JURISPRUDENCIA DOCTRINARIA RAG (AprendizajeSistema)
  // =========================================================================
  aprendizajes.forEach((a) => {
    const id = `ensenanza_${a._id}`;
    nodosMap.set(id, {
      id,
      tipo: 'ensenanza',
      etiqueta: a.pregunta || 'Criterio Doctrinal RAG',
      detalle: a.respuesta || '',
      contenido: a.respuesta || '',
      pregunta: a.pregunta || '',
      origen: a.origen || 'RAG Local',
      validado: a.validado,
      peso: 6,
    });

    const textoCompleto = `${a.pregunta} ${a.respuesta}`.toLowerCase();

    // Vincular enseñanza con su Hub temático
    if (textoCompleto.includes('caducidad') || textoCompleto.includes('cheque') || textoCompleto.includes('usucapion') || textoCompleto.includes('inforconf')) {
      enlaces.push({ source: id, target: 'hub_civil', relacion: 'doctrina_civil' });
    } else if (textoCompleto.includes('imputacion') || textoCompleto.includes('penal') || textoCompleto.includes('flagrancia') || textoCompleto.includes('alcotest')) {
      enlaces.push({ source: id, target: 'hub_penal', relacion: 'doctrina_penal' });
    } else if (textoCompleto.includes('despido') || textoCompleto.includes('laboral') || textoCompleto.includes('ips') || textoCompleto.includes('estabilidad')) {
      enlaces.push({ source: id, target: 'hub_laboral', relacion: 'doctrina_laboral' });
    } else if (textoCompleto.includes('alimento') || textoCompleto.includes('niñez') || textoCompleto.includes('adolescencia')) {
      enlaces.push({ source: id, target: 'hub_ninez', relacion: 'doctrina_ninez' });
    } else if (textoCompleto.includes('administrativo') || textoCompleto.includes('tribunal de cuentas') || textoCompleto.includes('recurso')) {
      enlaces.push({ source: id, target: 'hub_administrativo', relacion: 'doctrina_administrativa' });
    } else if (textoCompleto.includes('tribut') || textoCompleto.includes('ire') || textoCompleto.includes('iva') || textoCompleto.includes('irp')) {
      enlaces.push({ source: id, target: 'hub_tributario', relacion: 'doctrina_tributaria' });
    }

    // Vincular con normas que mencione expresamente
    baseLegalRaw.forEach((b) => {
      if (b.numeroLey && (textoCompleto.includes(b.numeroLey) || textoCompleto.includes(`ley ${b.numeroLey}`) || textoCompleto.includes(`ley nº ${b.numeroLey}`))) {
        enlaces.push({ source: id, target: `ley_${b._id}`, relacion: 'interpreta_norma' });
      }
    });
  });

  // =========================================================================
  // 4. CLIENTES DEL ESTUDIO
  // =========================================================================
  clientes.forEach((c) => {
    const id = `cliente_${c._id}`;
    nodosMap.set(id, {
      id,
      tipo: 'cliente',
      etiqueta: c.nombreCompleto || 'Cliente Titular',
      detalle: `C.I.: ${c.cedula || 'S/D'} | Tel: ${c.telefono || 'S/D'}`,
      peso: 5,
    });
  });

  // =========================================================================
  // 5. EXPEDIENTES Y CAUSAS JUDICIALES (Conexión temática rigurosa)
  // =========================================================================
  expedientes.forEach((e) => {
    const id = `exp_${e._id}`;
    nodosMap.set(id, {
      id,
      tipo: 'expediente',
      etiqueta: e.caratula ? (e.caratula.length > 38 ? e.caratula.slice(0, 38) + '...' : e.caratula) : `Causa ${e.numero}`,
      detalle: `Juzgado: ${e.juzgado || 'S/D'} | Fuero: ${e.materia || e.fuero || 'Civil'} | Estado: ${e.estado || 'activo'}`,
      peso: 7,
    });

    // Enlace con cliente titular
    if (e.cliente) {
      const clienteId = `cliente_${e.cliente}`;
      if (nodosMap.has(clienteId)) {
        enlaces.push({ source: clienteId, target: id, relacion: 'titular_de' });
      }
    }

    // Identificación del fuero material del expediente
    const materiaLower = `${e.materia || ''} ${e.fuero || ''} ${e.caratula || ''} ${e.juzgado || ''}`.toLowerCase();

    if (materiaLower.includes('penal') || materiaLower.includes('estafa') || materiaLower.includes('apropiac') || materiaLower.includes('violencia') || materiaLower.includes('homicidio')) {
      enlaces.push({ source: id, target: 'hub_penal', relacion: 'competencia_penal' });
      if (mapLeyCodigos['CP']) enlaces.push({ source: id, target: mapLeyCodigos['CP'], relacion: 'tipificacion_penal' });
      if (mapLeyCodigos['CPP']) enlaces.push({ source: id, target: mapLeyCodigos['CPP'], relacion: 'reglas_procedimiento' });
    } else if (materiaLower.includes('laboral') || materiaLower.includes('despido') || materiaLower.includes('indemniz') || materiaLower.includes('salario')) {
      enlaces.push({ source: id, target: 'hub_laboral', relacion: 'competencia_laboral' });
      if (mapLeyCodigos['CL']) enlaces.push({ source: id, target: mapLeyCodigos['CL'], relacion: 'derecho_sustantivo_laboral' });
      if (mapLeyCodigos['CPL']) enlaces.push({ source: id, target: mapLeyCodigos['CPL'], relacion: 'procedimiento_laboral' });
    } else if (materiaLower.includes('alimento') || materiaLower.includes('niñez') || materiaLower.includes('adolescen') || materiaLower.includes('filiac') || materiaLower.includes('guarda')) {
      enlaces.push({ source: id, target: 'hub_ninez', relacion: 'competencia_ninez' });
      baseLegalRaw.forEach((b) => {
        if (b.numeroLey === '1680') enlaces.push({ source: id, target: `ley_${b._id}`, relacion: 'interes_superior_nino' });
      });
    } else if (materiaLower.includes('administrativ') || materiaLower.includes('tribunal de cuentas') || materiaLower.includes('amparo') || materiaLower.includes('inconstituc')) {
      enlaces.push({ source: id, target: 'hub_administrativo', relacion: 'competencia_contenciosa' });
      if (mapLeyCodigos['L1462']) enlaces.push({ source: id, target: mapLeyCodigos['L1462'], relacion: 'procedimiento_contencioso' });
      if (mapLeyCodigos['L6715']) enlaces.push({ source: id, target: mapLeyCodigos['L6715'], relacion: 'acto_administrativo' });
    } else if (materiaLower.includes('tribut') || materiaLower.includes('fiscal') || materiaLower.includes('aduan')) {
      enlaces.push({ source: id, target: 'hub_tributario', relacion: 'competencia_tributaria' });
      baseLegalRaw.forEach((b) => {
        if (b.numeroLey === '6380') enlaces.push({ source: id, target: `ley_${b._id}`, relacion: 'regimen_fiscal' });
      });
    } else {
      // Fuero Civil y Comercial por defecto
      enlaces.push({ source: id, target: 'hub_civil', relacion: 'competencia_civil' });
      if (mapLeyCodigos['CC']) enlaces.push({ source: id, target: mapLeyCodigos['CC'], relacion: 'derecho_de_fondo' });
      if (mapLeyCodigos['CPC']) enlaces.push({ source: id, target: mapLeyCodigos['CPC'], relacion: 'impulso_procesal' });
    }
  });

  // =========================================================================
  // 6. MEMORIAS AGÉNTICAS DEL USUARIO
  // =========================================================================
  memorias.forEach((m) => {
    const id = `memoria_${m._id}`;
    nodosMap.set(id, {
      id,
      tipo: 'memoria',
      etiqueta: m.tema ? (m.tema.length > 40 ? m.tema.slice(0, 40) + '...' : m.tema) : 'Memoria Forense',
      detalle: m.resumen,
      peso: 4,
    });

    if (m.expediente && nodosMap.has(`exp_${m.expediente}`)) {
      enlaces.push({ source: id, target: `exp_${m.expediente}`, relacion: 'antecedente_de' });
    }

    if (m.cliente && nodosMap.has(`cliente_${m.cliente}`)) {
      enlaces.push({ source: id, target: `cliente_${m.cliente}`, relacion: 'asesoria_a' });
    }

    (m.entidades?.normasCitadas || []).forEach((norma) => {
      const normaLower = norma.toLowerCase();
      baseLegalRaw.forEach((b) => {
        if ((b.titulo || '').toLowerCase().includes(normaLower.slice(0, 15))) {
          enlaces.push({ source: id, target: `ley_${b._id}`, relacion: 'cita_norma' });
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
      hubs: HUBS_TEMATICOS.length,
      leyes: totalLeyesEnBD || baseLegalRaw.length,
      ensenanzas: aprendizajes.length,
      expedientes: expedientes.length,
      clientes: clientes.length,
      memorias: memorias.length,
      articulosIndexados: 32370,
    },
  };
}

/**
 * Obtiene el texto íntegro y articulado de una norma específica por ID, número de ley o slug.
 */
async function obtenerNormaPorId(id) {
  const mongoose = require('mongoose');
  if (!id) return null;

  let doc = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    doc = await BaseLegal.findById(id).lean();
  }
  if (!doc) {
    doc = await BaseLegal.findOne({ numeroLey: String(id) }).lean();
  }
  if (!doc) {
    const limpia = String(id).replace(/^ley_/, '');
    if (mongoose.Types.ObjectId.isValid(limpia)) {
      doc = await BaseLegal.findById(limpia).lean();
    }
  }
  if (!doc) {
    doc = await BaseLegal.findOne({
      titulo: { $regex: new RegExp(`\\b${id}\\b`, 'i') },
    }).lean();
  }

  return doc;
}

/**
 * Búsqueda rápida de normas en el catálogo para el Grafo y autocompletado
 */
async function buscarNormas(query, limite = 25) {
  if (!query || !query.trim()) return [];
  const q = String(query).trim();
  const numMatch = q.match(/\b(?:ley\s*(?:n[º°.]*\s*)?|n[º°.]*\s*)(\d+)\b/i);

  if (numMatch) {
    const num = numMatch[1];
    return BaseLegal.find({
      $or: [{ numeroLey: num }, { titulo: { $regex: new RegExp(`\\b${num}\\b`, 'i') } }],
    })
      .select('titulo url fuente fuero estadoNormativo numeroLey tags')
      .limit(limite)
      .lean();
  }

  try {
    return await BaseLegal.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .select('titulo url fuente fuero estadoNormativo numeroLey tags')
      .limit(limite)
      .lean();
  } catch {
    return BaseLegal.find({
      titulo: { $regex: q.slice(0, 30), $options: 'i' },
    })
      .select('titulo url fuente fuero estadoNormativo numeroLey tags')
      .limit(limite)
      .lean();
  }
}

module.exports = {
  recuperarMemoriaContextual,
  destilarYGuardarMemoria,
  obtenerRedDeConocimiento,
  extraerNormasDeTexto,
  obtenerNormaPorId,
  buscarNormas,
};
