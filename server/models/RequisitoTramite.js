const mongoose = require('mongoose');

// Requisitos y trámites ofrecidos por el estudio (migrado desde Firestore).
const requisitoTramiteSchema = new mongoose.Schema(
  {
    titulo: { type: String, default: '' },
    categoria: { type: String, default: '' },
    requisitos: { type: String, default: '' },
    costo: { type: Number, default: 0 },
    firestoreId: { type: String, default: null, index: true },
  },
  { timestamps: true, strict: false }
);

module.exports = mongoose.model('RequisitoTramite', requisitoTramiteSchema, 'requisitos_tramites');
