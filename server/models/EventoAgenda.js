const mongoose = require('mongoose');

const eventoAgendaSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: [true, 'El título del evento es obligatorio'],
      trim: true,
    },
    tipo: {
      type: String,
      enum: ['audiencia', 'reunion', 'vencimiento', 'compromiso', 'otro'],
      default: 'compromiso',
    },
    descripcion: { type: String, default: '' },
    fechaInicio: {
      type: Date,
      required: [true, 'La fecha/hora de inicio es obligatoria'],
    },
    fechaFin: { type: Date },
    todoElDia: { type: Boolean, default: false },
    lugar: { type: String, default: '' },

    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cliente',
      default: null,
    },
    expediente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expediente',
      default: null,
    },
    responsable: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
    },
    estado: {
      type: String,
      enum: ['pendiente', 'completado', 'cancelado'],
      default: 'pendiente',
    },
    creadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
    },
  },
  { timestamps: true }
);

eventoAgendaSchema.index({ fechaInicio: 1 });

module.exports = mongoose.model('EventoAgenda', eventoAgendaSchema);
