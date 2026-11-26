const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Usuario = require('../models/Usuario');

function generarToken(usuario) {
  return jwt.sign({ id: usuario._id, rol: usuario.rol }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

const DOMICILIO_PROCESAL_GLOBAL = 'Edificio BIJ, Av. Camilo Recalde c/ Capitán Miranda, Microcentro, Ciudad del Este';

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
  const nombreCompleto = usuario.nombreCompleto || usuario.nombre || '';
  const perfilForenseCompleto = Boolean(nombreCompleto && usuario.matriculaCSJ && usuario.cedula);

  res.json({
    success: true,
    token,
    usuario: {
      id: usuario._id,
      nombre: usuario.nombre,
      nombreCompleto,
      matriculaCSJ: usuario.matriculaCSJ || '',
      cedula: usuario.cedula || '',
      rol: usuario.rol,
      email: usuario.email,
      perfilForenseCompleto,
    },
    configEstudio: {
      domicilioProcesal: DOMICILIO_PROCESAL_GLOBAL,
    },
  });
});

// GET /api/auth/me
const perfil = asyncHandler(async (req, res) => {
  const u = req.usuario;
  const nombreCompleto = u.nombreCompleto || u.nombre || '';
  const perfilForenseCompleto = Boolean(nombreCompleto && u.matriculaCSJ && u.cedula);

  res.json({
    success: true,
    usuario: {
      ...u.toObject ? u.toObject() : u,
      nombreCompleto,
      perfilForenseCompleto,
    },
    configEstudio: {
      domicilioProcesal: DOMICILIO_PROCESAL_GLOBAL,
    },
  });
});

// PUT /api/auth/perfil-forense
const actualizarPerfilForense = asyncHandler(async (req, res) => {
  const { nombreCompleto, matriculaCSJ, cedula } = req.body;
  if (!nombreCompleto || !matriculaCSJ || !cedula) {
    throw new ApiError(400, 'Nombre Completo, Matrícula C.S.J. y Cédula son obligatorios para el ejercicio forense.');
  }

  const usuario = await Usuario.findById(req.usuario._id);
  if (!usuario) throw new ApiError(404, 'Usuario no encontrado');

  usuario.nombreCompleto = nombreCompleto.trim();
  usuario.nombre = usuario.nombre || usuario.nombreCompleto;
  usuario.matriculaCSJ = String(matriculaCSJ).trim();
  usuario.cedula = String(cedula).trim();
  await usuario.save();

  res.json({
    success: true,
    message: 'Perfil forense actualizado con éxito',
    usuario: {
      id: usuario._id,
      nombre: usuario.nombre,
      nombreCompleto: usuario.nombreCompleto,
      matriculaCSJ: usuario.matriculaCSJ,
      cedula: usuario.cedula,
      rol: usuario.rol,
      email: usuario.email,
      perfilForenseCompleto: true,
    },
  });
});

// GET /api/v1/config/estudio
const obtenerConfigEstudio = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      estudio: 'LIN GROUP & ASOCIADOS — SYSJURÍDICO',
      domicilioProcesal: DOMICILIO_PROCESAL_GLOBAL,
      ciudad: 'Ciudad del Este',
      departamento: 'Alto Paraná',
      pais: 'Paraguay',
      jurisdiccion: 'Circunscripción Judicial de Alto Paraná / República del Paraguay',
    },
  });
});

module.exports = { login, perfil, actualizarPerfilForense, obtenerConfigEstudio, DOMICILIO_PROCESAL_GLOBAL };
