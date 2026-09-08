const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { listarEventos, crearEvento, actualizarEvento, eliminarEvento } = require('../controllers/agendaController');

const router = express.Router();

router.use(protect);
router.get('/', listarEventos);
router.post('/', crearEvento);
// Editar/eliminar eventos: exclusivo de 'admin'
router.put('/:id', authorize('admin'), actualizarEvento);
router.delete('/:id', authorize('admin'), eliminarEvento);

module.exports = router;
