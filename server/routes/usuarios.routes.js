const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  listarUsuarios,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
} = require('../controllers/usuarioController');

const router = express.Router();

// Gestión de usuarios y roles: exclusiva del rol 'admin'
router.use(protect, authorize('admin'));

router.get('/', listarUsuarios);
router.post('/', crearUsuario);
router.put('/:id', actualizarUsuario);
router.delete('/:id', eliminarUsuario);

module.exports = router;
