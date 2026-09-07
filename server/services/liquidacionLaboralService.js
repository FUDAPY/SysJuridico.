const MS_POR_DIA = 1000 * 60 * 60 * 24;

function redondear(n) {
  return Math.round(n);
}

/** Parsea "YYYY-MM-DD" como fecha local (evita el corrimiento de UTC). */
function parseFechaLocal(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

const fmtGs = (n) => new Intl.NumberFormat('es-PY').format(Math.round(n));

function esBisiesto(anio) {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

function diasDelMes(anio, mes) {
  return new Date(anio, mes + 1, 0).getDate();
}

function diasEntreFechas(desde, hasta) {
  const a = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  const b = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
  let total = 0;
  const cursor = new Date(a);
  while (cursor < b) {
    total += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
}

/**
 * Antigüedad exacta (años, meses, días) con días calendario reales
 * (respeta meses de 28/30/31 días y años bisiestos).
 */
function calcularAntiguedad(fechaIngreso, fechaSalida) {
  const ingreso = parseFechaLocal(fechaIngreso);
  const salida = parseFechaLocal(fechaSalida);

  let anios = salida.getFullYear() - ingreso.getFullYear();
  let meses = salida.getMonth() - ingreso.getMonth();
  let dias = salida.getDate() - ingreso.getDate();

  if (dias < 0) {
    meses -= 1;
    dias += diasDelMes(salida.getFullYear(), salida.getMonth() - 1);
  }
  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }

  const totalDias = diasEntreFechas(ingreso, salida);
  const aniosDecimal = anios + meses / 12 + dias / (esBisiesto(salida.getFullYear()) ? 366 : 365);
  const mesesTotales = anios * 12 + meses;

  // Meses trabajados dentro del año calendario en curso (para proporcionales).
  const inicioAnio = new Date(salida.getFullYear(), 0, 1);
  const inicioComputo = ingreso > inicioAnio ? ingreso : inicioAnio;
  let mesesEnAnio = (salida.getFullYear() - inicioComputo.getFullYear()) * 12 + (salida.getMonth() - inicioComputo.getMonth());
  if (salida.getDate() >= inicioComputo.getDate()) mesesEnAnio += 1;
  mesesEnAnio = Math.min(12, Math.max(0, mesesEnAnio));

  return { anios, meses, dias, totalDias, aniosDecimal, mesesTotales, mesesEnAnio };
}

/** Indemnización por despido injustificado (Art. 79, 91 y 97): días por año según tramo. */
function diasIndemnizacion(antiguedad) {
  const tasa = antiguedad.aniosDecimal <= 5 ? 15 : antiguedad.aniosDecimal <= 10 ? 20 : 30;
  return redondear(antiguedad.aniosDecimal * tasa);
}

/** Preaviso (Art. 87 y 94) según antigüedad. */
function diasPreaviso(antiguedad) {
  if (antiguedad.mesesTotales < 3) return 0;
  if (antiguedad.mesesTotales <= 6) return 7; // 3-6 meses: una semana
  if (antiguedad.anios < 5) return 30;        // 6 meses - 5 años
  if (antiguedad.anios < 10) return 45;       // 5 - 10 años
  return 60;                                  // más de 10 años
}

/** Vacaciones anuales (Art. 218): 12 / 18 / 30 días según tramo. */
function diasVacacionesAnuales(antiguedad) {
  if (antiguedad.anios < 5) return 12;
  if (antiguedad.anios < 10) return 18;
  return 30;
}

const NOMBRES_MOTIVO = {
  despido_injustificado: 'Despido Injustificado',
  renuncia_voluntaria: 'Renuncia Voluntaria',
  despido_justificado: 'Despido Justificado',
  fin_contrato_jubilacion: 'Fin de Contrato / Jubilación',
};

function filaReporte(label, dias, monto, ancho = 46) {
  const columnaLabel = label.padEnd(ancho - 26, ' ');
  const columnaDias = (dias ? String(dias) : '').padStart(5, ' ');
  const signo = monto < 0 ? '-' : '';
  const columnaMonto = (signo + 'Gs. ' + fmtGs(Math.abs(monto))).padStart(20, ' ');
  return columnaLabel + columnaDias + columnaMonto;
}

function armarReporte(opciones) {
  const { persona, antiguedad, tipoTrabajador, tipoLiquidacion, fechaIngreso, fechaSalida, rows, aporteIps, totalGeneral } = opciones;
  const L = '='.repeat(46);
  const S = '-'.repeat(46);
  const fmtFecha = (f) => {
    const d = parseFechaLocal(f);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };
  const solicitante = `${persona.nombre || ''} ${persona.apellido || ''}`.trim() || '________________________';
  const motivo = NOMBRES_MOTIVO[tipoLiquidacion] || tipoLiquidacion;

  const lineas = [];
  lineas.push('='.repeat(54));
  lineas.push('            LIQUIDACIÓN LABORAL WEB'.padEnd(54, ' '));
  lineas.push('          LIQUIDACIÓN DE HABERES (MTESS)'.padEnd(54, ' '));
  lineas.push('='.repeat(54));
  lineas.push(`CÉDULA: ${persona.cedula || '________'} | SOLICITANTE: ${solicitante}`);
  lineas.push(`TIPO PAGO: ${tipoTrabajador} | MOTIVO: ${motivo}`);
  lineas.push(`ENTRADA: ${fmtFecha(fechaIngreso)} | SALIDA: ${fmtFecha(fechaSalida)}`);
  lineas.push(
    `ANTIGÜEDAD: ${antiguedad.anios} año(s) ${antiguedad.meses} mes(es) ${antiguedad.dias} día(s)`
  );
  lineas.push(S);
  lineas.push('BENEFICIOS SOCIALES'.padEnd(34, ' ') + 'DIAS' + ' '.repeat(6) + 'GUARANIES');
  lineas.push(S);
  rows.forEach((r) => lineas.push(filaReporte(r.concepto + ' (' + r.detalle + ')', r.dias, r.monto)));
  if (aporteIps > 0) lineas.push(filaReporte('IMPORTE A IPS (9%)', '', -aporteIps));
  lineas.push(S);
  lineas.push('TOTAL GENERAL:'.padEnd(33, ' ') + 'Gs. ' + fmtGs(totalGeneral));
  lineas.push('='.repeat(54));
  return lineas.join('\n');
}

/**
 * Motor de cálculo de liquidación laboral (Ley 213/93).
 * Devuelve conceptos, retención IPS, total y el reporte de texto plano MTESS.
 */
function calcularLiquidacion(opciones = {}) {
  const {
    tipoLiquidacion = 'despido_injustificado',
    fechaIngreso,
    fechaSalida,
    salarioMensual = 0,
    salarioDiario,
    tipoTrabajador = 'MENSUAL',
    factorJornal = 30,
    diasTrabajadosNoCobrados = 0,
    diasPreavisoRecibido = 0,
    diasVacacionesCausadas = 0,
    tieneIps = false,
    aguinaldoAnteriorAbonado = true,
    persona = {},
  } = opciones;

  const antiguedad = calcularAntiguedad(fechaIngreso, fechaSalida);
  const esJornal = String(tipoTrabajador).toUpperCase() === 'JORNAL';

  let salarioMensualBase = Number(salarioMensual) || 0;
  let salarioDiarioBase = Number(salarioDiario) || 0;
  if (esJornal) {
    if (!salarioDiarioBase) salarioDiarioBase = salarioMensualBase > 0 ? salarioMensualBase / factorJornal : 0;
    salarioMensualBase = salarioDiarioBase * factorJornal;
  } else {
    if (!salarioMensualBase) salarioMensualBase = salarioDiarioBase * 30;
    salarioDiarioBase = salarioMensualBase / 30;
  }

  const esDespido = tipoLiquidacion === 'despido_injustificado';
  const rows = [];
  const push = (clave, concepto, detalle, dias, monto) =>
    rows.push({ clave, concepto, detalle, dias, monto: redondear(monto) });

  if (esDespido) {
    const d = diasIndemnizacion(antiguedad);
    push('indemnizacion', 'Indemnización', 'art.79, 91, 97', d, d * salarioDiarioBase);
  }

  if (Number(diasVacacionesCausadas) > 0) {
    push('vac_causadas', 'Vacaciones causadas', 'art.218', Number(diasVacacionesCausadas), Number(diasVacacionesCausadas) * salarioDiarioBase);
  }

  const diasVp = Number(((diasVacacionesAnuales(antiguedad) / 12) * antiguedad.mesesEnAnio).toFixed(2));
  push('vac_prop', 'Vacaciones proporcionales', 'art.218', diasVp, diasVp * salarioDiarioBase);

  const diasSueldo = Number(diasTrabajadosNoCobrados) || 0;
  if (diasSueldo > 0) push('sueldo_mes', 'Salario pendiente', 'días no cobrados', diasSueldo, diasSueldo * salarioDiarioBase);

  if (esDespido) {
    const dp = Math.max(0, diasPreaviso(antiguedad) - (Number(diasPreavisoRecibido) || 0));
    if (dp > 0) push('preaviso', 'Preaviso', 'art.87, 94', dp, dp * salarioDiarioBase);
  }

  if (!aguinaldoAnteriorAbonado) {
    push('aguinaldo', 'Aguinaldo anterior', 'art.243', 0, salarioMensualBase);
  }
  push('aguinaldo_prop', 'Aguinaldo proporcional', 'art.244', 0, (salarioMensualBase / 12) * antiguedad.mesesEnAnio);

  const gravados = rows
    .filter((r) => !['indemnizacion', 'preaviso'].includes(r.clave))
    .reduce((s, r) => s + r.monto, 0);
  const aporteIps = tieneIps ? redondear(gravados * 0.09) : 0;
  const totalGeneral = rows.reduce((s, r) => s + r.monto, 0) - aporteIps;

  const reporte = armarReporte({
    persona,
    antiguedad,
    tipoTrabajador: esJornal ? 'JORNAL' : 'MENSUAL',
    tipoLiquidacion,
    fechaIngreso,
    fechaSalida,
    rows,
    aporteIps,
    totalGeneral,
  });

  return {
    tipoLiquidacion,
    persona,
    antiguedad: {
      anios: antiguedad.anios,
      meses: antiguedad.meses,
      dias: antiguedad.dias,
      totalDias: antiguedad.totalDias,
      mesesEnAnio: antiguedad.mesesEnAnio,
    },
    tipoTrabajador: esJornal ? 'JORNAL' : 'MENSUAL',
    salarioMensual: redondear(salarioMensualBase),
    salarioDiario: redondear(salarioDiarioBase),
    conceptos: rows,
    aporteIps,
    totalGeneral,
    reporte,
  };
}

module.exports = { calcularLiquidacion, calcularAntiguedad, redondear };

