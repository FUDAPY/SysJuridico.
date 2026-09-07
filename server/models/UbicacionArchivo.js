const mongoose = require('mongoose');

// Ubicación física de archivos / carpetas del estudio (migrado desde Firestore).
const ubicacionArchivoSchema = new mongoose.Schema(
  {
    nombre: { type: String, default: '' },
    ubicacion: { type: String, default: '' },
    firestoreId: { type: String, default: null, index: true },
  },
  { timestamps: true, strict: false }
);

module.exports = mongoose.model('UbicacionArchivo', ubicacionArchivoSchema, 'ubicacion_archivos');
