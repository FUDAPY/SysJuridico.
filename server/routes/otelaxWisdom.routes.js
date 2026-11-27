const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const {
  TIPOS_VALIDOS,
  FUEROS_VALIDOS,
  listarDocumentos,
  obtenerDocumento,
  guardarDocumento,
  eliminarDocumento,
  aprobarDocumento,
  obtenerEstiloForense,
  guardarEstiloForense,
  buscarEnOtelaxWisdom,
} = require('../services/otelaxWisdomService');
const { sincronizarRepoZetti } = require('../services/otelaxwisdomGithubSync');

// Todas las rutas de gestión de conocimiento requieren autenticación
router.use(protect);

/**
 * GET /api/otelaxwisdom/docs
 * Lista documentos .md con filtros por fuero, tipo, visibilidad, subtipo, origen y búsqueda
 */
router.get(
  '/docs',
  asyncHandler(async (req, res) => {
    const { fuero, tipo, visibilidad, subtipo, origen, busqueda } = req.query;
    const docs = listarDocumentos({ fuero, tipo, visibilidad, subtipo, origen, busqueda });
    res.json({
      ok: true,
      tiposValidos: TIPOS_VALIDOS,
      fuerosValidos: FUEROS_VALIDOS,
      total: docs.length,
      docs,
    });
  })
);

/**
 * POST /api/otelaxwisdom/sync-github
 * Ejecuta la sincronización oficial desde el repositorio GitHub ZETTI
 */
router.post(
  '/sync-github',
  asyncHandler(async (req, res) => {
    try {
      const { forzar } = req.body || {};
      const resultado = await sincronizarRepoZetti({ forzar: !!forzar });
      res.json({
        ok: resultado.ok,
        mensaje: resultado.ok
          ? 'Sincronización oficial de legislación paraguaya completada.'
          : 'Sincronización completada con advertencias.',
        resultado,
      });
    } catch (err) {
      console.error('[OtelaxWisdom Sync Route] Error al sincronizar:', err);
      res.status(500).json({
        ok: false,
        mensaje: `Error al sincronizar con GitHub: ${err.message}`,
        error: err.message,
      });
    }
  })
);

/**
 * GET /api/otelaxwisdom/estilo-forense
 * Devuelve el contenido maestro de Estilo Forense del Estudio
 */
router.get(
  '/estilo-forense',
  asyncHandler(async (req, res) => {
    const contenido = obtenerEstiloForense();
    res.json({
      ok: true,
      contenido,
    });
  })
);

/**
 * PUT /api/otelaxwisdom/estilo-forense
 * Actualiza el manual de Estilo Forense del Estudio
 */
router.put(
  '/estilo-forense',
  asyncHandler(async (req, res) => {
    const { contenido } = req.body;
    if (!contenido || !contenido.trim()) {
      throw new ApiError(400, 'El contenido del estilo forense no puede estar vacío.');
    }
    const resultado = guardarEstiloForense(contenido);
    res.json(resultado);
  })
);

/**
 * GET /api/otelaxwisdom/memoria-estudio
 * Lista exclusivamente los documentos de la memoria privada del estudio
 */
router.get(
  '/memoria-estudio',
  asyncHandler(async (req, res) => {
    const { subtipo, busqueda } = req.query;
    const docs = listarDocumentos({
      visibilidad: 'PRIVADO_ESTUDIO',
      subtipo,
      busqueda,
    });
    res.json({
      ok: true,
      total: docs.length,
      docs,
    });
  })
);

/**
 * POST /api/otelaxwisdom/memoria-estudio
 * Guarda un escrito modelo o ficha de expediente en la memoria privada
 */
router.post(
  '/memoria-estudio',
  asyncHandler(async (req, res) => {
    const { titulo, subtipo, contenido, fuero } = req.body;
    if (!titulo || !titulo.trim()) {
      throw new ApiError(400, 'El título es obligatorio.');
    }
    if (!contenido || !contenido.trim()) {
      throw new ApiError(400, 'El contenido no puede estar vacío.');
    }

    const doc = guardarDocumento({
      titulo,
      tipo: 'DOCTRINA',
      fuero: fuero || 'GENERAL',
      contenido,
      visibilidad: 'PRIVADO_ESTUDIO',
      subtipo: subtipo === 'FICHA_EXPEDIENTE' ? 'FICHA_EXPEDIENTE' : 'ESCRITO_MODELO',
      origen: 'MANUAL',
      estado_revision: 'APROBADO',
    });

    res.status(201).json({
      ok: true,
      mensaje: 'Documento registrado en la memoria privada del estudio.',
      doc,
    });
  })
);

/**
 * GET /api/otelaxwisdom/docs/:filename
 * Devuelve el contenido completo de un documento para ver o editar
 */
router.get(
  '/docs/:filename(*)',
  asyncHandler(async (req, res) => {
    const filename = req.params.filename;
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
    const {
      titulo,
      tipo,
      fuero,
      numero_norma,
      fuente,
      url_fuente,
      vigencia,
      contenido,
      visibilidad,
      subtipo,
      origen,
    } = req.body;

    if (!titulo || !titulo.trim()) {
      throw new ApiError(400, 'El título del documento es obligatorio.');
    }
    if (!contenido || !contenido.trim()) {
      throw new ApiError(400, 'El contenido del documento no puede estar vacío.');
    }

    const guardado = guardarDocumento({
      titulo,
      tipo,
      fuero,
      numero_norma,
      fuente,
      url_fuente,
      vigencia,
      contenido,
      visibilidad,
      subtipo,
      origen,
    });

    res.status(201).json({
      ok: true,
      mensaje: 'Documento indexado exitosamente en OtelaxWisdom.',
      doc: guardado,
    });
  })
);

/**
 * PUT /api/otelaxwisdom/docs/:filename/aprobar
 * Aprueba un documento auto-aprendido
 */
router.put(
  '/docs/:filename(*)/aprobar',
  asyncHandler(async (req, res) => {
    const filename = req.params.filename;
    const aprobado = aprobarDocumento(filename);
    if (!aprobado) {
      throw new ApiError(404, 'Documento a aprobar no encontrado.');
    }
    res.json({
      ok: true,
      mensaje: 'Documento aprobado e integrado oficialmente al acervo.',
      doc: aprobado,
    });
  })
);

/**
 * PUT /api/otelaxwisdom/docs/:filename
 * Actualiza un documento .md existente y reindexa
 */
router.put(
  '/docs/:filename(*)',
  asyncHandler(async (req, res) => {
    const filename = req.params.filename;
    const {
      titulo,
      tipo,
      fuero,
      numero_norma,
      fuente,
      url_fuente,
      vigencia,
      contenido,
      visibilidad,
      subtipo,
      origen,
    } = req.body;

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

    const guardado = guardarDocumento({
      titulo,
      tipo: tipo || existente.tipo,
      fuero: fuero || existente.fuero,
      numero_norma: numero_norma !== undefined ? numero_norma : existente.numero_norma,
      fuente: fuente || existente.fuente,
      url_fuente: url_fuente !== undefined ? url_fuente : existente.url_fuente,
      vigencia: vigencia || existente.vigencia,
      contenido,
      filename,
      visibilidad: visibilidad || existente.visibilidad,
      subtipo: subtipo || existente.subtipo,
      origen: origen || existente.origen,
    });

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
  '/docs/:filename(*)',
  asyncHandler(async (req, res) => {
    const filename = req.params.filename;
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
    const { q, maxDocs, minScore, fuero, tipo, visibilidad } = req.query;
    const resultado = buscarEnOtelaxWisdom(q || '', {
      maxDocs: maxDocs ? Number(maxDocs) : 3,
      minScore: minScore ? Number(minScore) : 2,
      fuero,
      tipo,
      visibilidad,
    });
    res.json({
      ok: true,
      ...resultado,
    });
  })
);

module.exports = router;
