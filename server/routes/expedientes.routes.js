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

// ---- Sincronización con Portal CSJ (Rutas declaradas antes de /:id para evitar colisiones) ----
const consultarCredencialesCSJ = async (req, res, next) => {
  try {
    const estado = await obtenerEstadoCSJ({ usuarioId: req.usuario._id });
    const payload = {
      ok: true,
      success: true,
      conectado: Boolean(estado.conectado),
      tieneCredenciales: Boolean(estado.conectado),
      usuario: estado.usuarioCSJ || '',
      usuarioCSJ: estado.usuarioCSJ || '',
      matriculaCSJ: estado.matriculaCSJ || '',
      credenciales: {
        usuario: estado.usuarioCSJ || '',
        matricula: estado.matriculaCSJ || '',
        conectado: Boolean(estado.conectado),
        ultimaSincronizacion: estado.ultimaSincronizacion || null,
      },
      totalExpedientesCSJ: estado.totalExpedientesCSJ || 0,
      ultimaSincronizacion: estado.ultimaSincronizacion || null,
    };
    res.json({
      ...payload,
      data: payload,
    });
  } catch (err) {
    next(err);
  }
};

const guardarCredencialesCSJHandler = async (req, res, next) => {
  try {
    const usuarioCSJ = req.body.usuarioCSJ || req.body.usuario || '';
    const passwordCSJ = req.body.passwordCSJ || req.body.password || '';
    const matriculaCSJ = req.body.matriculaCSJ || req.body.matricula || '';

    if (!usuarioCSJ || !passwordCSJ) {
      return res.status(400).json({
        ok: false,
        success: false,
        error: 'El usuario y la contraseña del portal CSJ son obligatorios.',
        message: 'El usuario y la contraseña del portal CSJ son obligatorios.',
      });
    }

    const resultado = await vincularUsuarioCSJ({
      usuarioId: req.usuario._id,
      usuarioCSJ,
      passwordCSJ,
      matriculaCSJ,
    });

    const payload = {
      ok: true,
      success: true,
      conectado: true,
      tieneCredenciales: true,
      usuario: resultado.usuarioCSJ,
      usuarioCSJ: resultado.usuarioCSJ,
      matriculaCSJ: resultado.matriculaCSJ,
      credenciales: {
        usuario: resultado.usuarioCSJ,
        matricula: resultado.matriculaCSJ,
        conectado: true,
        ultimaSincronizacion: resultado.ultimaSincronizacion,
      },
      totalExpedientesCSJ: resultado.totalExpedientesCSJ || 0,
    };

    res.json({
      ...payload,
      data: payload,
    });
  } catch (err) {
    next(err);
  }
};

// Rutas canónicas para credenciales CSJ
router.get('/csj/credenciales', consultarCredencialesCSJ);
router.post('/csj/credenciales', guardarCredencialesCSJHandler);
router.put('/csj/credenciales', guardarCredencialesCSJHandler);

// Rutas de compatibilidad hacia atrás
router.get('/csj/estado', consultarCredencialesCSJ);
router.post('/csj/vincular', guardarCredencialesCSJHandler);

router.post('/csj/sincronizar', async (req, res, next) => {
  try {
    const resultado = await sincronizarExpedientesCSJ({ usuarioId: req.usuario._id });
    res.json({
      ok: true,
      success: true,
      ...resultado,
      data: resultado,
    });
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
