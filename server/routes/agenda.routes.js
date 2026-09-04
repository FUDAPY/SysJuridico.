const express = require('express');
const { protect } = require('../middleware/auth');
const { listarEventos, crearEvento, actualizarEvento, eliminarEvento } = require('../controllers/agendaController');

const router = express.Router();

router.use(protect);
router.get('/', listarEventos);
router.post('/', crearEvento);
router.put('/:id', actualizarEvento);
router.delete('/:id', eliminarEvento);

module.exports = router;
