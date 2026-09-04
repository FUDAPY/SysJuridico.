const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const MovimientoFinanciero = require('../models/MovimientoFinanciero');
const Expediente = require('../models/Expediente');

// GET /api/movimientos?tipo=&desde=&hasta=&cliente=&expediente=
const listarMovimientos = asyncHandler(async (req, res) => {
  const { tipo, desde, hasta, cliente, expediente, limite = 50 } = req.query;
  const filtro = {};
  if (tipo) filtro.tipo = tipo;
  if (cliente) filtro.cliente = cliente;
  if (expediente) filtro.expediente = expediente;
  if (desde || hasta) {
    filtro.fecha = {};
    if (desde) filtro.fecha.$gte = new Date(desde);
    if (hasta) filtro.fecha.$lte = new Date(hasta);
  }

  const movimientos = await MovimientoFinanciero.find(filtro)
    .populate('cliente', 'nombreCompleto')
    .populate('expediente', 'caratula')
    .sort({ fecha: -1 })
    .limit(Number(limite));

  res.json({ success: true, data: movimientos });
});

// POST /api/movimientos  (registro rápido de ingreso/egreso, cliente y expediente opcionales)
const registrarMovimiento = asyncHandler(async (req, res) => {
  const { tipo = 'ingreso', concepto, monto, metodoPago, fecha, cliente, expediente, numeroCuota, notas } = req.body;

  if (!concepto || monto === undefined || monto === null) {
    throw new ApiError(400, 'Concepto y monto son obligatorios.');
  }
  if (Number(monto) <= 0) {
    throw new ApiError(400, 'El monto debe ser mayor a cero.');
  }

  const movimiento = await MovimientoFinanciero.create({
    tipo,
    concepto,
    monto,
    metodoPago,
    fecha,
    cliente: cliente || null,
    expediente: expediente || null,
    numeroCuota: numeroCuota || null,
    registradoPor: req.usuario?._id,
    notas,
  });

  // Si el movimiento paga una cuota de un expediente, actualiza el plan de pagos y el saldo
  if (expediente && tipo === 'ingreso') {
    const exp = await Expediente.findById(expediente);
    if (exp) {
      exp.saldoPendiente = Math.max(0, exp.saldoPendiente - Number(monto));

      if (numeroCuota) {
        const cuota = exp.planPagos.find((c) => c.numero === Number(numeroCuota));
        if (cuota) {
          cuota.montoPagado += Number(monto);
          cuota.fechaPago = new Date();
          cuota.pagada = cuota.montoPagado >= cuota.montoEsperado;
        }
      }
      await exp.save();
    }
  }

  res.status(201).json({ success: true, data: movimiento });
});

// DELETE /api/movimientos/:id
const eliminarMovimiento = asyncHandler(async (req, res) => {
  const movimiento = await MovimientoFinanciero.findByIdAndDelete(req.params.id);
  if (!movimiento) throw new ApiError(404, 'Movimiento no encontrado.');
  res.json({ success: true, message: 'Movimiento eliminado correctamente.' });
});

module.exports = { listarMovimientos, registrarMovimiento, eliminarMovimiento };
