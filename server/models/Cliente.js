const mongoose = require('mongoose');

const clienteSchema = new mongoose.Schema(
  {
    nombreCompleto: {
      type: String,
      required: [true, 'El nombre completo es obligatorio'],
      trim: true,
    },
    cedula: {
      type: String,
      required: [true, 'La cédula de identidad es obligatoria'],
      unique: true,
      trim: true,
    },
    telefono: {
      type: String,
      required: [true, 'El teléfono es obligatorio'],
      trim: true,
    },
    direccion: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    notas: {
      type: String,
      default: '',
    },
    creadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
    },
  },
  { timestamps: true }
);

clienteSchema.index({ nombreCompleto: 'text', cedula: 'text', telefono: 'text' });

module.exports = mongoose.model('Cliente', clienteSchema);
