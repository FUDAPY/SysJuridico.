const mongoose = require('mongoose');

const FUEROS_VALIDOS = [
  'CIVIL',
  'PENAL',
  'LABORAL',
  'FAMILIA',
  'NINEZ',
  'TRIBUTARIO',
  'CONTENCIOSO',
  'CONSTITUCIONAL',
  'ORG_JUDICIAL',
  'INTERNACIONAL',
];

const articuloSchema = new mongoose.Schema(
  {
    numero: { type: String, required: true, trim: true },
    texto: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const baseLegalSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: true, trim: true },
    categoria: {
      type: String,
      enum: ['ley', 'codigo', 'jurisprudencia', 'doctrina', 'resolucion', 'tratado', 'otro'],
      default: 'ley',
    },
    fuero: {
      type: String,
      enum: FUEROS_VALIDOS,
      required: true,
      index: true,
    },
    estado: {
      type: String,
      enum: ['VIGENTE', 'MODIFICADA', 'DEROGADA'],
      default: 'VIGENTE',
      index: true,
    },
    numeroLey: { type: String, default: '', index: true },
    contenido: { type: String, required: true },
    articulos: { type: [articuloSchema], default: [] },
    fuenteOficialUrl: { type: String, default: '' },
    fuente: { type: String, default: 'BACN' },
    modificaA: { type: [String], default: [] },
    derogaA: { type: [String], default: [] },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

baseLegalSchema.index({ titulo: 'text', contenido: 'text', tags: 'text' });
baseLegalSchema.index({ fuero: 1, estado: 1 });

module.exports = mongoose.model('BaseLegal', baseLegalSchema, 'base_legal');
module.exports.FUEROS_VALIDOS = FUEROS_VALIDOS;
