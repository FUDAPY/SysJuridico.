const express = require('express');
const rateLimit = require('express-rate-limit');
const { login, perfil } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Máximo 10 intentos de login por IP cada 15 minutos, para mitigar fuerza bruta
const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Demasiados intentos de inicio de sesión. Intente nuevamente más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', limitadorLogin, login);
router.get('/me', protect, perfil);

module.exports = router;
