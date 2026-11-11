const express = require('express');
const { protect } = require('../middleware/auth');
const { chat, listarSesiones, obtenerSesion, validarAprendizaje, redactar, obtenerGrafo, asistenteEditor, obtenerNorma } = require('../controllers/lexpyController');

const router = express.Router();

// LexPY (Chat IA): disponible para 'admin' y 'abogado'
router.use(protect);

router.post('/chat', chat);
router.post('/editor-ai', asistenteEditor);
router.get('/sesiones', listarSesiones);
router.get('/sesiones/:id', obtenerSesion);
router.post('/validar', validarAprendizaje);
router.post('/redactar', redactar);
router.get('/grafo', obtenerGrafo);
router.get('/norma/:id', obtenerNorma);

module.exports = router;

