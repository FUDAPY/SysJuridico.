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
    fuente: { type: String, default: '' }, // ej: csj.gov.py, baselegal.com.py, bacn.gov.py
    url: { type: String, default: '' },
    fuero: {
      type: String,
      enum: ['Civil y Comercial', 'Penal', 'Laboral', 'Niñez y Adolescencia', 'Contencioso Administrativo', 'Constitucional', 'Tributario', 'Organización Judicial', 'General'],
      default: 'General',
      index: true,
    },
    estadoNormativo: {
      type: String,
      enum: ['Vigente', 'Derogada', 'Histórica', 'Modificada'],
      default: 'Vigente',
      index: true,
    },
    numeroLey: { type: String, default: '', index: true },
    tags: { type: [String], default: [] },
    firestoreId: { type: String, default: null, index: true }, // referencia al doc original migrado
  },
  { timestamps: true }
);

baseLegalSchema.index({ titulo: 'text', contenido: 'text', tags: 'text' });

module.exports = mongoose.model('BaseLegal', baseLegalSchema, 'base_legal');
