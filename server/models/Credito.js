const mongoose = require('mongoose');

// Créditos / saldos por honorarios migrados desde el sistema anterior (Firestore).
const creditoSchema = new mongoose.Schema(
  {
    cliente: { type: mongoose.Schema.Types.ObjectId, ref: 'Cliente', default: null },
    clienteNombre: { type: String, default: '' },
    expediente: { type: mongoose.Schema.Types.ObjectId, ref: 'Expediente', default: null },
    concepto: { type: String, default: '' },
    montoTotal: { type: Number, default: 0 },
    saldoPendiente: { type: Number, default: 0 },
    origenExpediente: { type: String, default: '' }, // id original en Firestore (referencial)
    firestoreId: { type: String, default: null, index: true },
  },
  { timestamps: true, strict: false }
);

module.exports = mongoose.model('Credito', creditoSchema, 'creditos');
