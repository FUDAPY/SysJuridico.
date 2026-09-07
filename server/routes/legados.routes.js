const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { protect, authorize } = require('../middleware/auth');
const Credito = require('../models/Credito');
const RequisitoTramite = require('../models/RequisitoTramite');
const UbicacionArchivo = require('../models/UbicacionArchivo');

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
const requisitosRouter = construirRouter(RequisitoTramite);
const archivosRouter = construirRouter(UbicacionArchivo);

module.exports = { creditosRouter, requisitosRouter, archivosRouter };

