const mongoose = require('mongoose');

// Archivos adjuntos de un expediente (.doc/.docx/.pdf). Se almacenan en MongoDB (Buffer).
const documentoSchema = new mongoose.Schema(
  {
    expediente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expediente',
      required: true,
      index: true,
    },
    nombre: { type: String, required: true, trim: true },
    tipo: { type: String, default: '' },
    tamano: { type: Number, default: 0 },
    datos: { type: Buffer, required: true },
    subidoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DocumentoExpediente', documentoSchema, 'documentos_expedientes');
