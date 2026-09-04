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
        values: ['admin', 'abogado'],
        message: 'El rol debe ser "admin" o "abogado"',
      },
      required: true,
      default: 'abogado',
    },
    activo: {
      type: Boolean,
      default: true,
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
