const mongoose = require('mongoose');

const conceptoSchema = new mongoose.Schema(
  {
    concepto: { type: String, required: true },
    detalle: { type: String, default: '' },
    monto: { type: Number, required: true },
  },
  { _id: false }
);

// Liquidación laboral calculada, opcionalmente asociada a un cliente/expediente existente
const liquidacionLaboralSchema = new mongoose.Schema(
  {
    tipoLiquidacion: {
      type: String,
      enum: ['despido_injustificado', 'renuncia_voluntaria', 'despido_justificado', 'fin_contrato_jubilacion'],
      required: true,
    },
    fechaIngreso: { type: Date, required: true },
    fechaSalida: { type: Date, required: true },
    salarioMensual: { type: Number, required: true, min: 0 },
    salarioPromedio6Meses: { type: Number, default: 0, min: 0 },
    preavisoOmitido: { type: Boolean, default: false },

    antiguedad: {
      anios: Number,
      meses: Number,
      dias: Number,
      totalDias: Number,
    },
    salarioDiario: { type: Number, default: 0 },
    conceptos: { type: [conceptoSchema], default: [] },
    totalGeneral: { type: Number, required: true },

    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', default: null },
    expediente: { type: mongoose.Schema.Types.ObjectId, ref: 'Expediente', default: null },
    calculadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LiquidacionLaboral', liquidacionLaboralSchema);
