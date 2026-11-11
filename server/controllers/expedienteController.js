const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Expediente = require('../models/Expediente');
const Cliente = require('../models/Cliente');
const Credito = require('../models/Credito');
const DocumentoExpediente = require('../models/DocumentoExpediente');
const { generarPlanPagos } = require('../services/creditoService');

// GET /api/expedientes?abogado=&cliente=&estado=&buscar=&juzgado=
const listarExpedientes = asyncHandler(async (req, res) => {
  const { abogado, cliente, estado, buscar, juzgado } = req.query;
  const filtro = {};
  if (abogado) filtro.abogadoAsignado = abogado;
  if (cliente) filtro.cliente = cliente;
  if (estado && estado !== 'todos') filtro.estado = estado;
  if (juzgado) filtro.juzgado = { $regex: juzgado, $options: 'i' };
  if (buscar) {
    filtro.$or = [
      { caratula: { $regex: buscar, $options: 'i' } },
      { numero: { $regex: buscar, $options: 'i' } },
      { juzgado: { $regex: buscar, $options: 'i' } },
      { materia: { $regex: buscar, $options: 'i' } },
    ];
  }

  // El rol 'abogado' solo puede ver expedientes que tiene asignados, creados o compartidos por el admin
  if (req.usuario.rol === 'abogado') {
    const condicionUsuario = {
      $or: [
        { abogadoAsignado: req.usuario._id },
        { creadoPor: req.usuario._id },
        { compartidoCon: req.usuario._id },
      ],
    };

    if (filtro.$or) {
      filtro.$and = [{ $or: filtro.$or }, condicionUsuario];
      delete filtro.$or;
    } else {
      filtro.$or = condicionUsuario.$or;
    }
  }

  const expedientes = await Expediente.find(filtro)
    .populate('cliente', 'nombreCompleto cedula telefono')
    .populate('abogadoAsignado', 'nombre email')
    .populate('compartidoCon', 'nombre email rol')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: expedientes });
});

// GET /api/expedientes/:id
const obtenerExpediente = asyncHandler(async (req, res) => {
  const expediente = await Expediente.findById(req.params.id)
    .populate('cliente')
    .populate('abogadoAsignado', 'nombre email rol')
    .populate('compartidoCon', 'nombre email rol');
  if (!expediente) throw new ApiError(404, 'Expediente no encontrado.');

  if (req.usuario.rol === 'abogado') {
    const esAsignado = String(expediente.abogadoAsignado?._id || expediente.abogadoAsignado) === String(req.usuario._id);
    const esCreador = String(expediente.creadoPor?._id || expediente.creadoPor) === String(req.usuario._id);
    const esCompartido = (expediente.compartidoCon || []).some(
      (u) => String(u._id || u) === String(req.usuario._id)
    );
    if (!esAsignado && !esCreador && !esCompartido) {
      throw new ApiError(403, 'No tiene permisos para ver este expediente.');
    }
  }

  res.json({ success: true, data: expediente });
});

// POST /api/expedientes
const crearExpediente = asyncHandler(async (req, res) => {
  let {
    caratula,
    cliente,
    abogadoAsignado,
    fuero,
    juzgado,
    numero,
    ano,
    circunscripcion,
    materia,
    tipoProceso,
    fase,
    montoCuantia,
    descripcion,
    enlaceDocumento,
    fechaInicio,
    fechaFin,
    estado = 'activo',
    honorariosTotales = 0,
    creditoAutomatico = true,
    entregaInicial = 0,
    cantidadCuotas = 3,
    frecuenciaCuotas = 'mensual',
  } = req.body;

  if (!caratula) {
    throw new ApiError(400, 'La carátula del expediente es obligatoria.');
  }

  // Si no se asignó abogado, asignamos al usuario en sesión
  if (!abogadoAsignado) {
    abogadoAsignado = req.usuario?._id;
  }

  // Si no se seleccionó cliente, asignamos el primer cliente existente o creamos uno de cortesía
  if (!cliente) {
    let clienteExiste = await Cliente.findOne();
    if (!clienteExiste) {
      clienteExiste = await Cliente.create({
        nombreCompleto: 'Cliente Titular / Causa Judicial',
        cedula: `S/C-${Date.now().toString().slice(-6)}`,
        telefono: '0981000000',
        creadoPor: req.usuario?._id,
      });
    }
    cliente = clienteExiste._id;
  }

  // Normalizar honorarios y cuantía
  const montoNumerico = Number(montoCuantia) || Number(honorariosTotales) || 0;
  if (montoNumerico > 0 && !honorariosTotales) {
    honorariosTotales = montoNumerico;
  }

  const datosExpediente = {
    caratula,
    cliente,
    abogadoAsignado,
    fuero: fuero || materia || '',
    juzgado: juzgado || '',
    numero: numero || '',
    ano: Number(ano) || new Date().getFullYear(),
    circunscripcion: circunscripcion || 'Capital',
    materia: materia || fuero || 'Civil y Comercial',
    tipoProceso: tipoProceso || '',
    fase: fase || 'Inicio',
    montoCuantia: montoNumerico,
    descripcion: descripcion || '',
    enlaceDocumento: enlaceDocumento || '',
    fechaInicio: fechaInicio || new Date(),
    fechaFin,
    estado,
    honorariosTotales,
    creditoAutomatico: Boolean(creditoAutomatico),
    entregaInicial: Number(entregaInicial) || 0,
    cantidadCuotas: Number(cantidadCuotas) || 1,
    frecuenciaCuotas: frecuenciaCuotas || 'mensual',
    visto: false,
    ultimaActuacionTexto: 'Causa iniciada en el sistema',
    creadoPor: req.usuario?._id,
  };

  if (creditoAutomatico && honorariosTotales > 0) {
    const { planPagos, saldoPendiente } = generarPlanPagos({
      honorariosTotales,
      entregaInicial: datosExpediente.entregaInicial,
      cantidadCuotas: datosExpediente.cantidadCuotas,
      frecuenciaCuotas: datosExpediente.frecuenciaCuotas,
      fechaInicio: datosExpediente.fechaInicio,
    });
    datosExpediente.planPagos = planPagos;
    datosExpediente.saldoPendiente = saldoPendiente;
  } else {
    datosExpediente.saldoPendiente = Math.max(0, honorariosTotales - (Number(entregaInicial) || 0));
  }

  const expediente = await Expediente.create(datosExpediente);

  // Crear crédito automático en la cartera de cobranzas si corresponde
  if (creditoAutomatico && honorariosTotales > 0) {
    const clienteDoc = await Cliente.findById(cliente);
    await Credito.create({
      cliente,
      clienteNombre: clienteDoc ? clienteDoc.nombreCompleto : 'Cliente Titular',
      expediente: expediente._id,
      concepto: `Honorarios s/ ${caratula.slice(0, 50)}`,
      montoTotal: honorariosTotales,
      saldoPendiente: expediente.saldoPendiente,
    }).catch((err) => console.warn('[Expedientes] Error al registrar crédito automático:', err.message));
  }

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

// POST /api/expedientes/:id/documentos  { nombre, tipo, datos/base64 }
const subirDocumento = asyncHandler(async (req, res) => {
  const expediente = await Expediente.findById(req.params.id);
  if (!expediente) throw new ApiError(404, 'Expediente no encontrado.');

  const { nombre, tipo } = req.body;
  const contenidoBase64 = req.body.datos || req.body.base64;
  if (!nombre || !contenidoBase64) throw new ApiError(400, 'El nombre del archivo y su contenido son obligatorios.');

  const nombreLimpio = String(nombre).split(/[\\/]/).pop();
  const ext = nombreLimpio.split('.').pop().toLowerCase();
  const permitidas = ['doc', 'docx', 'pdf', 'txt', 'html', 'png', 'jpg', 'jpeg'];
  if (!permitidas.includes(ext)) {
    throw new ApiError(400, 'Solo se permiten archivos .doc, .docx, .pdf, .txt, .html o imágenes .jpg, .png.');
  }

  const buffer = Buffer.from(String(contenidoBase64), 'base64');
  if (buffer.length > 25 * 1024 * 1024) {
    throw new ApiError(400, 'El archivo supera el tamaño máximo de 25 MB.');
  }

  // Extracción inteligente de texto y resumen forense
  const { extraerTextoDeBuffer, analizarYResumirDocumento } = require('../services/documentProcessorService');
  const { texto, esEscaneado, paginas } = await extraerTextoDeBuffer({ buffer, tipo, nombre: nombreLimpio });

  const { resumenIA, entidadesClave } = await analizarYResumirDocumento({
    texto,
    nombre: nombreLimpio,
    caratulaExpediente: expediente.caratula,
  });

  const documento = await DocumentoExpediente.create({
    expediente: expediente._id,
    nombre: nombreLimpio,
    tipo: tipo || '',
    tamano: buffer.length,
    datos: buffer,
    subidoPor: req.usuario._id,
    textoExtraido: texto,
    resumenIA,
    entidadesClave,
    esEscaneado,
    paginas,
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

// POST /api/expedientes/:id/compartir
const compartirExpediente = asyncHandler(async (req, res) => {
  const expediente = await Expediente.findById(req.params.id);
  if (!expediente) throw new ApiError(404, 'Expediente no encontrado.');

  // Solo el administrador o el titular/abogado asignado pueden compartir
  const esAdmin = req.usuario.rol === 'admin';
  const esTitular =
    String(expediente.abogadoAsignado) === String(req.usuario._id) ||
    String(expediente.creadoPor) === String(req.usuario._id);

  if (!esAdmin && !esTitular) {
    throw new ApiError(403, 'Solo el administrador o el abogado titular pueden compartir este expediente.');
  }

  const { usuariosIds, usuarioId } = req.body;
  const idsAAgregar = Array.isArray(usuariosIds) ? usuariosIds : usuarioId ? [usuarioId] : [];

  if (!idsAAgregar.length) {
    throw new ApiError(400, 'Debe especificar al menos un abogado para compartir el expediente.');
  }

  const actuales = (expediente.compartidoCon || []).map((id) => String(id));
  idsAAgregar.forEach((id) => {
    if (id && !actuales.includes(String(id))) {
      actuales.push(String(id));
    }
  });

  expediente.compartidoCon = actuales;
  await expediente.save();

  const expActualizado = await Expediente.findById(expediente._id)
    .populate('cliente', 'nombreCompleto cedula telefono')
    .populate('abogadoAsignado', 'nombre email rol')
    .populate('compartidoCon', 'nombre email rol');

  res.json({
    success: true,
    message: 'Expediente compartido exitosamente.',
    data: expActualizado,
  });
});

// DELETE /api/expedientes/:id/compartir/:usuarioId
const desasociarExpedienteCompartido = asyncHandler(async (req, res) => {
  const expediente = await Expediente.findById(req.params.id);
  if (!expediente) throw new ApiError(404, 'Expediente no encontrado.');

  const esAdmin = req.usuario.rol === 'admin';
  const esTitular =
    String(expediente.abogadoAsignado) === String(req.usuario._id) ||
    String(expediente.creadoPor) === String(req.usuario._id);

  if (!esAdmin && !esTitular) {
    throw new ApiError(403, 'Solo el administrador o el titular pueden revocar la compartición.');
  }

  const usuarioIdRevocar = req.params.usuarioId;
  expediente.compartidoCon = (expediente.compartidoCon || []).filter(
    (u) => String(u._id || u) !== String(usuarioIdRevocar)
  );

  await expediente.save();

  res.json({
    success: true,
    message: 'Acceso compartido revocado exitosamente.',
    data: expediente.compartidoCon,
  });
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
  compartirExpediente,
  desasociarExpedienteCompartido,
};
