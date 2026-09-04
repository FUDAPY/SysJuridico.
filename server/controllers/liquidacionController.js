const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const LiquidacionLaboral = require('../models/LiquidacionLaboral');
const { calcularLiquidacion } = require('../services/liquidacionLaboralService');

const TIPOS_VALIDOS = ['despido_injustificado', 'renuncia_voluntaria', 'despido_justificado', 'fin_contrato_jubilacion'];

function validarDatos({ tipoLiquidacion, fechaIngreso, fechaSalida, salarioMensual }) {
  if (!TIPOS_VALIDOS.includes(tipoLiquidacion)) {
    throw new ApiError(400, 'Tipo de liquidación inválido.');
  }
  if (!fechaIngreso || !fechaSalida) {
    throw new ApiError(400, 'Fecha de ingreso y fecha de salida son obligatorias.');
  }
  if (new Date(fechaSalida) <= new Date(fechaIngreso)) {
    throw new ApiError(400, 'La fecha de salida debe ser posterior a la fecha de ingreso.');
  }
  if (!salarioMensual || Number(salarioMensual) <= 0) {
    throw new ApiError(400, 'El salario mensual debe ser mayor a cero.');
  }
}

// POST /api/liquidaciones/calcular  (solo calcula, no persiste)
const calcular = asyncHandler(async (req, res) => {
  validarDatos(req.body);
  const resultado = calcularLiquidacion(req.body);
  res.json({ success: true, data: resultado });
});

// POST /api/liquidaciones  (calcula y guarda, opcionalmente asociada a cliente/expediente)
const guardar = asyncHandler(async (req, res) => {
  validarDatos(req.body);
  const { cliente, expediente } = req.body;
  const resultado = calcularLiquidacion(req.body);

  const liquidacion = await LiquidacionLaboral.create({
    ...req.body,
    ...resultado,
    cliente: cliente || null,
    expediente: expediente || null,
    calculadoPor: req.usuario?._id,
  });

  res.status(201).json({ success: true, data: liquidacion });
});

// GET /api/liquidaciones?cliente=&expediente=
const listar = asyncHandler(async (req, res) => {
  const { cliente, expediente } = req.query;
  const filtro = {};
  if (cliente) filtro.cliente = cliente;
  if (expediente) filtro.expediente = expediente;

  // El rol 'abogado' solo puede ver liquidaciones que él mismo calculó/guardó
  if (req.usuario.rol === 'abogado') {
    filtro.calculadoPor = req.usuario._id;
  }

  const liquidaciones = await LiquidacionLaboral.find(filtro)
    .populate('cliente', 'nombreCompleto cedula')
    .populate('expediente', 'caratula')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: liquidaciones });
});

// GET /api/liquidaciones/:id
const obtener = asyncHandler(async (req, res) => {
  const liquidacion = await LiquidacionLaboral.findById(req.params.id)
    .populate('cliente')
    .populate('expediente', 'caratula abogadoAsignado');
  if (!liquidacion) throw new ApiError(404, 'Liquidación no encontrada.');
  res.json({ success: true, data: liquidacion });
});

module.exports = { calcular, guardar, listar, obtener };
