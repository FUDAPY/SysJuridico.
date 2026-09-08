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
} = require('../controllers/expedienteController');

const router = express.Router();

// Accesible para 'admin' y 'abogado'; el filtrado por asignación se resuelve en el controlador
router.use(protect);

router.get('/', listarExpedientes);
router.post('/', crearExpediente);
router.get('/:id', obtenerExpediente);
// Editar/eliminar expedientes: exclusivo de 'admin'
router.put('/:id', authorize('admin'), actualizarExpediente);
router.delete('/:id', authorize('admin'), eliminarExpediente);

// Documentos adjuntos del expediente (ver/descargar: todos; subir/eliminar: solo admin)
router.get('/:id/documentos', listarDocumentos);
router.post('/:id/documentos', authorize('admin'), subirDocumento);
router.get('/:id/documentos/:docId/descargar', descargarDocumento);
router.delete('/:id/documentos/:docId', authorize('admin'), eliminarDocumento);

module.exports = router;
