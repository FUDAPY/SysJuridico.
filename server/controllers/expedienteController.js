const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Expediente = require('../models/Expediente');
const { generarPlanPagos } = require('../services/creditoService');

// GET /api/expedientes?abogado=&cliente=&estado=&buscar=
const listarExpedientes = asyncHandler(async (req, res) => {
  const { abogado, cliente, estado, buscar } = req.query;
  const filtro = {};
  if (abogado) filtro.abogadoAsignado = abogado;
  if (cliente) filtro.cliente = cliente;
  if (estado) filtro.estado = estado;
  if (buscar) filtro.caratula = { $regex: buscar, $options: 'i' };

  // El rol 'abogado' solo puede ver los expedientes que tiene asignados
  if (req.usuario.rol === 'abogado') {
    filtro.abogadoAsignado = req.usuario._id;
  }

  const expedientes = await Expediente.find(filtro)
    .populate('cliente', 'nombreCompleto cedula telefono')
    .populate('abogadoAsignado', 'nombre email')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: expedientes });
});

// GET /api/expedientes/:id
const obtenerExpediente = asyncHandler(async (req, res) => {
  const expediente = await Expediente.findById(req.params.id)
    .populate('cliente')
    .populate('abogadoAsignado', 'nombre email rol');
  if (!expediente) throw new ApiError(404, 'Expediente no encontrado.');

  if (req.usuario.rol === 'abogado' && String(expediente.abogadoAsignado._id) !== String(req.usuario._id)) {
    throw new ApiError(403, 'No tiene permisos para ver este expediente.');
  }

  res.json({ success: true, data: expediente });
});

// POST /api/expedientes
const crearExpediente = asyncHandler(async (req, res) => {
  const {
    caratula,
    cliente,
    abogadoAsignado,
    fuero,
    juzgado,
    descripcion,
    enlaceDocumento,
    fechaInicio,
    fechaFin,
    estado,
    honorariosTotales = 0,
    creditoAutomatico = false,
    entregaInicial = 0,
    cantidadCuotas = 0,
    frecuenciaCuotas = 'mensual',
  } = req.body;

  if (!caratula || !cliente || !abogadoAsignado) {
    throw new ApiError(400, 'Carátula, cliente y abogado asignado son obligatorios.');
  }

  const datosExpediente = {
    caratula,
    cliente,
    abogadoAsignado,
    fuero,
    juzgado,
    descripcion,
    enlaceDocumento,
    fechaInicio,
    fechaFin,
    estado,
    honorariosTotales,
    creditoAutomatico,
    entregaInicial,
    cantidadCuotas,
    frecuenciaCuotas,
    creadoPor: req.usuario?._id,
  };

  if (creditoAutomatico && honorariosTotales > 0) {
    const { planPagos, saldoPendiente } = generarPlanPagos({
      honorariosTotales,
      entregaInicial,
      cantidadCuotas,
      frecuenciaCuotas,
      fechaInicio,
    });
    datosExpediente.planPagos = planPagos;
    datosExpediente.saldoPendiente = saldoPendiente;
  } else {
    datosExpediente.saldoPendiente = Math.max(0, honorariosTotales - entregaInicial);
  }

  const expediente = await Expediente.create(datosExpediente);
  res.status(201).json({ success: true, data: expediente });
});

// PUT /api/expedientes/:id
const actualizarExpediente = asyncHandler(async (req, res) => {
  const expediente = await Expediente.findById(req.params.id);
  if (!expediente) throw new ApiError(404, 'Expediente no encontrado.');

  const camposFinancierosCambiaron =
    ['honorariosTotales', 'entregaInicial', 'cantidadCuotas', 'frecuenciaCuotas', 'creditoAutomatico'].some(
      (campo) => campo in req.body
    );

  Object.assign(expediente, req.body);

  if (camposFinancierosCambiaron && expediente.creditoAutomatico && expediente.honorariosTotales > 0) {
    const { planPagos, saldoPendiente } = generarPlanPagos({
      honorariosTotales: expediente.honorariosTotales,
      entregaInicial: expediente.entregaInicial,
      cantidadCuotas: expediente.cantidadCuotas,
      frecuenciaCuotas: expediente.frecuenciaCuotas,
      fechaInicio: expediente.fechaInicio,
    });
    expediente.planPagos = planPagos;
    expediente.saldoPendiente = saldoPendiente;
  }

  await expediente.save();
  res.json({ success: true, data: expediente });
});

// DELETE /api/expedientes/:id
const eliminarExpediente = asyncHandler(async (req, res) => {
  const expediente = await Expediente.findByIdAndDelete(req.params.id);
  if (!expediente) throw new ApiError(404, 'Expediente no encontrado.');
  res.json({ success: true, message: 'Expediente eliminado correctamente.' });
});

module.exports = {
  listarExpedientes,
  obtenerExpediente,
  crearExpediente,
  actualizarExpediente,
  eliminarExpediente,
};
