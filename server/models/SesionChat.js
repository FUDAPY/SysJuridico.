const mongoose = require('mongoose');

const mensajeSchema = new mongoose.Schema(
  {
    rol: { type: String, enum: ['usuario', 'asistente'], required: true },
    contenido: { type: String, required: true },
    fuenteRespuesta: {
      type: String,
      enum: ['base_local', 'externo_csj', 'externo_baselegal', 'ia_generativa', null],
      default: null,
    },
    fecha: { type: Date, default: Date.now },
  },
  { _id: false }
);

// Historial de conversaciones del chat de IA LexPY, usado también para retroalimentar el aprendizaje
const sesionChatSchema = new mongoose.Schema(
  {
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    titulo: { type: String, default: 'Nueva conversación' },
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', default: null },
    expediente: { type: mongoose.Schema.Types.ObjectId, ref: 'Expediente', default: null },
    mensajes: { type: [mensajeSchema], default: [] },
    firestoreId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SesionChat', sesionChatSchema, 'sesiones_chat');
