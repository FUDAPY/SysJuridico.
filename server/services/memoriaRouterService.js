const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Expediente = require('../models/Expediente');
const DocumentoExpediente = require('../models/DocumentoExpediente');
const { reindexarMemoriaEstudio } = require('./otelaxWisdomService');

/**
 * Obtiene la ruta base de almacenamiento de datos del sistema.
 */
function obtenerRutaData() {
  if (fs.existsSync('/app/data')) {
    return '/app/data';
  }
  return path.resolve(process.cwd(), 'data');
}

/**
 * Detecta plazos procesales en un texto.
 */
function extraerPlazos(texto) {
  if (!texto) return [];
  const plazos = [];
  const rx = /\b(\d+)\s*(?:d[ií]as\s*(?:h[aá]biles|corridos|perentorios)?|horas|meses|a[nñ]os)\b/gi;
  let m;
  while ((m = rx.exec(texto)) !== null) {
    if (!plazos.includes(m[0])) {
      plazos.push(m[0]);
    }
  }
  return plazos.slice(0, 5);
}

/**
 * Sintetiza un turno o actuación procesal para guardarlo como hito limpio.
 */
function sintetizarHito({ pregunta = '', respuesta = '', tipo = 'CONSULTA_CHAT', archivos = [] }) {
  const plazos = extraerPlazos(pregunta + ' ' + respuesta);

  // Extraer primera oración sustantiva de la respuesta como síntesis
  const oraciones = respuesta
    .replace(/[#*`_]/g, '')
    .split(/(?<=[.!?])\s+/)
    .filter((o) => o.length > 20 && !o.toLowerCase().startsWith('hola') && !o.toLowerCase().startsWith('¡hola'));

  const resumen = oraciones.slice(0, 2).join(' ').slice(0, 450);

  let titulo = pregunta.slice(0, 80).trim();
  if (tipo === 'ANALISIS_ARCHIVO' && archivos.length) {
    titulo = `Análisis de ${archivos.join(', ')}`;
  } else if (tipo === 'ESCRITO_EDITOR') {
    titulo = `Redacción de escrito judicial`;
  }

  return {
    titulo: titulo || 'Consulta y actuación procesal',
    resumenHechosYDecisiones: resumen || respuesta.slice(0, 300),
    plazosDetectados: plazos,
    archivosAsociados: archivos,
  };
}

/**
 * Actualiza el archivo markdown de respaldo de la causa en el disco.
 */
async function actualizarRespaldoMdExpediente(expediente) {
  try {
    const baseDir = path.join(obtenerRutaData(), 'otelaxwisdom', 'memoria-estudio', 'expedientes');
    fs.mkdirSync(baseDir, { recursive: true });

    const filePath = path.join(baseDir, `${expediente._id}.md`);
    const hitos = expediente.memoriaPersistente || [];

    const contenidoHitos = hitos
      .slice(-30) // Últimos 30 hitos para mantenerlo compacto y eficiente
      .map((h) => {
        const fechaStr = new Date(h.fecha).toISOString().split('T')[0];
        const plazosStr = h.plazosDetectados?.length ? ` (Plazos: ${h.plazosDetectados.join(', ')})` : '';
        const archivosStr = h.archivosAsociados?.length ? ` [Archivos: ${h.archivosAsociados.join(', ')}]` : '';
        return `### [${fechaStr}] [${h.tipo}] ${h.titulo}\n${h.resumenHechosYDecisiones}${plazosStr}${archivosStr}\n`;
      })
      .join('\n');

    const mdContent = `---
expediente_id: "${expediente._id}"
caratula: "${expediente.caratula.replace(/"/g, '\\"')}"
numero: "${expediente.numero || 'S/N'}"
ano: ${expediente.ano || 2026}
juzgado: "${expediente.juzgado || 'S/D'}"
fuero: "${expediente.fuero || 'Civil y Comercial'}"
fecha_actualizacion: "${new Date().toISOString()}"
---

# MEMORIA CRONOLÓGICA DE LA CAUSA: "${expediente.caratula}"
- **Juzgado:** ${expediente.juzgado || 'S/D'} | **Fuero:** ${expediente.fuero || 'Civil y Comercial'}
- **Estado:** ${expediente.estado || 'activo'}
- **Total Hitos Registrados:** ${hitos.length}

${contenidoHitos || '_Sin actuaciones registradas aún en la causa._'}
`;

    fs.writeFileSync(filePath, mdContent, 'utf8');
  } catch (err) {
    console.warn('[MemoriaRouter] Error escribiendo respaldo .md de expediente:', err.message);
  }
}

/**
 * Enrutador de Memoria Agéntica y Persistencia
 * Determina a cuál de los 3 destinos corresponde cada turno:
 *  - Destino A: Expediente (MongoDB + .md en memoria-estudio/expedientes/)
 *  - Destino B: Aprendizaje Nuevo en OtelaxWisdom (auto-aprendido/ con frontmatter YAML)
 *  - Destino C: Consulta General (solo SesionChat, anti-ruido)
 */
async function enrutarMemoriaTurno({
  pregunta = '',
  respuesta = '',
  usuarioId = null,
  expedienteId = null,
  fuenteRespuesta = '',
  archivosAdjuntos = [],
  tipoHito = 'CONSULTA_CHAT',
  documentoId = null,
}) {
  if (!respuesta || respuesta.length < 20) return { destino: 'IGNORADO' };

  // =========================================================================
  // DESTINO A: VINCULADO A UN EXPEDIENTE
  // =========================================================================
  let expTargetId = expedienteId;

  // Si no se pasó expedienteId explícito, buscar si la consulta menciona uno
  if (!expTargetId && pregunta) {
    const numMatch = pregunta.match(/\b(?:expediente|causa|juicio|n[º°]?)\s*[:#]?\s*(\d+)(?:\/(\d{2,4}))?\b/i);
    if (numMatch) {
      const expEncontrado = await Expediente.findOne({ numero: numMatch[1] }).select('_id');
      if (expEncontrado) expTargetId = expEncontrado._id;
    }
  }

  if (expTargetId) {
    try {
      const exp = await Expediente.findById(expTargetId);
      if (exp) {
        const nombresArchivos = archivosAdjuntos.map((a) => (typeof a === 'string' ? a : a.nombre)).filter(Boolean);
        const { titulo, resumenHechosYDecisiones, plazosDetectados, archivosAsociados } = sintetizarHito({
          pregunta,
          respuesta,
          tipo: tipoHito,
          archivos: nombresArchivos,
        });

        // Registrar hito en memoria viva del expediente
        exp.memoriaPersistente.push({
          fecha: new Date(),
          tipo: tipoHito,
          titulo,
          resumenHechosYDecisiones,
          plazosDetectados,
          archivosAsociados,
          documentoId: documentoId || null,
          autor: usuarioId || null,
        });

        exp.ultimaActuacionTexto = titulo.slice(0, 100);
        await exp.save();

        // Respaldo compacto en .md dentro de OtelaxWisdom
        await actualizarRespaldoMdExpediente(exp);

        console.log(`[MemoriaRouter] -> Destino A: Hito guardado en expediente "${exp.caratula}" (${exp._id})`);
        return { destino: 'DESTINO_A_EXPEDIENTE', expedienteId: exp._id };
      }
    } catch (errA) {
      console.warn('[MemoriaRouter] Error en Destino A:', errA.message);
    }
  }

  // =========================================================================
  // DESTINO B: APRENDIZAJE NUEVO EN OTELAXWISDOM (SIN EXPEDIENTE)
  // =========================================================================
  // Se activa si la respuesta proviene de Fallback Web Oficial (.gov.py) o si aporta doctrina/modelo nuevo
  const esNovedadWebOficial = fuenteRespuesta === 'web_institucional_oficial' || fuenteRespuesta === 'web_institucional_auto';
  const esModeloEscritoUtil = tipoHito === 'ESCRITO_EDITOR' || /^(redacta|modelo|formato)\s+/i.test(pregunta.trim());
  const contieneContenidoSustantivoNuevo = respuesta.length > 300 && (esNovedadWebOficial || esModeloEscritoUtil);

  if (contieneContenidoSustantivoNuevo) {
    try {
      const autoDir = path.join(obtenerRutaData(), 'otelaxwisdom', 'auto-aprendido');
      fs.mkdirSync(autoDir, { recursive: true });

      const hash = crypto.createHash('sha256').update(respuesta.slice(0, 1000)).digest('hex').slice(0, 12);
      const slug = (pregunta.slice(0, 40) || 'conocimiento-legal')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const fileName = `${slug}-${hash}.md`;
      const filePath = path.join(autoDir, fileName);

      // Deduplicación por hash
      if (!fs.existsSync(filePath)) {
        const mdDoc = `---
titulo: "${pregunta.slice(0, 80).replace(/"/g, '\\"')}"
tipo: "DOCTRINA_APRENDIDA"
fuero: "General"
fuente: "${fuenteRespuesta || 'Techapyrã IA'}"
fecha: "${new Date().toISOString()}"
content_hash: "${hash}"
---

# ${pregunta.slice(0, 100)}

${respuesta}
`;
        fs.writeFileSync(filePath, mdDoc, 'utf8');
        reindexarMemoriaEstudio();
        console.log(`[MemoriaRouter] -> Destino B: Aprendizaje nuevo guardado en OtelaxWisdom (${fileName})`);
        return { destino: 'DESTINO_B_OTELAXWISDOM', archivo: fileName };
      }
    } catch (errB) {
      console.warn('[MemoriaRouter] Error en Destino B:', errB.message);
    }
  }

  // =========================================================================
  // DESTINO C: CONSULTA GENERAL (ANTI-RUIDO)
  // =========================================================================
  // Se conserva únicamente en SesionChat de MongoDB sin ensuciar OtelaxWisdom ni expedientes
  return { destino: 'DESTINO_C_SESION_CHAT_SOLO' };
}

module.exports = {
  enrutarMemoriaTurno,
  actualizarRespaldoMdExpediente,
  sintetizarHito,
};
