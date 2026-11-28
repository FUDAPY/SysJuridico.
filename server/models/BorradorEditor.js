const mongoose = require('mongoose');

const borradorEditorSchema = new mongoose.Schema(
  {
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
      index: true,
    },
    expediente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expediente',
      default: null,
      index: true,
    },
    titulo: { type: String, default: 'Escrito Judicial', trim: true },
    contenidoHtml: { type: String, default: '' },
    contenidoTexto: { type: String, default: '' },
    versionActual: { type: Number, default: 1 },
    versiones: [
      {
        version: { type: Number, default: 1 },
        fecha: { type: Date, default: Date.now },
        titulo: { type: String, default: '' },
        contenidoHtml: { type: String, default: '' },
        contenidoTexto: { type: String, default: '' },
        autor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
        autorNombre: { type: String, default: '' },
      },
    ],
    documentoExpediente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentoExpediente',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BorradorEditor', borradorEditorSchema, 'borradores_editor');
