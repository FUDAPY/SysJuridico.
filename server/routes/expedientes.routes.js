const express = require('express');
const { protect } = require('../middleware/auth');
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
} = require('../controllers/expedienteController');

const router = express.Router();

// Accesible para 'admin' y 'abogado'; el filtrado por asignación se resuelve en el controlador
router.use(protect);

router.get('/', listarExpedientes);
router.post('/', crearExpediente);
router.get('/:id', obtenerExpediente);
router.put('/:id', actualizarExpediente);
router.delete('/:id', eliminarExpediente);

// Documentos adjuntos del expediente
router.get('/:id/documentos', listarDocumentos);
router.post('/:id/documentos', subirDocumento);
router.get('/:id/documentos/:docId/descargar', descargarDocumento);
router.delete('/:id/documentos/:docId', eliminarDocumento);

module.exports = router;
