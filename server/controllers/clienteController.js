const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Cliente = require('../models/Cliente');

// GET /api/clientes?buscar=texto
const listarClientes = asyncHandler(async (req, res) => {
  const { buscar } = req.query;
  const filtro = buscar
    ? {
        $or: [
          { nombreCompleto: { $regex: buscar, $options: 'i' } },
          { cedula: { $regex: buscar, $options: 'i' } },
          { telefono: { $regex: buscar, $options: 'i' } },
        ],
      }
    : {};

  const clientes = await Cliente.find(filtro).sort({ createdAt: -1 });
  res.json({ success: true, data: clientes });
});

// GET /api/clientes/:id
const obtenerCliente = asyncHandler(async (req, res) => {
  const cliente = await Cliente.findById(req.params.id);
  if (!cliente) throw new ApiError(404, 'Cliente no encontrado.');
  res.json({ success: true, data: cliente });
});

// POST /api/clientes
const crearCliente = asyncHandler(async (req, res) => {
  const { nombreCompleto, cedula, telefono, direccion, email, notas } = req.body;

  if (!nombreCompleto || !cedula || !telefono) {
    throw new ApiError(400, 'Nombre completo, cédula y teléfono son obligatorios.');
  }

  const cliente = await Cliente.create({
    nombreCompleto,
    cedula,
    telefono,
    direccion,
    email,
    notas,
    creadoPor: req.usuario?._id,
  });

  res.status(201).json({ success: true, data: cliente });
});

// PUT /api/clientes/:id
const actualizarCliente = asyncHandler(async (req, res) => {
  const cliente = await Cliente.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!cliente) throw new ApiError(404, 'Cliente no encontrado.');
  res.json({ success: true, data: cliente });
});

// DELETE /api/clientes/:id
const eliminarCliente = asyncHandler(async (req, res) => {
  const cliente = await Cliente.findByIdAndDelete(req.params.id);
  if (!cliente) throw new ApiError(404, 'Cliente no encontrado.');
  res.json({ success: true, message: 'Cliente eliminado correctamente.' });
});

module.exports = { listarClientes, obtenerCliente, crearCliente, actualizarCliente, eliminarCliente };
