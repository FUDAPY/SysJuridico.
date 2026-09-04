const MS_POR_DIA = 1000 * 60 * 60 * 24;
const DIAS_MES = 30; // convención estándar de nómina paraguaya (mes comercial de 30 días)

/**
 * Calcula la antigüedad exacta entre dos fechas en años, meses y días,
 * junto con el total de meses trabajados dentro del año calendario en curso
 * (usado para las proporcionalidades de vacaciones y aguinaldo).
 */
function calcularAntiguedad(fechaIngreso, fechaSalida) {
  const ingreso = new Date(fechaIngreso);
  const salida = new Date(fechaSalida);

  let anios = salida.getFullYear() - ingreso.getFullYear();
  let meses = salida.getMonth() - ingreso.getMonth();
  let dias = salida.getDate() - ingreso.getDate();

  if (dias < 0) {
    meses -= 1;
    const ultimoDiaMesAnterior = new Date(salida.getFullYear(), salida.getMonth(), 0).getDate();
    dias += ultimoDiaMesAnterior;
  }
  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }

  const totalDias = Math.round((salida - ingreso) / MS_POR_DIA);
  const antiguedadDecimal = anios + meses / 12 + dias / 365;

  // Meses trabajados dentro del año calendario en curso (para aguinaldo/vacaciones proporcionales)
  const inicioAnioActual = new Date(salida.getFullYear(), 0, 1);
  const inicioComputo = ingreso > inicioAnioActual ? ingreso : inicioAnioActual;
  let mesesEnAnioActual = (salida.getFullYear() - inicioComputo.getFullYear()) * 12 + (salida.getMonth() - inicioComputo.getMonth());
  if (salida.getDate() >= inicioComputo.getDate()) mesesEnAnioActual += 1;
  mesesEnAnioActual = Math.min(12, Math.max(0, mesesEnAnioActual));

  return { anios, meses, dias, totalDias, antiguedadDecimal, mesesEnAnioActual };
}

/** Días de preaviso según antigüedad (Art. 88 y ss. Código del Trabajo, Ley 213/1993). */
function calcularDiasPreaviso(antiguedadDecimal) {
  if (antiguedadDecimal < 6 / 12) return 0;
  if (antiguedadDecimal < 2) return 30;
  if (antiguedadDecimal < 5) return 45;
  if (antiguedadDecimal < 10) return 60;
  return 90;
}

/** Días de vacaciones anuales según antigüedad (Art. 218 Código del Trabajo). */
function calcularDiasVacacionAnual(antiguedadDecimal) {
  if (antiguedadDecimal < 5) return 12;
  if (antiguedadDecimal < 10) return 18;
  return 30;
}

/**
 * Motor de cálculo de liquidación laboral conforme al Código del Trabajo paraguayo (Ley 213/1993).
 *
 * tipoLiquidacion: 'despido_injustificado' | 'renuncia_voluntaria' | 'despido_justificado' | 'fin_contrato_jubilacion'
 */
function calcularLiquidacion({
  tipoLiquidacion,
  fechaIngreso,
  fechaSalida,
  salarioMensual,
  salarioPromedio6Meses,
  preavisoOmitido = false,
}) {
  const antiguedad = calcularAntiguedad(fechaIngreso, fechaSalida);
  const salarioBase = Number(salarioPromedio6Meses) > 0 ? Number(salarioPromedio6Meses) : Number(salarioMensual);
  const salarioDiario = salarioBase / DIAS_MES;

  // Años computables para indemnización: año completo + fracción mayor a 6 meses cuenta como año entero
  const aniosCompletos = Math.floor(antiguedad.antiguedadDecimal);
  const fraccionAnio = antiguedad.antiguedadDecimal - aniosCompletos;
  const aniosComputablesIndemnizacion = aniosCompletos + (fraccionAnio >= 0.5 ? 1 : 0);

  const conceptos = [];

  // Vacaciones y aguinaldo proporcionales aplican en todos los tipos de liquidación
  const diasVacacionAnual = calcularDiasVacacionAnual(antiguedad.antiguedadDecimal);
  const diasVacacionProporcional = (diasVacacionAnual / 12) * antiguedad.mesesEnAnioActual;
  const montoVacaciones = diasVacacionProporcional * salarioDiario;
  conceptos.push({
    concepto: 'Vacaciones proporcionales',
    detalle: `${diasVacacionProporcional.toFixed(2)} días (Art. 218)`,
    monto: redondear(montoVacaciones),
  });

  const montoAguinaldo = (salarioBase / 12) * antiguedad.mesesEnAnioActual;
  conceptos.push({
    concepto: 'Aguinaldo proporcional',
    detalle: `${antiguedad.mesesEnAnioActual} mes(es) del año en curso (Art. 243 y ss.)`,
    monto: redondear(montoAguinaldo),
  });

  let montoIndemnizacion = 0;
  let montoPreaviso = 0;

  if (tipoLiquidacion === 'despido_injustificado' || tipoLiquidacion === 'fin_contrato_jubilacion') {
    montoIndemnizacion = aniosComputablesIndemnizacion * 15 * salarioDiario;
    conceptos.push({
      concepto: 'Indemnización por antigüedad',
      detalle: `${aniosComputablesIndemnizacion} año(s) x 15 días de salario (Art. 91)`,
      monto: redondear(montoIndemnizacion),
    });
  }

  if (tipoLiquidacion === 'despido_injustificado' && preavisoOmitido) {
    const diasPreaviso = calcularDiasPreaviso(antiguedad.antiguedadDecimal);
    montoPreaviso = diasPreaviso * salarioDiario;
    conceptos.push({
      concepto: 'Preaviso omitido',
      detalle: `${diasPreaviso} días de salario (Art. 88 y ss.)`,
      monto: redondear(montoPreaviso),
    });
  }

  // Renuncia voluntaria y despido justificado (Art. 81): solo vacaciones y aguinaldo proporcionales.

  const totalGeneral = redondear(conceptos.reduce((suma, c) => suma + c.monto, 0));

  return {
    tipoLiquidacion,
    antiguedad: {
      anios: antiguedad.anios,
      meses: antiguedad.meses,
      dias: antiguedad.dias,
      totalDias: antiguedad.totalDias,
    },
    salarioDiario: redondear(salarioDiario),
    conceptos,
    totalGeneral,
  };
}

function redondear(numero) {
  return Math.round(numero);
}

module.exports = { calcularLiquidacion, calcularAntiguedad };
