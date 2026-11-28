const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: 6,
      select: false,
    },
    rol: {
      type: String,
      enum: {
        values: ['admin', 'abogado', 'asistente'],
        message: 'El rol debe ser "admin", "abogado" o "asistente"',
      },
      required: true,
      default: 'abogado',
    },
    nombreCompleto: {
      type: String,
      trim: true,
      default: '',
    },
    matriculaCSJ: {
      type: String,
      trim: true,
      default: '',
    },
    cedula: {
      type: String,
      trim: true,
      default: '',
    },
    csjCredentialsEncrypted: {
      iv: { type: String, default: '' },
      tag: { type: String, default: '' },
      encryptedData: { type: String, default: '', select: false },
      updatedAt: { type: Date, default: null },
    },
    activo: {
      type: Boolean,
      default: true,
    },
    csjConfig: {
      usuarioCSJ: { type: String, default: '', trim: true },
      passwordCSJ: { type: String, default: '', select: false },
      matriculaCSJ: { type: String, default: '', trim: true },
      conectado: { type: Boolean, default: false },
      ultimaSincronizacion: { type: Date, default: null },
    },
    cuotaUso: {
      limiteTokensMensual: {
        type: Number,
        default: 500000000, // 500M por defecto por abogado (0 = ilimitado solo para admin)
      },
      tokensUsadosMes: {
        type: Number,
        default: 0,
      },
      limiteArchivosMensual: {
        type: Number,
        default: 100,
      },
      archivosUsadosMes: {
        type: Number,
        default: 0,
      },
      periodoActual: {
        type: String,
        default: () => new Date().toISOString().slice(0, 7),
      },
    },
  },
  { timestamps: true }
);

usuarioSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

usuarioSchema.methods.compararPassword = function compararPassword(passwordPlano) {
  return bcrypt.compare(passwordPlano, this.password);
};

// Colección "users" para mantener compatibilidad con los datos migrados desde Firestore
module.exports = mongoose.model('Usuario', usuarioSchema, 'users');
