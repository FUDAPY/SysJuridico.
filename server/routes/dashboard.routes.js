const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { resumenCompleto, resumenDelDia } = require('../controllers/dashboardController');

const router = express.Router();

router.use(protect);

// Resumen del día: disponible para 'admin' y 'abogado'
router.get('/mi-dia', resumenDelDia);
// Resumen completo con métricas globales: exclusivo de 'admin'
router.get('/', authorize('admin'), resumenCompleto);

module.exports = router;
