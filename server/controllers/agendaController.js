const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const EventoAgenda = require('../models/EventoAgenda');

// GET /api/agenda?desde=&hasta=
const listarEventos = asyncHandler(async (req, res) => {
  const { desde, hasta } = req.query;
  const filtro = {};
  if (desde || hasta) {
    filtro.fechaInicio = {};
    if (desde) filtro.fechaInicio.$gte = new Date(desde);
    if (hasta) filtro.fechaInicio.$lte = new Date(hasta);
  }

  const eventos = await EventoAgenda.find(filtro)
    .populate('cliente', 'nombreCompleto')
    .populate('expediente', 'caratula')
    .populate('responsable', 'nombre')
    .sort({ fechaInicio: 1 });

  res.json({ success: true, data: eventos });
});

// POST /api/agenda
const crearEvento = asyncHandler(async (req, res) => {
  const { titulo, fechaInicio } = req.body;
  if (!titulo || !fechaInicio) {
    throw new ApiError(400, 'Título y fecha de inicio son obligatorios.');
  }

  const evento = await EventoAgenda.create({ ...req.body, creadoPor: req.usuario?._id });
  res.status(201).json({ success: true, data: evento });
});

// PUT /api/agenda/:id
const actualizarEvento = asyncHandler(async (req, res) => {
  const evento = await EventoAgenda.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!evento) throw new ApiError(404, 'Evento no encontrado.');
  res.json({ success: true, data: evento });
});

// DELETE /api/agenda/:id
const eliminarEvento = asyncHandler(async (req, res) => {
  const evento = await EventoAgenda.findByIdAndDelete(req.params.id);
  if (!evento) throw new ApiError(404, 'Evento no encontrado.');
  res.json({ success: true, message: 'Evento eliminado correctamente.' });
});

module.exports = { listarEventos, crearEvento, actualizarEvento, eliminarEvento };
