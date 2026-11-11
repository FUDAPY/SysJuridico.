const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const SesionChat = require('../models/SesionChat');
const AprendizajeSistema = require('../models/AprendizajeSistema');
const { procesarConsultaLexPY, procesarAsistenteEditor } = require('../services/lexpyService');
const { redactarBorrador } = require('../services/draftService');
const { destilarYGuardarMemoria, obtenerRedDeConocimiento, obtenerNormaPorId, buscarNormas } = require('../services/agentMemoryService');

// POST /api/lexpy/chat  { pregunta, sesionId?, cliente?, expediente? }
const chat = asyncHandler(async (req, res) => {
  const { pregunta, sesionId, cliente, expediente } = req.body;
  if (!pregunta || !pregunta.trim()) {
    throw new ApiError(400, 'La pregunta es obligatoria.');
  }

  const { respuesta, fuente } = await procesarConsultaLexPY({
    pregunta,
    usuarioId: req.usuario._id,
    clienteId: cliente || null,
    expedienteId: expediente || null,
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

  // Destilación asíncrona de memoria agéntica (no bloquea el response)
  destilarYGuardarMemoria({
    usuarioId: req.usuario._id,
    expedienteId: expediente || sesion.expediente || null,
    clienteId: cliente || sesion.cliente || null,
    pregunta,
    respuesta,
  }).catch((err) => console.warn('[LexPY] Error destilando memoria:', err.message));

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

// GET /api/lexpy/grafo -> Devuelve la red de conocimiento tipo Obsidian (nodos y aristas)
const obtenerGrafo = asyncHandler(async (req, res) => {
  const red = await obtenerRedDeConocimiento({ usuarioId: req.usuario._id });
  res.json({ success: true, data: red });
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
  obtenerGrafo,
  asistenteEditor,
  obtenerNorma,
};

