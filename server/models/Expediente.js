const mongoose = require('mongoose');

// Una cuota individual del plan de pagos / crédito por honorarios
const cuotaSchema = new mongoose.Schema(
  {
    numero: { type: Number, required: true },
    montoEsperado: { type: Number, required: true, min: 0 },
    fechaVencimiento: { type: Date, required: true },
    montoPagado: { type: Number, default: 0, min: 0 },
    pagada: { type: Boolean, default: false },
    fechaPago: { type: Date },
  },
  { _id: false }
);

const expedienteSchema = new mongoose.Schema(
  {
    caratula: {
      type: String,
      required: [true, 'La carátula/caso es obligatoria'],
      trim: true,
    },
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cliente',
      required: [true, 'El cliente es obligatorio'],
    },
    abogadoAsignado: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: [true, 'El abogado asignado es obligatorio'],
    },
    fuero: { type: String, trim: true, default: '' },
    juzgado: { type: String, trim: true, default: '' },
    descripcion: { type: String, default: '' },
    enlaceDocumento: { type: String, trim: true, default: '' },

    fechaInicio: { type: Date, default: Date.now },
    fechaFin: { type: Date },

    estado: {
      type: String,
      enum: ['activo', 'en_proceso', 'suspendido', 'archivado', 'finalizado'],
      default: 'activo',
    },

    // ---- Campos financieros / honorarios ----
    honorariosTotales: { type: Number, default: 0, min: 0 },
    creditoAutomatico: { type: Boolean, default: false },
    entregaInicial: { type: Number, default: 0, min: 0 },
    cantidadCuotas: { type: Number, default: 0, min: 0 },
    frecuenciaCuotas: {
      type: String,
      enum: ['mensual', 'quincenal', 'semanal'],
      default: 'mensual',
    },
    planPagos: { type: [cuotaSchema], default: [] },
    saldoPendiente: { type: Number, default: 0, min: 0 },

    creadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
    },
  },
  { timestamps: true }
);

expedienteSchema.index({ caratula: 'text' });

module.exports = mongoose.model('Expediente', expedienteSchema);
