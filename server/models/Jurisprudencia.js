const mongoose = require('mongoose');
const { FUEROS_VALIDOS } = require('./BaseLegal');

const jurisprudenciaSchema = new mongoose.Schema(
  {
    caratula: { type: String, required: true, trim: true },
    tipoResolucion: {
      type: String,
      enum: ['Acuerdo y Sentencia', 'Auto Interlocutorio', 'Sentencia Internacional', 'Opinion Consultiva', 'Resolucion', 'Otro'],
      default: 'Acuerdo y Sentencia',
      index: true,
    },
    numeroResolucion: { type: String, default: '', index: true },
    ano: { type: Number, index: true },
    fechaResolucion: { type: Date, default: null },
    fuero: {
      type: String,
      enum: FUEROS_VALIDOS,
      required: true,
      index: true,
    },
    tribunal: { type: String, default: 'Corte Suprema de Justicia del Paraguay' },
    sala: { type: String, default: '' },
    magistrados: { type: [String], default: [] },
    contenido: { type: String, required: true },
    doctrinaSumario: { type: String, default: '' },
    fuenteOficialUrl: { type: String, default: '' },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

jurisprudenciaSchema.index({ caratula: 'text', contenido: 'text', doctrinaSumario: 'text', tags: 'text' });
jurisprudenciaSchema.index({ fuero: 1, tipoResolucion: 1, ano: -1 });

module.exports = mongoose.model('Jurisprudencia', jurisprudenciaSchema, 'jurisprudencia');
