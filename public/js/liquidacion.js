requerirSesion();
renderBarraLateral('liquidacion');

const estilo = document.createElement('style');
estilo.textContent =
  '.acciones{display:flex;gap:10px;flex-wrap:wrap;margin-top:4px}.monto-celda{text-align:right;font-variant-numeric:tabular-nums}';
document.head.appendChild(estilo);

const PASOS = [
  { n: 1, titulo: 'Datos personales' },
  { n: 2, titulo: 'Datos laborales' },
  { n: 3, titulo: 'Remuneración' },
  { n: 4, titulo: 'Cálculo' },
];
let pasoActual = 1;
let ultimoResultado = null;

function pintarIndicador() {
  document.getElementById('indicadorPasos').innerHTML = PASOS.map(
    (p) =>
      `<div class="paso-boton ${p.n === pasoActual ? 'activo' : p.n < pasoActual ? 'completado' : ''}" onclick="irPaso(${p.n})">${p.n}. ${p.titulo}</div>`
  ).join('');
}

function activarPaso(n) {
  pasoActual = n;
  document.querySelectorAll('.paso').forEach((el) => el.classList.remove('activo'));
  document.getElementById(`paso${n}`).classList.add('activo');
  pintarIndicador();
}

function irPaso(n) {
  if (n < pasoActual) return activarPaso(n);
  if (n === pasoActual + 1) return avanzarPaso(n);
  if (n > pasoActual) {
    for (let i = pasoActual + 1; i <= n; i += 1) {
      if (!validarPaso(i - 1)) return;
    }
    activarPaso(n);
  }
}

function avanzarPaso(n) {
  if (!validarPaso(n - 1)) return;
  activarPaso(n);
}

function retrocederPaso(n) {
  activarPaso(n);
}

function validarPaso(n) {
  if (n === 1) return true;
  if (n === 2) {
    const desde = document.getElementById('laFechaIngreso').value;
    const hasta = document.getElementById('laFechaSalida').value;
    if (!desde || !hasta) {
      alert('Complete las fechas de entrada y salida.');
      return false;
    }
    if (hasta <= desde) {
      alert('La fecha de salida debe ser posterior a la fecha de entrada.');
      return false;
    }
    return true;
  }
  if (n === 3) {
    const esJornal = document.getElementById('laTipoTrabajador').value === 'JORNAL';
    const mensual = Number(document.getElementById('lcSueldoMensual').value) || 0;
    const diario = Number(document.getElementById('lcSalarioDiario').value) || 0;
    if (esJornal ? !diario && !mensual : !mensual && !diario) {
      alert('Indique el salario mensual (o el diario si el trabajador es jornal).');
      return false;
    }
    return true;
  }
  return true;
}

function fechaLocal(valor) {
  const [y, m, d] = String(valor).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function calcularEdad() {
  const nac = document.getElementById('liFechaNac').value;
  const campo = document.getElementById('liEdad');
  if (!nac) return (campo.value = '');
  const hoy = new Date();
  const f = fechaLocal(nac);
  let edad = hoy.getFullYear() - f.getFullYear();
  const m = hoy.getMonth() - f.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < f.getDate())) edad -= 1;
  campo.value = `${edad} años`;
}

function calcularAntiguedad() {
  const desde = document.getElementById('laFechaIngreso').value;
  const hasta = document.getElementById('laFechaSalida').value;
  const span = document.getElementById('laAntiguedad');
  if (!desde || !hasta || hasta <= desde) {
    span.textContent = '—';
    return;
  }
  const a = fechaLocal(desde);
  const b = fechaLocal(hasta);
  let anios = b.getFullYear() - a.getFullYear();
  let meses = b.getMonth() - a.getMonth();
  let dias = b.getDate() - a.getDate();
  if (dias < 0) {
    meses -= 1;
    dias += new Date(b.getFullYear(), b.getMonth(), 0).getDate();
  }
  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }
  span.textContent = `${anios} año(s), ${meses} mes(es), ${dias} día(s)`;
}

function cambiarTipoTrabajador() {
  const esJornal = document.getElementById('laTipoTrabajador').value === 'JORNAL';
  document.getElementById('campoSueldoMensual').classList.toggle('oculto', esJornal);
  document.getElementById('campoFactorJornal').classList.toggle('oculto', !esJornal);
  document.getElementById('lcSalarioDiario').readOnly = !esJornal;
  calcularSalarioDiario();
}

function calcularSalarioDiario() {
  const esJornal = document.getElementById('laTipoTrabajador').value === 'JORNAL';
  const mensual = Number(document.getElementById('lcSueldoMensual').value) || 0;
  if (!esJornal) {
    document.getElementById('lcSalarioDiario').value = mensual ? Math.round(mensual / 30) : '';
  }
}

function recolectarDatos() {
  const esJornal = document.getElementById('laTipoTrabajador').value === 'JORNAL';
  const salarioMensual = Number(document.getElementById('lcSueldoMensual').value) || 0;
  const salarioDiario = Number(document.getElementById('lcSalarioDiario').value) || 0;
  return {
    tipoLiquidacion: document.getElementById('laMotivo').value,
    fechaIngreso: document.getElementById('laFechaIngreso').value,
    fechaSalida: document.getElementById('laFechaSalida').value,
    tipoTrabajador: document.getElementById('laTipoTrabajador').value,
    factorJornal: Number(document.getElementById('lcFactorJornal').value) || 30,
    salarioMensual,
    salarioDiario: esJornal ? salarioDiario : Math.round(salarioMensual / 30),
    diasTrabajadosNoCobrados: Number(document.getElementById('lcDiasNoCobrados').value) || 0,
    diasPreavisoRecibido: Number(document.getElementById('lcDiasPreaviso').value) || 0,
    diasVacacionesCausadas: Number(document.getElementById('lcVacacionesCausadas').value) || 0,
    tieneIps: document.getElementById('lcTieneIps').value === 'si',
    aguinaldoAnteriorAbonado: document.getElementById('lcAguinaldoAbonado').value === 'si',
    empresa: document.getElementById('laEmpresa').value,
    tipoSolicitante: document.getElementById('laTipoSolicitante').value,
    persona: {
      cedula: document.getElementById('liCedula').value,
      nombre: document.getElementById('liNombre').value,
      apellido: document.getElementById('liApellido').value,
      sexo: document.getElementById('liSexo').value,
      nacionalidad: document.getElementById('liNacionalidad').value,
      fechaNacimiento: document.getElementById('liFechaNac').value,
      departamento: document.getElementById('liDepartamento').value,
      ciudad: document.getElementById('liCiudad').value,
    },
  };
}

function pintarResultado(data) {
  ultimoResultado = data;
  const cuerpo = data.conceptos
    .map(
      (c) => `<tr>
        <td>${c.concepto}</td>
        <td style="color:var(--texto-suave);font-size:.8rem">${c.detalle}</td>
        <td>${c.dias ? c.dias : '—'}</td>
        <td class="monto-celda">${formatoGs(c.monto)}</td>
      </tr>`
    )
    .join('');
  const filaIps = data.aporteIps
    ? `<tr><td>IMPORTE A IPS (9%)</td><td style="color:var(--texto-suave);font-size:.8rem">retención</td><td>—</td><td class="monto-celda">-${formatoGs(data.aporteIps)}</td></tr>`
    : '';

  const doc = document.getElementById('documentoImpresion');
  doc.innerHTML = `
    <div class="tarjeta no-print">
      <h4 style="margin-top:0">Desglose del cálculo</h4>
      <table>
        <thead><tr><th>Concepto</th><th>Referencia</th><th>Días</th><th>Monto</th></tr></thead>
        <tbody>${cuerpo}${filaIps}</tbody>
      </table>
      <p style="font-size:1.25rem;font-weight:800;color:var(--azul);text-align:right">TOTAL GENERAL: ${formatoGs(data.totalGeneral)}</p>
      <p style="font-size:.8rem;color:var(--texto-suave)">
        Antigüedad: ${data.antiguedad.anios} año(s), ${data.antiguedad.meses} mes(es), ${data.antiguedad.dias} día(s)
        &nbsp;|&nbsp; Salario mensual: ${formatoGs(data.salarioMensual)} &nbsp;|&nbsp; Salario diario: ${formatoGs(data.salarioDiario)}
      </p>
    </div>
    <h1 class="titulo-documento">LIQUIDACIÓN LABORAL</h1>
    <pre class="reporte-mtess" id="reporteTexto"></pre>
    <div class="nota-legal">
      <p>CONSTE: La presente liquidación fue elaborada por la Calculadora Laboral de la Página Web Oficial del LINGROUP &amp; ASOCIADOS, según datos proporcionados por el usuario. Los cálculos son estimativos. Para más información acérquese al Ministerio.</p>
      <p>Que bajo ningún concepto la presente liquidación es documento válido para reclamaciones administrativas o judiciales.</p>
      <p class="pie-tecnico">CALCULADORA LABORAL DE LA WEB LINGROUP &amp; ASOCIADOS<br />POWERED BY: DEV. GIULIANO CATELLA</p>
    </div>`;
  document.getElementById('reporteTexto').textContent = data.reporte;
  doc.classList.remove('oculto');
  document.getElementById('btnGuardar').style.display = '';
  document.getElementById('btnImprimir').style.display = '';
  doc.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function calcular() {
  if (!validarPaso(3)) return;
  try {
    const data = await apiFetch('/liquidaciones/calcular', { method: 'POST', body: recolectarDatos() });
    pintarResultado(data);
  } catch (err) {
    alert(err.message);
  }
}

async function guardar() {
  try {
    await apiFetch('/liquidaciones', { method: 'POST', body: recolectarDatos() });
    alert('Liquidación guardada correctamente en el sistema.');
  } catch (err) {
    alert(err.message);
  }
}

cambiarTipoTrabajador();
pintarIndicador();

