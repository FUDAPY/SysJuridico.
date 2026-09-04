const mongoose = require('mongoose');

// Cache de resultados obtenidos de fuentes externas (csj.gov.py, baselegal.com.py) para no re-consultar
const lexpyFuenteCacheSchema = new mongoose.Schema(
  {
    consulta: { type: String, required: true, trim: true, index: true },
    fuente: { type: String, required: true }, // csj | baselegal
    urlConsultada: { type: String, default: '' },
    resultado: { type: String, default: '' },
    expiraEn: { type: Date, default: null },
    firestoreId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LexpyFuenteCache', lexpyFuenteCacheSchema, 'lexpy_fuentes_cache');
