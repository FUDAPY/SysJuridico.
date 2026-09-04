const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { listarMovimientos, registrarMovimiento, eliminarMovimiento } = require('../controllers/movimientoController');

const router = express.Router();

router.use(protect);

// Registrar ingresos/egresos: admin y abogado (para cobros de sus expedientes/créditos)
router.post('/', registrarMovimiento);
// Vista global de movimientos: exclusiva de 'admin'
router.get('/', authorize('admin'), listarMovimientos);
router.delete('/:id', authorize('admin'), eliminarMovimiento);

module.exports = router;
