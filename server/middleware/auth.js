const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Usuario = require('../models/Usuario');

// Verifica el token JWT enviado en el header Authorization: Bearer <token>
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new ApiError(401, 'No autorizado. Token no proporcionado.');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new ApiError(401, 'Token inválido o expirado.');
  }

  const usuario = await Usuario.findById(payload.id).select('-password');
  if (!usuario || !usuario.activo) {
    throw new ApiError(401, 'Usuario no encontrado o inactivo.');
  }

  req.usuario = usuario;
  next();
});

// Restringe el acceso a los roles indicados: authorize('admin'), authorize('admin', 'abogado')
const authorize = (...rolesPermitidos) => (req, res, next) => {
  if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
    throw new ApiError(403, 'No tiene permisos suficientes para esta acción.');
  }
  next();
};

module.exports = { protect, authorize };
