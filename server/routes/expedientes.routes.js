const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  listarExpedientes,
  obtenerExpediente,
  crearExpediente,
  actualizarExpediente,
  eliminarExpediente,
  subirDocumento,
  listarDocumentos,
  descargarDocumento,
  eliminarDocumento,
  compartirExpediente,
  desasociarExpedienteCompartido,
} = require('../controllers/expedienteController');
const {
  vincularUsuarioCSJ,
  obtenerEstadoCSJ,
  sincronizarExpedientesCSJ,
} = require('../services/csjSyncService');

const router = express.Router();

// Accesible para 'admin' y 'abogado'; el filtrado por asignación se resuelve en el controlador
router.use(protect);

// ---- Sincronización con Portal CSJ ----
router.get('/csj/estado', async (req, res, next) => {
  try {
    const estado = await obtenerEstadoCSJ({ usuarioId: req.usuario._id });
    res.json({ success: true, data: estado });
  } catch (err) {
    next(err);
  }
});

router.post('/csj/vincular', async (req, res, next) => {
  try {
    const { usuarioCSJ, passwordCSJ, matriculaCSJ } = req.body;
    const resultado = await vincularUsuarioCSJ({
      usuarioId: req.usuario._id,
      usuarioCSJ,
      passwordCSJ,
      matriculaCSJ,
    });
    res.json({ success: true, data: resultado });
  } catch (err) {
    next(err);
  }
});

router.post('/csj/sincronizar', async (req, res, next) => {
  try {
    const resultado = await sincronizarExpedientesCSJ({ usuarioId: req.usuario._id });
    res.json({ success: true, data: resultado });
  } catch (err) {
    next(err);
  }
});

router.get('/', listarExpedientes);
router.post('/', crearExpediente);
router.get('/:id', obtenerExpediente);
// Editar/eliminar expedientes: exclusivo de 'admin'
router.put('/:id', authorize('admin'), actualizarExpediente);
// Compartir expedientes (Administrador o titular de causa)
router.post('/:id/compartir', compartirExpediente);
router.delete('/:id/compartir/:usuarioId', desasociarExpedienteCompartido);

// Documentos adjuntos del expediente (ver/descargar: todos; subir/eliminar: solo admin)
router.get('/:id/documentos', listarDocumentos);
router.post('/:id/documentos', authorize('admin'), subirDocumento);
router.get('/:id/documentos/:docId/descargar', descargarDocumento);
router.delete('/:id/documentos/:docId', authorize('admin'), eliminarDocumento);

module.exports = router;
