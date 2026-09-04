const mongoose = require('mongoose');

// Conocimiento aprendido automáticamente a partir de interacciones validadas del chat LexPY
const aprendizajeSchema = new mongoose.Schema(
  {
    pregunta: { type: String, required: true, trim: true },
    respuesta: { type: String, required: true },
    origen: {
      type: String,
      enum: ['local', 'externo_csj', 'externo_baselegal', 'manual', 'ia_generativa'],
      default: 'manual',
    },
    validado: { type: Boolean, default: false },
    validadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', default: null },
    vecesUtilizado: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    firestoreId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

aprendizajeSchema.index({ pregunta: 'text', respuesta: 'text', tags: 'text' });

module.exports = mongoose.model('AprendizajeSistema', aprendizajeSchema, 'aprendizajes_sistema');
