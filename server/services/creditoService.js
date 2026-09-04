/**
 * Genera el plan de pagos (cuotas) a partir de los honorarios totales y la entrega inicial.
 * Se usa cuando el expediente tiene creditoAutomatico = true.
 */
function generarPlanPagos({ honorariosTotales, entregaInicial, cantidadCuotas, frecuenciaCuotas, fechaInicio }) {
  const saldoAFinanciar = Math.max(0, Number(honorariosTotales) - Number(entregaInicial || 0));
  const numCuotas = Math.max(1, Number(cantidadCuotas) || 1);
  const montoPorCuota = Math.round((saldoAFinanciar / numCuotas) * 100) / 100;

  const diasPorFrecuencia = {
    semanal: 7,
    quincenal: 15,
    mensual: 30,
  };
  const incrementoDias = diasPorFrecuencia[frecuenciaCuotas] || 30;

  const base = fechaInicio ? new Date(fechaInicio) : new Date();
  const cuotas = [];

  for (let i = 1; i <= numCuotas; i += 1) {
    const fechaVencimiento = new Date(base);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + incrementoDias * i);

    // Ajusta la última cuota para que la suma cuadre exactamente con el saldo a financiar
    const esUltima = i === numCuotas;
    const montoEsperado = esUltima
      ? Math.round((saldoAFinanciar - montoPorCuota * (numCuotas - 1)) * 100) / 100
      : montoPorCuota;

    cuotas.push({
      numero: i,
      montoEsperado,
      fechaVencimiento,
      montoPagado: 0,
      pagada: false,
      fechaPago: null,
    });
  }

  return { planPagos: cuotas, saldoPendiente: saldoAFinanciar };
}

module.exports = { generarPlanPagos };
