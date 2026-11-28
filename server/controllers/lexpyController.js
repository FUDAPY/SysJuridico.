const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const SesionChat = require('../models/SesionChat');
const AprendizajeSistema = require('../models/AprendizajeSistema');
const { procesarConsultaLexPY, procesarAsistenteEditor } = require('../services/lexpyService');
const { redactarBorrador } = require('../services/draftService');
const { destilarYGuardarMemoria, obtenerNormaPorId, buscarNormas } = require('../services/agentMemoryService');

// POST /api/lexpy/chat  { pregunta, sesionId?, cliente?, expediente?, modo?, archivosAdjuntos? }
const chat = asyncHandler(async (req, res) => {
  const { pregunta, sesionId, cliente, expediente, modo, archivosAdjuntos } = req.body;
  if (!pregunta || !pregunta.trim()) {
    throw new ApiError(400, 'La pregunta es obligatoria.');
  }

  const { extraerTextoDeBuffer, analizarYResumirDocumento } = require('../services/documentProcessorService');
  const DocumentoExpediente = require('../models/DocumentoExpediente');
  const { enrutarMemoriaTurno } = require('../services/memoriaRouterService');

  // Procesamiento previo de archivos adjuntos (.docx, .pdf, .png/.jpg con OCR)
  const archivosProcesados = [];
  if (Array.isArray(archivosAdjuntos) && archivosAdjuntos.length > 0) {
    for (const arch of archivosAdjuntos) {
      if (arch.bufferBase64) {
        try {
          const buffer = Buffer.from(arch.bufferBase64, 'base64');
          const { texto, esEscaneado, paginas } = await extraerTextoDeBuffer({
            buffer,
            tipo: arch.tipo || '',
            nombre: arch.nombre || 'archivo',
          });

          arch.textoExtraido = texto;
          archivosProcesados.push({
            nombre: arch.nombre || 'archivo',
            tipo: arch.tipo || '',
            textoExtraido: texto,
          });

          // Si la consulta está vinculada a un expediente, guardar el archivo físicamente en la causa
          if (expediente) {
            const { resumenIA } = await analizarYResumirDocumento({
              texto,
              nombre: arch.nombre,
            }).catch(() => ({ resumenIA: `Archivo adjunto: ${arch.nombre}` }));

            await DocumentoExpediente.create({
              expediente,
              nombre: arch.nombre,
              tipo: arch.tipo || '',
              tamano: buffer.length,
              datos: buffer,
              subidoPor: req.usuario._id,
              textoExtraido: texto,
              textoExtraidoAt: new Date(),
              resumenIA,
              esEscaneado: !!esEscaneado,
              paginas: paginas || 1,
            }).catch((errDoc) => console.warn('[LexPY] Error guardando archivo en expediente:', errDoc.message));
          }
        } catch (errP) {
          console.warn(`[LexPY] Error procesando archivo "${arch.nombre}":`, errP.message);
        }
      }
    }
  }

  const { respuesta, fuente } = await procesarConsultaLexPY({
    pregunta,
    usuarioId: req.usuario._id,
    clienteId: cliente || null,
    expedienteId: expediente || null,
    modo: modo || 'MODO_CHAT',
    archivosAdjuntos: archivosProcesados,
  });

  let sesion = sesionId ? await SesionChat.findById(sesionId) : null;
  if (!sesion) {
    sesion = await SesionChat.create({
      usuario: req.usuario._id,
      titulo: pregunta.slice(0, 60),
      cliente: cliente || null,
      expediente: expediente || null,
      mensajes: [],
    });
  }

  sesion.mensajes.push({ rol: 'usuario', contenido: pregunta });
  sesion.mensajes.push({ rol: 'asistente', contenido: respuesta, fuenteRespuesta: fuente });
  await sesion.save();

  // Enrutamiento inteligente de memoria persistente (Destino A, B o C)
  enrutarMemoriaTurno({
    pregunta,
    respuesta,
    usuarioId: req.usuario._id,
    expedienteId: expediente || sesion.expediente || null,
    fuenteRespuesta: fuente,
    archivosAdjuntos: archivosProcesados.map((a) => a.nombre),
    tipoHito: archivosProcesados.length ? 'ANALISIS_ARCHIVO' : 'CONSULTA_CHAT',
  }).catch((err) => console.warn('[LexPY] Error enrutando memoria:', err.message));

  res.json({ success: true, data: { respuesta, fuente, sesionId: sesion._id } });
});

// GET /api/lexpy/sesiones  (historial del usuario autenticado)
const listarSesiones = asyncHandler(async (req, res) => {
  const sesiones = await SesionChat.find({ usuario: req.usuario._id }).sort({ updatedAt: -1 });
  res.json({ success: true, data: sesiones });
});

// GET /api/lexpy/sesiones/:id
const obtenerSesion = asyncHandler(async (req, res) => {
  const sesion = await SesionChat.findById(req.params.id);
  if (!sesion) throw new ApiError(404, 'Sesión no encontrada.');
  res.json({ success: true, data: sesion });
});

// POST /api/lexpy/validar  { aprendizajeId }  -> marca una respuesta como validada por un humano
const validarAprendizaje = asyncHandler(async (req, res) => {
  const { aprendizajeId } = req.body;
  const aprendizaje = await AprendizajeSistema.findByIdAndUpdate(
    aprendizajeId,
    { validado: true, validadoPor: req.usuario._id },
    { new: true }
  );
  if (!aprendizaje) throw new ApiError(404, 'Registro de aprendizaje no encontrado.');
  res.json({ success: true, data: aprendizaje });
});

// POST /api/lexpy/redactar  { tipoDocumento, clienteId?, expedienteId?, instrucciones? }
const redactar = asyncHandler(async (req, res) => {
  const { tipoDocumento, clienteId, expedienteId, instrucciones } = req.body;
  if (!tipoDocumento) throw new ApiError(400, 'El tipo de documento es obligatorio.');

  const resultado = await redactarBorrador({ tipoDocumento, clienteId, expedienteId, instrucciones });
  res.json({ success: true, data: resultado });
});

// POST /api/lexpy/editor-ai -> Asistente de redacción rápida para el Editor Judicial
const asistenteEditor = asyncHandler(async (req, res) => {
  const { accion, textoSeleccionado, instrucciones, expedienteId, incluirCSJ } = req.body;
  const resultado = await procesarAsistenteEditor({
    accion,
    textoSeleccionado,
    instrucciones,
    expedienteId,
    incluirCSJ,
    usuarioId: req.usuario._id,
  });
  res.json({ success: true, data: resultado });
});

// GET /api/lexpy/norma/:id -> Devuelve el texto y articulado completo de una norma
const obtenerNorma = asyncHandler(async (req, res) => {
  const norma = await obtenerNormaPorId(req.params.id);
  if (!norma) throw new ApiError(404, 'Norma no encontrada.');
  res.json({ success: true, data: norma });
});

module.exports = {
  chat,
  listarSesiones,
  obtenerSesion,
  validarAprendizaje,
  redactar,
  asistenteEditor,
  obtenerNorma,
};

