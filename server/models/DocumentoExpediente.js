const mongoose = require('mongoose');

// Archivos adjuntos de un expediente (.doc/.docx/.pdf/.png/.jpg). Se almacenan en MongoDB (Buffer).
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

    // ---- Campos de Inteligencia Documental & RAG ----
    textoExtraido: { type: String, default: '', trim: true },
    resumenIA: { type: String, default: '', trim: true },
    entidadesClave: [{ type: String, trim: true }],
    esEscaneado: { type: Boolean, default: false },
    paginas: { type: Number, default: 1 },
  },
  { timestamps: true }
);

documentoSchema.index({ nombre: 'text', textoExtraido: 'text', resumenIA: 'text' });

module.exports = mongoose.model('DocumentoExpediente', documentoSchema, 'documentos_expedientes');

