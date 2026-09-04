const express = require('express');
const { protect } = require('../middleware/auth');
const { calcular, guardar, listar, obtener } = require('../controllers/liquidacionController');

const router = express.Router();

router.use(protect);
router.post('/calcular', calcular);
router.get('/', listar);
router.post('/', guardar);
router.get('/:id', obtener);

module.exports = router;
