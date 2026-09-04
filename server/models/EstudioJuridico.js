const mongoose = require('mongoose');

// Información propia del estudio jurídico (perfil, configuración institucional)
const estudioJuridicoSchema = new mongoose.Schema(
  {
    nombre: { type: String, default: '' },
    ruc: { type: String, default: '' },
    direccion: { type: String, default: '' },
    telefono: { type: String, default: '' },
    email: { type: String, default: '' },
    datosExtra: { type: mongoose.Schema.Types.Mixed, default: {} },
    firestoreId: { type: String, default: null, index: true },
  },
  { timestamps: true, strict: false }
);

module.exports = mongoose.model('EstudioJuridico', estudioJuridicoSchema, 'estudio_juridico');
