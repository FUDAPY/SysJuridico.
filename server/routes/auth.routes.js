const express = require('express');
const { login, perfil } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.get('/me', protect, perfil);

module.exports = router;
