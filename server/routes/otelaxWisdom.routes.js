const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const {
  TIPOS_VALIDOS,
  listarDocumentos,
  obtenerDocumento,
  guardarDocumento,
  eliminarDocumento,
  buscarEnOtelaxWisdom,
} = require('../services/otelaxWisdomService');

// Todas las rutas de gestión de conocimiento requieren autenticación
router.use(protect);

/**
 * GET /api/otelaxwisdom/docs
 * Lista todos los documentos .md con título, tipo, nombre de archivo, tamaño y fecha
 */
router.get(
  '/docs',
  asyncHandler(async (req, res) => {
    const { tipo, busqueda } = req.query;
    const docs = listarDocumentos({ tipo, busqueda });
    res.json({
      ok: true,
      tiposValidos: TIPOS_VALIDOS,
      total: docs.length,
      docs,
    });
  })
);

/**
 * GET /api/otelaxwisdom/docs/:filename
 * Devuelve el contenido completo de un documento para ver o editar
 */
router.get(
  '/docs/:filename',
  asyncHandler(async (req, res) => {
    const { filename } = req.params;
    const doc = obtenerDocumento(filename);
    if (!doc) {
      throw new ApiError(404, 'Documento no encontrado en OtelaxWisdom.');
    }
    res.json({
      ok: true,
      doc,
    });
  })
);

/**
 * POST /api/otelaxwisdom/docs
 * Crea un nuevo documento .md y actualiza el índice en memoria al instante
 */
router.post(
  '/docs',
  asyncHandler(async (req, res) => {
    const { titulo, tipo, contenido } = req.body;
    if (!titulo || !titulo.trim()) {
      throw new ApiError(400, 'El título del documento es obligatorio.');
    }
    if (!contenido || !contenido.trim()) {
      throw new ApiError(400, 'El contenido del documento no puede estar vacío.');
    }

    const guardado = guardarDocumento({ titulo, tipo, contenido });
    res.status(201).json({
      ok: true,
      mensaje: 'Documento indexado exitosamente en OtelaxWisdom.',
      doc: guardado,
    });
  })
);

/**
 * PUT /api/otelaxwisdom/docs/:filename
 * Actualiza un documento .md existente y reindexa
 */
router.put(
  '/docs/:filename',
  asyncHandler(async (req, res) => {
    const { filename } = req.params;
    const { titulo, tipo, contenido } = req.body;
    if (!titulo || !titulo.trim()) {
      throw new ApiError(400, 'El título del documento es obligatorio.');
    }
    if (!contenido || !contenido.trim()) {
      throw new ApiError(400, 'El contenido del documento no puede estar vacío.');
    }

    const existente = obtenerDocumento(filename);
    if (!existente) {
      throw new ApiError(404, 'Documento a actualizar no encontrado.');
    }

    const guardado = guardarDocumento({ titulo, tipo, contenido, filename });
    res.json({
      ok: true,
      mensaje: 'Documento actualizado y reindexado exitosamente.',
      doc: guardado,
    });
  })
);

/**
 * DELETE /api/otelaxwisdom/docs/:filename
 * Elimina el archivo .md y reindexa
 */
router.delete(
  '/docs/:filename',
  asyncHandler(async (req, res) => {
    const { filename } = req.params;
    const eliminado = eliminarDocumento(filename);
    if (!eliminado) {
      throw new ApiError(404, 'Documento a eliminar no encontrado.');
    }
    res.json({
      ok: true,
      mensaje: 'Documento eliminado de OtelaxWisdom.',
    });
  })
);

/**
 * GET /api/otelaxwisdom/search
 * Endpoint de prueba de búsqueda semántica/léxica en OtelaxWisdom
 */
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const { q, maxDocs, minScore } = req.query;
    const resultado = buscarEnOtelaxWisdom(q || '', {
      maxDocs: maxDocs ? Number(maxDocs) : 3,
      minScore: minScore ? Number(minScore) : 2,
    });
    res.json({
      ok: true,
      ...resultado,
    });
  })
);

module.exports = router;
