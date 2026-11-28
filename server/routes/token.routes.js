const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  obtenerEstadoConsumo,
  obtenerRankingConsumo,
  actualizarCuotaAbogado,
} = require('../services/tokenAccountingService');

// GET /api/tokens/estado: Estado del usuario actual y global
router.get('/estado', protect, async (req, res, next) => {
  try {
    const estado = await obtenerEstadoConsumo({
      usuarioId: req.usuario._id,
      rol: req.usuario.rol,
    });
    res.json({ success: true, data: estado });
  } catch (err) {
    next(err);
  }
});

// GET /api/tokens/ranking: Ranking de consumo por abogado (solo admin)
router.get('/ranking', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    const ranking = await obtenerRankingConsumo();
    res.json({ success: true, data: ranking });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tokens/cuota/:usuarioId: Actualizar cuota individual de un abogado (solo admin)
router.put('/cuota/:usuarioId', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    const { limiteTokensMensual, limiteArchivosMensual } = req.body;
    const actualizado = await actualizarCuotaAbogado({
      adminRol: req.usuario.rol,
      abogadoId: req.params.usuarioId,
      nuevoLimiteTokens: limiteTokensMensual,
      nuevoLimiteArchivos: limiteArchivosMensual,
    });
    res.json({ success: true, data: actualizado, message: 'Cuota de tokens actualizada exitosamente.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
