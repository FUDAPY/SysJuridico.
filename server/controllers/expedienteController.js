const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Expediente = require('../models/Expediente');
const DocumentoExpediente = require('../models/DocumentoExpediente');
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

// POST /api/expedientes/:id/documentos  { nombre, tipo, datos(base64) }
const subirDocumento = asyncHandler(async (req, res) => {
  const expediente = await Expediente.findById(req.params.id);
  if (!expediente) throw new ApiError(404, 'Expediente no encontrado.');

  const { nombre, tipo, datos } = req.body;
  if (!nombre || !datos) throw new ApiError(400, 'El nombre del archivo y su contenido son obligatorios.');

  const nombreLimpio = String(nombre).split(/[\\/]/).pop();
  const ext = nombreLimpio.split('.').pop().toLowerCase();
  const permitidas = ['doc', 'docx', 'pdf'];
  if (!permitidas.includes(ext)) {
    throw new ApiError(400, 'Solo se permiten archivos .doc, .docx o .pdf.');
  }

  const buffer = Buffer.from(String(datos), 'base64');
  if (buffer.length > 15 * 1024 * 1024) {
    throw new ApiError(400, 'El archivo supera el tamaño máximo de 15 MB.');
  }

  const documento = await DocumentoExpediente.create({
    expediente: expediente._id,
    nombre: nombreLimpio,
    tipo: tipo || '',
    tamano: buffer.length,
    datos: buffer,
    subidoPor: req.usuario._id,
  });

  const datosRespuesta = documento.toObject();
  delete datosRespuesta.datos;
  res.status(201).json({ success: true, data: datosRespuesta });
});

// GET /api/expedientes/:id/documentos  (solo metadatos)
const listarDocumentos = asyncHandler(async (req, res) => {
  const documentos = await DocumentoExpediente.find({ expediente: req.params.id })
    .select('-datos')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: documentos });
});

// GET /api/expedientes/:id/documentos/:docId/descargar -> { base64 }
const descargarDocumento = asyncHandler(async (req, res) => {
  const documento = await DocumentoExpediente.findOne({
    _id: req.params.docId,
    expediente: req.params.id,
  });
  if (!documento) throw new ApiError(404, 'Documento no encontrado.');
  res.json({
    success: true,
    data: {
      nombre: documento.nombre,
      tipo: documento.tipo,
      base64: documento.datos.toString('base64'),
    },
  });
});

// DELETE /api/expedientes/:id/documentos/:docId
const eliminarDocumento = asyncHandler(async (req, res) => {
  const documento = await DocumentoExpediente.findOne({
    _id: req.params.docId,
    expediente: req.params.id,
  });
  if (!documento) throw new ApiError(404, 'Documento no encontrado.');
  await documento.deleteOne();
  res.json({ success: true, message: 'Documento eliminado.' });
});

module.exports = {
  listarExpedientes,
  obtenerExpediente,
  crearExpediente,
  actualizarExpediente,
  eliminarExpediente,
  subirDocumento,
  listarDocumentos,
  descargarDocumento,
  eliminarDocumento,
};
