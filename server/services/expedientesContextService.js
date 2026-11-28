const mongoose = require('mongoose');
const Expediente = require('../models/Expediente');
const DocumentoExpediente = require('../models/DocumentoExpediente');
const EventoAgenda = require('../models/EventoAgenda');
const Usuario = require('../models/Usuario');
const { extraerTextoDeBuffer } = require('./documentProcessorService');

/**
 * Determina el filtro de acceso a expedientes según el rol del usuario.
 */
function construirFiltroAccesoUsuario(usuarioId, rol) {
  if (rol === 'admin') {
    return {};
  }
  if (!usuarioId) return { _id: null };

  const id = typeof usuarioId === 'string' ? new mongoose.Types.ObjectId(usuarioId) : usuarioId;
  return {
    $or: [
      { abogadoAsignado: id },
      { creadoPor: id },
      { compartidoCon: id },
    ],
  };
}

/**
 * Lazy extraction / backfill de texto para documentos antiguos cuyo textoExtraido esté vacío.
 */
async function asegurarTextoDocumento(doc) {
  if (!doc) return;
  const tieneTexto = doc.textoExtraido && doc.textoExtraido.trim().length > 0;
  if (tieneTexto) return;

  // Si no tiene texto pero tiene el Buffer de datos original, extraemos al vuelo
  if (doc.datos && Buffer.isBuffer(doc.datos)) {
    try {
      const { texto, esEscaneado } = await extraerTextoDeBuffer({
        buffer: doc.datos,
        tipo: doc.tipo || '',
        nombre: doc.nombre || 'documento.pdf',
      });

      doc.textoExtraido = texto || '[PDF sin capa de texto seleccionable — requiere OCR]';
      doc.esEscaneado = !!esEscaneado;
      doc.textoExtraidoAt = new Date();

      await DocumentoExpediente.updateOne(
        { _id: doc._id },
        {
          $set: {
            textoExtraido: doc.textoExtraido,
            esEscaneado: doc.esEscaneado,
            textoExtraidoAt: doc.textoExtraidoAt,
          },
        }
      ).catch((e) => console.warn('[ExpContext] Error guardando lazy extraction:', e.message));
    } catch (err) {
      console.warn('[ExpContext] Error en lazy extraction:', err.message);
      doc.textoExtraido = '[PDF sin capa de texto seleccionable — requiere OCR]';
    }
  } else if (!doc.textoExtraido) {
    doc.textoExtraido = '[Documento sin datos de archivo disponibles]';
  }
}

/**
 * Recorta y extrae fragmentos relevantes de un texto largo según la consulta del usuario.
 */
function extraerFragmentosRelevantes(texto, consulta = '', maxChars = 3000) {
  if (!texto) return '';
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (limpio.length <= maxChars) return limpio;

  // Palabras significativas de la consulta
  const palabras = (consulta || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((p) => p.length > 3 && !['para', 'como', 'sobre', 'este', 'esta', 'estos', 'tengo', 'dice', 'cual'].includes(p));

  if (!palabras.length) {
    // Si no hay palabras específicas, devolver el inicio del escrito (carátula, hechos, etc.)
    return limpio.slice(0, maxChars) + '\n[... fragmento truncado por extensión ...]';
  }

  // Buscar ventanas alrededor de las coincidencias
  const textoLower = limpio.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const ventanas = [];
  const ventanaTamanio = 600;

  for (const palabra of palabras) {
    let pos = 0;
    while ((pos = textoLower.indexOf(palabra, pos)) !== -1 && ventanas.length < 5) {
      const inicio = Math.max(0, pos - 150);
      const fin = Math.min(limpio.length, pos + ventanaTamanio);
      ventanas.push({ inicio, fin });
      pos += palabra.length + 100;
    }
  }

  if (!ventanas.length) {
    return limpio.slice(0, maxChars) + '\n[... fragmento truncado por extensión ...]';
  }

  // Ordenar y fusionar ventanas superpuestas
  ventanas.sort((a, b) => a.inicio - b.inicio);
  const fusionadas = [];
  let actual = ventanas[0];

  for (let i = 1; i < ventanas.length; i++) {
    const v = ventanas[i];
    if (v.inicio <= actual.fin) {
      actual.fin = Math.max(actual.fin, v.fin);
    } else {
      fusionadas.push(actual);
      actual = v;
    }
  }
  fusionadas.push(actual);

  let resultado = '';
  for (const f of fusionadas) {
    const fragmento = limpio.slice(f.inicio, f.fin);
    resultado += (resultado ? '\n[...]\n' : '') + fragmento;
    if (resultado.length >= maxChars) break;
  }

  return resultado.slice(0, maxChars) + '\n[... fragmento analizado ...]';
}

/**
 * Detecta si la consulta del usuario apunta a la totalidad o estado general de la cartera.
 */
function esConsultaGlobalExpedientes(consulta) {
  if (!consulta || typeof consulta !== 'string') return false;
  const c = consulta.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const patrones = [
    /\b(que|cuales|cuantos)\s+(expedientes?|causas?|casos?|juicios?)\s+(tengo|tenemos|hay|activos?|cargados?)\b/,
    /\b(mis|nuestros)\s+(expedientes|causas|casos|juicios)\b/,
    /\b(resumen|lista|listado|estado)\s+(general\s+)?(de\s+)?(expedientes?|causas?|casos?)\b/,
    /\b(que|cuales)\s+(documentos?|archivos?|pdfs?)\s+(tengo|tenemos|hay|cargados?)\b/,
    /\b(proximos?\s+vencimientos?|plazos?\s+procesales?|audiencias?\s+pendientes?)\b/,
    /\bcartera\s+de\s+(clientes|causas|juicios|expedientes)\b/,
  ];

  return patrones.some((rx) => rx.test(c));
}

/**
 * Genera el Índice Global de Expedientes accesibles al usuario.
 */
async function obtenerIndiceGlobalExpedientes(usuarioId, rol = 'abogado') {
  const filtro = construirFiltroAccesoUsuario(usuarioId, rol);

  const expedientes = await Expediente.find(filtro)
    .populate('cliente', 'nombreCompleto cedula ruc')
    .sort({ updatedAt: -1 })
    .lean();

  if (!expedientes.length) {
    return '=== EXPEDIENTES Y DOCUMENTOS PDF DEL ESTUDIO ===\nNo se encontraron expedientes registrados o accesibles para el usuario actual.';
  }

  const expIds = expedientes.map((e) => e._id);

  // Cargar documentos y vencimientos próximos en paralelo
  const [documentos, eventosVencimiento] = await Promise.all([
    DocumentoExpediente.find({ expediente: { $in: expIds } })
      .select('expediente nombre tipo tamano esEscaneado')
      .lean(),
    EventoAgenda.find({
      expediente: { $in: expIds },
      estado: 'pendiente',
      fechaInicio: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    })
      .sort({ fechaInicio: 1 })
      .lean(),
  ]);

  // Agrupar documentos por expediente
  const docsPorExp = {};
  for (const d of documentos) {
    const eid = String(d.expediente);
    if (!docsPorExp[eid]) docsPorExp[eid] = [];
    docsPorExp[eid].push(d);
  }

  // Agrupar vencimientos por expediente
  const vencimientosPorExp = {};
  for (const ev of eventosVencimiento) {
    const eid = String(ev.expediente);
    if (!vencimientosPorExp[eid]) {
      vencimientosPorExp[eid] = `${ev.titulo} (${new Date(ev.fechaInicio).toLocaleDateString('es-PY')})`;
    }
  }

  const filas = expedientes.map((exp) => {
    const eid = String(exp._id);
    const docs = docsPorExp[eid] || [];
    const listaDocs = docs.length
      ? docs.map((d) => `${d.nombre}${d.esEscaneado ? ' [Escaneado]' : ''}`).join(', ')
      : 'Sin documentos PDF adjuntos';

    const clienteNombre = exp.cliente?.nombreCompleto || 'Sin cliente titular';
    const docCliente = exp.cliente?.cedula || exp.cliente?.ruc || 'S/D';
    const vencimiento = vencimientosPorExp[eid] || (exp.fechaFin ? new Date(exp.fechaFin).toLocaleDateString('es-PY') : 'Sin vencimiento próximo inmediato');

    return (
      `- **Expediente N° ${exp.numero || 'S/N'}/${exp.ano || ''}**: "${exp.caratula}"\n` +
      `  * **Juzgado / Fuero:** ${exp.juzgado || 'Juzgado no especificado'} | ${exp.fuero || exp.materia || 'General'}\n` +
      `  * **Cliente / Partes:** ${clienteNombre} (Doc: ${docCliente})\n` +
      `  * **Estado:** ${exp.estado || 'activo'}\n` +
      `  * **Próximo Vencimiento:** ${vencimiento}\n` +
      `  * **Documentos PDF Adjuntos (${docs.length}):** ${listaDocs}`
    );
  });

  return (
    `=== EXPEDIENTES Y DOCUMENTOS PDF DEL ESTUDIO ===\n` +
    `Total de causas activas accesibles: ${expedientes.length}\n\n` +
    filas.join('\n\n')
  );
}

/**
 * Inyección Inteligente de Contexto de Expedientes y PDFs para Inicio y Chat.
 * Localiza causas mencionadas o específicas y extrae el texto de sus PDFs.
 */
async function buscarContextoExpedientesYPDFs({ consulta = '', usuarioId = null, expedienteId = null } = {}) {
  let rol = 'abogado';
  if (usuarioId) {
    const u = await Usuario.findById(usuarioId).select('rol').lean();
    if (u?.rol) rol = u.rol;
  }

  const filtroAcceso = construirFiltroAccesoUsuario(usuarioId, rol);

  // 1. Si se provee expedienteId explícito (ej. desde el chat con causa vinculada o el redactor)
  if (expedienteId && mongoose.Types.ObjectId.isValid(expedienteId)) {
    const exp = await Expediente.findOne({ _id: expedienteId, ...filtroAcceso })
      .populate('cliente', 'nombreCompleto cedula ruc direccion telefono')
      .lean();

    if (exp) {
      const docs = await DocumentoExpediente.find({ expediente: exp._id });
      for (const d of docs) {
        await asegurarTextoDocumento(d);
      }

      const bloquesDocs = docs.map((d) => {
        const extracto = extraerFragmentosRelevantes(d.textoExtraido, consulta, 2500);
        return (
          `📄 DOCUMENTO ADJUNTO: "${d.nombre}" (Páginas: ${d.paginas || 1})\n` +
          (d.resumenIA ? `Resumen Previo: ${d.resumenIA}\n` : '') +
          `Extracto:\n${extracto}`
        );
      });

      // Cronología y memoria viva de la causa
      const hitos = (exp.memoriaPersistente || []).slice(-15);
      const cronologiaTexto = hitos.length
        ? `\n### CRONOLOGÍA Y MEMORIA VIVA DE LA CAUSA:\n` +
          hitos
            .map(
              (h) =>
                `- [${new Date(h.fecha).toLocaleDateString('es-PY')}] [${h.tipo}] ${h.titulo}: ${h.resumenHechosYDecisiones}${
                  h.plazosDetectados?.length ? ` (Plazos: ${h.plazosDetectados.join(', ')})` : ''
                }`
            )
            .join('\n') + '\n\n'
        : '';

      return (
        `=== EXPEDIENTES Y DOCUMENTOS DEL ESTUDIO ===\n` +
        `CAUSA EN ANÁLISIS: "${exp.caratula}" (N° ${exp.numero || 'S/N'}/${exp.ano || ''})\n` +
        `Juzgado: ${exp.juzgado || 'S/D'} | Fuero: ${exp.fuero || 'Civil y Comercial'}\n` +
        `Cliente: ${exp.cliente?.nombreCompleto || 'S/D'} (Doc: ${exp.cliente?.cedula || 'S/D'})\n` +
        `Estado: ${exp.estado} | Cuantía: Gs. ${(exp.montoCuantia || 0).toLocaleString('es-PY')}\n\n` +
        cronologiaTexto +
        (bloquesDocs.length ? bloquesDocs.join('\n\n---\n\n') : 'Esta causa no posee documentos adjuntos cargados en el sistema.')
      );
    }
  }

  // 2. Si el usuario hace una consulta global sobre sus causas o expedientes
  if (esConsultaGlobalExpedientes(consulta)) {
    return await obtenerIndiceGlobalExpedientes(usuarioId, rol);
  }

  // 3. Búsqueda de expedientes específicos mencionados en la consulta (por número, carátula o cliente)
  const qNorm = consulta.trim();
  if (qNorm.length < 3) return null;

  // Extraer números potenciales de expediente (ej. "expediente 123", "causa 45")
  const numMatch = qNorm.match(/\b(?:expediente|causa|juicio|n[º°]?)\s*[:#]?\s*(\d+)(?:\/(\d{2,4}))?\b/i);
  let expedientesCoincidentes = [];

  if (numMatch) {
    const num = numMatch[1];
    expedientesCoincidentes = await Expediente.find({
      numero: num,
      ...filtroAcceso,
    })
      .populate('cliente', 'nombreCompleto cedula ruc')
      .limit(3);
  }

  // Búsqueda por regex de palabras clave en carátula
  if (!expedientesCoincidentes.length) {
    const palabras = qNorm
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((p) => p.length > 4 && !['contra', 'sobre', 'juicio', 'causa', 'expediente', 'demanda'].includes(p));

    if (palabras.length > 0) {
      const condiciones = palabras.map((p) => ({ caratula: { $regex: new RegExp(p, 'i') } }));
      expedientesCoincidentes = await Expediente.find({
        $or: condiciones,
        ...filtroAcceso,
      })
        .populate('cliente', 'nombreCompleto cedula ruc')
        .limit(2);
    }
  }

  if (!expedientesCoincidentes.length) {
    return null;
  }

  // Si encontramos expediente(s) coincidente(s), extraer sus PDFs con lazy-extraction
  const bloquesExpedientes = [];

  for (const exp of expedientesCoincidentes) {
    const docs = await DocumentoExpediente.find({ expediente: exp._id });
    for (const d of docs) {
      await asegurarTextoDocumento(d);
    }

    const docsTexto = docs.map((d) => {
      const extracto = extraerFragmentosRelevantes(d.textoExtraido, consulta, 2000);
      return (
        `  * Archivo PDF: "${d.nombre}" (Páginas: ${d.paginas || 1})\n` +
        `    Extracto Relevante:\n    ${extracto.replace(/\n/g, '\n    ')}`
      );
    });

    bloquesExpedientes.push(
      `EXPEDIENTE: "${exp.caratula}" (N° ${exp.numero || 'S/N'}/${exp.ano || ''})\n` +
      `Juzgado: ${exp.juzgado || 'S/D'} | Fuero: ${exp.fuero || 'Civil y Comercial'}\n` +
      `Cliente: ${exp.cliente?.nombreCompleto || 'S/D'}\n` +
      `Documentos Adjuntos:\n` +
      (docsTexto.length ? docsTexto.join('\n\n') : '  (Sin documentos PDF adjuntos)')
    );
  }

  return (
    `=== EXPEDIENTES Y DOCUMENTOS PDF DEL ESTUDIO ===\n` +
    bloquesExpedientes.join('\n\n==========================================\n\n')
  );
}

module.exports = {
  obtenerIndiceGlobalExpedientes,
  buscarContextoExpedientesYPDFs,
  asegurarTextoDocumento,
  esConsultaGlobalExpedientes,
};
