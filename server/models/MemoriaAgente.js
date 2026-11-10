const mongoose = require('mongoose');

const memoriaAgenteSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true,
    },
    expediente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expediente',
      default: null,
      index: true,
    },
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cliente',
      default: null,
      index: true,
    },
    tema: {
      type: String,
      trim: true,
      required: true,
    },
    resumen: {
      type: String,
      required: true,
      trim: true,
    },
    entidades: {
      partes: [{ type: String, trim: true }],
      juzgado: { type: String, trim: true },
      pretension: { type: String, trim: true },
      monto: { type: Number, default: 0 },
      fechasClave: [{ type: String, trim: true }],
      normasCitadas: [{ type: String, trim: true }],
    },
    hechosRelevantes: [{ type: String, trim: true }],
    backlinks: [
      {
        nodoId: { type: String, required: true },
        tipo: { type: String, enum: ['ley', 'expediente', 'cliente', 'jurisprudencia', 'concepto'], default: 'concepto' },
        etiqueta: { type: String, required: true },
      },
    ],
    tokensAproximados: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

memoriaAgenteSchema.index({ tema: 'text', resumen: 'text', hechosRelevantes: 'text' });

module.exports = mongoose.model('MemoriaAgente', memoriaAgenteSchema);
