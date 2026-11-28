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

// Guardado y versionado automático de escritos en MongoDB y Expedientes
router.post('/guardar', protect, async (req, res, next) => {
  try {
    const { borradorId, expedienteId, titulo, contenidoHtml, contenidoTexto } = req.body;
    const BorradorEditor = require('../models/BorradorEditor');
    const DocumentoExpediente = require('../models/DocumentoExpediente');
    const Expediente = require('../models/Expediente');
    const { actualizarRespaldoMdExpediente } = require('../services/memoriaRouterService');

    let borrador = null;
    if (borradorId) {
      borrador = await BorradorEditor.findOne({ _id: borradorId, usuario: req.usuario._id });
    }

    const tituloFinal = (titulo || 'Escrito Judicial').trim();
    const textoLimpio = contenidoTexto || (contenidoHtml ? contenidoHtml.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim() : '');

    if (borrador) {
      // Guardar versión anterior en historial
      borrador.versiones.push({
        version: borrador.versionActual,
        fecha: new Date(),
        titulo: borrador.titulo,
        contenidoHtml: borrador.contenidoHtml,
        contenidoTexto: borrador.contenidoTexto,
        autor: req.usuario._id,
        autorNombre: req.usuario.nombre || req.usuario.nombreCompleto || 'Abogado',
      });
      borrador.versionActual += 1;
      borrador.titulo = tituloFinal;
      borrador.contenidoHtml = contenidoHtml || '';
      borrador.contenidoTexto = textoLimpio;
      if (expedienteId) borrador.expediente = expedienteId;
      await borrador.save();
    } else {
      borrador = await BorradorEditor.create({
        usuario: req.usuario._id,
        expediente: expedienteId || null,
        titulo: tituloFinal,
        contenidoHtml: contenidoHtml || '',
        contenidoTexto: textoLimpio,
        versionActual: 1,
        versiones: [],
      });
    }

    // Si está vinculado a un expediente, registrar en DocumentoExpediente y cronología de la causa
    let documentoExpedienteId = null;
    if (expedienteId) {
      const exp = await Expediente.findById(expedienteId);
      if (exp) {
        const bufferHtml = Buffer.from(contenidoHtml || '', 'utf8');
        const nombreArchivo = `${tituloFinal.replace(/[^a-zA-Z0-9_\-\s]/g, '')}_v${borrador.versionActual}.html`;

        let docExp = null;
        if (borrador.documentoExpediente) {
          docExp = await DocumentoExpediente.findById(borrador.documentoExpediente);
        }

        if (docExp) {
          docExp.versiones.push({
            version: docExp.version,
            fecha: new Date(),
            autor: req.usuario._id,
            autorNombre: req.usuario.nombre || req.usuario.nombreCompleto || 'Abogado',
            texto: docExp.textoExtraido,
            titulo: docExp.nombre,
          });
          docExp.version += 1;
          docExp.nombre = nombreArchivo;
          docExp.datos = bufferHtml;
          docExp.tamano = bufferHtml.length;
          docExp.textoExtraido = textoLimpio;
          docExp.textoExtraidoAt = new Date();
          await docExp.save();
        } else {
          docExp = await DocumentoExpediente.create({
            expediente: exp._id,
            nombre: nombreArchivo,
            tipo: 'text/html',
            tamano: bufferHtml.length,
            datos: bufferHtml,
            subidoPor: req.usuario._id,
            textoExtraido: textoLimpio,
            textoExtraidoAt: new Date(),
            resumenIA: `Escrito judicial: ${tituloFinal} (v${borrador.versionActual})`,
            esEscaneado: false,
            esEscritoEditor: true,
            version: borrador.versionActual,
            paginas: 1,
          });
          borrador.documentoExpediente = docExp._id;
          await borrador.save();
        }

        documentoExpedienteId = docExp._id;

        // Registrar hito en cronología / memoria persistente
        exp.memoriaPersistente.push({
          fecha: new Date(),
          tipo: 'ESCRITO_EDITOR',
          titulo: `${tituloFinal} (v${borrador.versionActual})`,
          resumenHechosYDecisiones: `Escrito redactado desde el Editor Forense (v${borrador.versionActual}): ${textoLimpio.slice(0, 300)}...`,
          plazosDetectados: [],
          archivosAsociados: [nombreArchivo],
          documentoId: docExp._id,
          autor: req.usuario._id,
          autorNombre: req.usuario.nombre || req.usuario.nombreCompleto || 'Abogado',
        });

        exp.ultimaActuacionTexto = `Escrito: ${tituloFinal} (v${borrador.versionActual})`;
        await exp.save();
        await actualizarRespaldoMdExpediente(exp);
      }
    }

    res.json({
      success: true,
      data: {
        borradorId: borrador._id,
        versionActual: borrador.versionActual,
        titulo: borrador.titulo,
        expedienteId: borrador.expediente,
        documentoExpedienteId,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Listado de borradores del usuario
router.get('/borradores', protect, async (req, res, next) => {
  try {
    const BorradorEditor = require('../models/BorradorEditor');
    const filtro = { usuario: req.usuario._id };
    if (req.query.expedienteId) {
      filtro.expediente = req.query.expedienteId;
    }
    const borradores = await BorradorEditor.find(filtro)
      .populate('expediente', 'caratula numero ano juzgado fuero')
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ success: true, data: borradores });
  } catch (err) {
    next(err);
  }
});

// Obtener un borrador específico
router.get('/borradores/:id', protect, async (req, res, next) => {
  try {
    const BorradorEditor = require('../models/BorradorEditor');
    const borrador = await BorradorEditor.findOne({ _id: req.params.id, usuario: req.usuario._id })
      .populate('expediente', 'caratula numero ano juzgado fuero');
    if (!borrador) return res.status(404).json({ success: false, error: 'Borrador no encontrado' });
    res.json({ success: true, data: borrador });
  } catch (err) {
    next(err);
  }
});

// Restaurar versión específica de un borrador
router.post('/borradores/:id/restaurar/:versionNum', protect, async (req, res, next) => {
  try {
    const BorradorEditor = require('../models/BorradorEditor');
    const versionNum = parseInt(req.params.versionNum, 10);
    const borrador = await BorradorEditor.findOne({ _id: req.params.id, usuario: req.usuario._id });
    if (!borrador) return res.status(404).json({ success: false, error: 'Borrador no encontrado' });

    const verDeseada = borrador.versiones.find((v) => v.version === versionNum);
    if (!verDeseada) return res.status(404).json({ success: false, error: 'Versión no encontrada en el historial' });

    // Guardar versión actual antes de restaurar
    borrador.versiones.push({
      version: borrador.versionActual,
      fecha: new Date(),
      titulo: borrador.titulo,
      contenidoHtml: borrador.contenidoHtml,
      contenidoTexto: borrador.contenidoTexto,
      autor: req.usuario._id,
      autorNombre: req.usuario.nombre || req.usuario.nombreCompleto || 'Abogado',
    });

    borrador.versionActual += 1;
    borrador.contenidoHtml = verDeseada.contenidoHtml;
    borrador.contenidoTexto = verDeseada.contenidoTexto;
    if (verDeseada.titulo) borrador.titulo = verDeseada.titulo;
    await borrador.save();

    res.json({
      success: true,
      data: {
        borradorId: borrador._id,
        versionActual: borrador.versionActual,
        titulo: borrador.titulo,
        contenidoHtml: borrador.contenidoHtml,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

