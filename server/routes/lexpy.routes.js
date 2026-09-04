const express = require('express');
const { protect } = require('../middleware/auth');
const { chat, listarSesiones, obtenerSesion, validarAprendizaje, redactar } = require('../controllers/lexpyController');

const router = express.Router();

// LexPY (Chat IA): disponible para 'admin' y 'abogado'
router.use(protect);

router.post('/chat', chat);
router.get('/sesiones', listarSesiones);
router.get('/sesiones/:id', obtenerSesion);
router.post('/validar', validarAprendizaje);
router.post('/redactar', redactar);

module.exports = router;
