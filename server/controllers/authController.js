const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Usuario = require('../models/Usuario');

function generarToken(usuario) {
  return jwt.sign({ id: usuario._id, rol: usuario.rol }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email y contraseña son obligatorios.');
  }

  const usuario = await Usuario.findOne({ email: email.toLowerCase() }).select('+password');
  if (!usuario || !usuario.activo) {
    throw new ApiError(401, 'Credenciales inválidas.');
  }

  const passwordValida = await usuario.compararPassword(password);
  if (!passwordValida) {
    throw new ApiError(401, 'Credenciales inválidas.');
  }

  const token = generarToken(usuario);

  res.json({
    success: true,
    token,
    usuario: {
      id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    },
  });
});

// GET /api/auth/me
const perfil = asyncHandler(async (req, res) => {
  res.json({ success: true, usuario: req.usuario });
});

module.exports = { login, perfil };
