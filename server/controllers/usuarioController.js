const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Usuario = require('../models/Usuario');

// GET /api/usuarios
const listarUsuarios = asyncHandler(async (req, res) => {
  const usuarios = await Usuario.find().sort({ createdAt: -1 });
  res.json({ success: true, data: usuarios });
});

// POST /api/usuarios  (solo admin)
const crearUsuario = asyncHandler(async (req, res) => {
  const { nombre, email, password, rol } = req.body;

  if (!nombre || !email || !password) {
    throw new ApiError(400, 'Nombre, email y contraseña son obligatorios.');
  }
  if (password.length < 6) {
    throw new ApiError(400, 'La contraseña debe tener al menos 6 caracteres.');
  }
  if (rol && !['admin', 'abogado'].includes(rol)) {
    throw new ApiError(400, 'El rol debe ser "admin" o "abogado".');
  }

  const usuario = await Usuario.create({ nombre, email, password, rol: rol || 'abogado' });
  const usuarioSinPassword = usuario.toObject();
  delete usuarioSinPassword.password;

  res.status(201).json({ success: true, data: usuarioSinPassword });
});

// PUT /api/usuarios/:id  (solo admin)
const actualizarUsuario = asyncHandler(async (req, res) => {
  const { nombre, rol, activo, password } = req.body;
  const usuario = await Usuario.findById(req.params.id);
  if (!usuario) throw new ApiError(404, 'Usuario no encontrado.');

  if (nombre) usuario.nombre = nombre;
  if (rol) usuario.rol = rol;
  if (typeof activo === 'boolean') usuario.activo = activo;
  if (password) {
    if (password.length < 6) throw new ApiError(400, 'La contraseña debe tener al menos 6 caracteres.');
    usuario.password = password;
  }

  await usuario.save();
  const usuarioSinPassword = usuario.toObject();
  delete usuarioSinPassword.password;
  res.json({ success: true, data: usuarioSinPassword });
});

// DELETE /api/usuarios/:id (solo admin)
const eliminarUsuario = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.usuario._id)) {
    throw new ApiError(400, 'No puede eliminar su propio usuario.');
  }
  const usuario = await Usuario.findByIdAndDelete(req.params.id);
  if (!usuario) throw new ApiError(404, 'Usuario no encontrado.');
  res.json({ success: true, message: 'Usuario eliminado correctamente.' });
});

module.exports = { listarUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario };
