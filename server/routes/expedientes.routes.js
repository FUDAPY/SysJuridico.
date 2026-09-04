const express = require('express');
const { protect } = require('../middleware/auth');
const {
  listarExpedientes,
  obtenerExpediente,
  crearExpediente,
  actualizarExpediente,
  eliminarExpediente,
} = require('../controllers/expedienteController');

const router = express.Router();

// Accesible para 'admin' y 'abogado'; el filtrado por asignación se resuelve en el controlador
router.use(protect);

router.get('/', listarExpedientes);
router.post('/', crearExpediente);
router.get('/:id', obtenerExpediente);
router.put('/:id', actualizarExpediente);
router.delete('/:id', eliminarExpediente);

module.exports = router;
