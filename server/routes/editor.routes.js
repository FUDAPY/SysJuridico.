/**
 * editor.routes.js
 * Rutas de la API para el Editor Judicial Forense (SysJuridico)
 * - POST /api/v1/editor/export-docx: Genera archivo .docx nativo
 * - POST /api/v1/editor/razonamiento: Genera respuesta Split-Brain
 * - POST /api/v1/editor/analizar-pdf: Analiza PDF de expediente con Gemini 2.5 Pro
 */

const express = require('express');
const router = express.Router();
const editorService = require('../services/editorService');
const Expediente = require('../models/Expediente');
const Usuario = require('../models/Usuario');
const { protect } = require('../middleware/auth');

// Exportación nativa a .docx
router.post('/export-docx', async (req, res, next) => {
  try {
    const { titulo, html, caratula } = req.body;
    if (!html) {
      return res.status(400).json({ error: 'Contenido HTML requerido para exportar a .docx' });
    }

    const bufferDocx = await editorService.generarDocxForense({
      titulo: titulo || 'Escrito_Judicial',
      html,
      caratula,
    });

    const nombreArchivo = (titulo || 'Escrito_Judicial')
      .trim()
      .replace(/[^a-zA-Z0-9_\-]/g, '_') + '.docx';

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(bufferDocx);
  } catch (err) {
    next(err);
  }
});

// Razonamiento dividido (Split-Brain)
router.post('/razonamiento', protect, async (req, res, next) => {
  try {
    const { instruccion, expedienteId } = req.body;
    if (!instruccion) {
      return res.status(400).json({ error: 'Instrucción procesal requerida' });
    }

    let contextoCausa = {};
    if (expedienteId) {
      const exp = await Expediente.findById(expedienteId);
      if (exp) {
        contextoCausa = {
          caratula: exp.caratula,
          numero: exp.numero,
          ano: exp.ano,
          juzgado: exp.juzgado,
          turno: exp.turno,
          juezNombre: exp.juezNombre,
          juezGenero: exp.juezGenero,
        };
      }
    }

    // Datos del abogado en sesión
    const usuario = req.usuario || (await Usuario.findById(req.usuario?._id || req.usuario?.id));
    const usuarioForense = {
      nombreCompleto: usuario?.nombreCompleto || usuario?.nombre,
      matriculaCSJ: usuario?.matriculaCSJ,
      cedula: usuario?.cedula,
    };

    const resultado = await editorService.generarRazonamientoSplitBrain({
      instruccion,
      contextoCausa,
      usuarioForense,
    });

    res.json({
      success: true,
      datos: resultado,
    });
  } catch (err) {
    next(err);
  }
});

// Análisis multimodal de PDF de expediente
router.post('/analizar-pdf', protect, async (req, res, next) => {
  try {
    const { textoExtraido, expedienteId } = req.body;

    const resultado = await editorService.analizarExpedientePDF({
      textoExtraido,
    });

    res.json({
      success: true,
      datos: resultado,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
