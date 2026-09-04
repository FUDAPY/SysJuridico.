const asyncHandler = require('../utils/asyncHandler');
const Expediente = require('../models/Expediente');
const MovimientoFinanciero = require('../models/MovimientoFinanciero');
const EventoAgenda = require('../models/EventoAgenda');

function iniciosDeFecha() {
  const ahora = new Date();
  const inicioDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const inicioAnio = new Date(ahora.getFullYear(), 0, 1);
  return { inicioDia, inicioMes, inicioAnio };
}

async function sumarIngresos(desde, filtroExtra = {}) {
  const resultado = await MovimientoFinanciero.aggregate([
    { $match: { tipo: 'ingreso', fecha: { $gte: desde }, ...filtroExtra } },
    { $group: { _id: null, total: { $sum: '$monto' } } },
  ]);
  return resultado[0]?.total || 0;
}

// GET /api/dashboard  (resumen completo, solo 'admin')
const resumenCompleto = asyncHandler(async (req, res) => {
  const { inicioDia, inicioMes, inicioAnio } = iniciosDeFecha();

  const [expedientesActivos, saldoPorCobrar, ingresoDiario, ingresoMensual, ingresoAnual, movimientosRecientes] =
    await Promise.all([
      Expediente.countDocuments({ estado: { $in: ['activo', 'en_proceso'] } }),
      Expediente.aggregate([{ $group: { _id: null, total: { $sum: '$saldoPendiente' } } }]).then(
        (r) => r[0]?.total || 0
      ),
      sumarIngresos(inicioDia),
      sumarIngresos(inicioMes),
      sumarIngresos(inicioAnio),
      MovimientoFinanciero.find()
        .populate('cliente', 'nombreCompleto')
        .populate('expediente', 'caratula')
        .sort({ fecha: -1 })
        .limit(10),
    ]);

  res.json({
    success: true,
    data: {
      expedientesActivos,
      saldoPorCobrar,
      ingresoDiario,
      ingresoMensual,
      ingresoAnual,
      movimientosRecientes,
    },
  });
});

// GET /api/dashboard/mi-dia  (resumen reducido para el rol 'abogado')
const resumenDelDia = asyncHandler(async (req, res) => {
  const { inicioDia } = iniciosDeFecha();
  const finDia = new Date(inicioDia);
  finDia.setDate(finDia.getDate() + 1);

  const [expedientesActivos, eventosDeHoy, ingresoDiario] = await Promise.all([
    Expediente.countDocuments({ abogadoAsignado: req.usuario._id, estado: { $in: ['activo', 'en_proceso'] } }),
    EventoAgenda.find({
      responsable: req.usuario._id,
      fechaInicio: { $gte: inicioDia, $lt: finDia },
    }).sort({ fechaInicio: 1 }),
    sumarIngresos(inicioDia, { registradoPor: req.usuario._id }),
  ]);

  res.json({
    success: true,
    data: { expedientesActivos, eventosDeHoy, ingresoDiario },
  });
});

module.exports = { resumenCompleto, resumenDelDia };
