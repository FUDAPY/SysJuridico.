const mongoose = require('mongoose');

// Conocimiento base legal (leyes, códigos, jurisprudencia) usado como fuente RAG local
const baseLegalSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true, trim: true },
    categoria: {
      type: String,
      enum: ['ley', 'codigo', 'jurisprudencia', 'doctrina', 'resolucion', 'otro'],
      default: 'otro',
    },
    contenido: { type: String, required: true },
    fuente: { type: String, default: '' }, // ej: csj.gov.py, baselegal.com.py
    url: { type: String, default: '' },
    tags: { type: [String], default: [] },
    firestoreId: { type: String, default: null, index: true }, // referencia al doc original migrado
  },
  { timestamps: true }
);

baseLegalSchema.index({ titulo: 'text', contenido: 'text', tags: 'text' });

module.exports = mongoose.model('BaseLegal', baseLegalSchema, 'base_legal');
