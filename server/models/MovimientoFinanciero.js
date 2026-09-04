const mongoose = require('mongoose');

const movimientoSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      enum: ['ingreso', 'egreso'],
      required: true,
      default: 'ingreso',
    },
    concepto: {
      type: String,
      required: [true, 'El concepto del movimiento es obligatorio'],
      trim: true,
    },
    monto: {
      type: Number,
      required: [true, 'El monto es obligatorio'],
      min: 0,
    },
    moneda: {
      type: String,
      default: 'PYG', // Guaraníes
    },
    metodoPago: {
      type: String,
      enum: ['efectivo', 'transferencia', 'tarjeta', 'cheque', 'otro'],
      default: 'efectivo',
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    // Asociaciones opcionales: permite registrar ingresos sin cliente/expediente previo
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
    numeroCuota: { type: Number, default: null },
    registradoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
    },
    notas: { type: String, default: '' },
  },
  { timestamps: true }
);

movimientoSchema.index({ fecha: -1 });

module.exports = mongoose.model('MovimientoFinanciero', movimientoSchema);
