const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  listarClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
} = require('../controllers/clienteController');

const router = express.Router();

router.use(protect);

// Lectura: cualquier usuario autenticado (el abogado necesita seleccionar clientes al crear expedientes)
router.get('/', listarClientes);
router.get('/:id', obtenerCliente);

// Gestión (crear/editar/eliminar clientes): exclusiva del rol 'admin'
router.post('/', authorize('admin'), crearCliente);
router.put('/:id', authorize('admin'), actualizarCliente);
router.delete('/:id', authorize('admin'), eliminarCliente);

module.exports = router;
