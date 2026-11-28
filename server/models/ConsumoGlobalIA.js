const mongoose = require('mongoose');

const consumoGlobalIASchema = new mongoose.Schema(
  {
    periodo: {
      type: String, // Formato 'YYYY-MM'
      required: true,
      unique: true,
      index: true,
    },
    tokensUsadosGlobal: {
      type: Number,
      default: 0,
      min: 0,
    },
    limiteGlobalTokens: {
      type: Number,
      default: () => {
        const envVal = Number(process.env.GLOBAL_MONTHLY_TOKEN_LIMIT);
        return Number.isFinite(envVal) && envVal > 0 ? envVal : 9500000000; // 9.5B por defecto (margen de seguridad bajo 10B)
      },
    },
    totalPeticiones: {
      type: Number,
      default: 0,
    },
    peticionesDesdeCache: {
      type: Number,
      default: 0,
    },
    alerta80Enviada: {
      type: Boolean,
      default: false,
    },
    alerta98Enviada: {
      type: Boolean,
      default: false,
    },
    ultimaActualizacion: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ConsumoGlobalIA', consumoGlobalIASchema, 'consumo_global_ia');
