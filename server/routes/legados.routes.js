const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { protect, authorize } = require('../middleware/auth');
const Credito = require('../models/Credito');
const RequisitoTramite = require('../models/RequisitoTramite');
const UbicacionArchivo = require('../models/UbicacionArchivo');
const MovimientoFinanciero = require('../models/MovimientoFinanciero');

function listar(Model, poblaciones = []) {
  return asyncHandler(async (req, res) => {
    let q = Model.find().sort({ createdAt: -1 });
    poblaciones.forEach((p) => { q = q.populate(p); });
    const datos = await q;
    res.json({ success: true, data: datos });
  });
}

function crear(Model) {
  return asyncHandler(async (req, res) => {
    const doc = await Model.create(req.body);
    res.status(201).json({ success: true, data: doc });
  });
}

function actualizar(Model) {
  return asyncHandler(async (req, res) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) throw new ApiError(404, 'Registro no encontrado.');
    res.json({ success: true, data: doc });
  });
}

function eliminar(Model) {
  return asyncHandler(async (req, res) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) throw new ApiError(404, 'Registro no encontrado.');
    res.json({ success: true, data: null });
  });
}

// POST /api/creditos/:id/cobrar  { monto, metodoPago?, fecha?, notas? }
const cobrarCredito = asyncHandler(async (req, res) => {
  const credito = await Credito.findById(req.params.id);
  if (!credito) throw new ApiError(404, 'Crédito no encontrado.');

  const monto = Number(req.body.monto);
  if (!monto || monto <= 0) throw new ApiError(400, 'El monto a cobrar debe ser mayor a cero.');

  const saldoActual = Number(credito.saldoPendiente) || 0;
  if (monto > saldoActual) {
    throw new ApiError(400, `El monto supera el saldo pendiente del crédito (Gs. ${saldoActual.toLocaleString('es-PY')}).`);
  }

  const nuevoSaldo = Math.max(0, saldoActual - monto);
  credito.saldoPendiente = nuevoSaldo;
  credito.ultimoPago = { monto, fecha: req.body.fecha || new Date(), registradoPor: req.usuario._id };
  await credito.save();

  await MovimientoFinanciero.create({
    tipo: 'ingreso',
    concepto: `Cobranza: ${credito.concepto || 'Crédito'}`,
    monto,
    moneda: 'PYG',
    metodoPago: req.body.metodoPago || 'efectivo',
    fecha: req.body.fecha ? new Date(req.body.fecha) : new Date(),
    cliente: credito.cliente || null,
    expediente: credito.expediente || null,
    numeroCuota: null,
    registradoPor: req.usuario._id,
    notas: req.body.notas || '',
  });

  res.json({ success: true, data: credito, saldoActualizado: nuevoSaldo });
});

function construirRouter(Model, poblaciones = []) {
  const router = express.Router();
  router.use(protect);
  router.get('/', listar(Model, poblaciones));
  router.post('/', authorize('admin'), crear(Model));
  router.put('/:id', authorize('admin'), actualizar(Model));
  router.delete('/:id', authorize('admin'), eliminar(Model));
  return router;
}

const creditosRouter = construirRouter(Credito, ['cliente', 'expediente']);
creditosRouter.post('/:id/cobrar', authorize('admin'), cobrarCredito);
const requisitosRouter = construirRouter(RequisitoTramite);
const archivosRouter = construirRouter(UbicacionArchivo);

module.exports = { creditosRouter, requisitosRouter, archivosRouter };

