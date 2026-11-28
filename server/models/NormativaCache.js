const mongoose = require('mongoose');

const normativaCacheSchema = new mongoose.Schema(
  {
    hashPregunta: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    preguntaNormalizada: {
      type: String,
      required: true,
      trim: true,
    },
    respuesta: {
      type: String,
      required: true,
    },
    fuente: {
      type: String,
      default: 'otelaxwisdom_cache',
    },
    docsOtelax: {
      type: Array,
      default: [],
    },
    contadorAccesos: {
      type: Number,
      default: 1,
    },
    tokensAhorrados: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 * 7, // TTL de 7 días
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NormativaCache', normativaCacheSchema, 'normativa_cache');
