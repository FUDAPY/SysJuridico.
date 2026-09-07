const { usuario } = requerirSesion();
renderBarraLateral('expedientes');

const esAdmin = usuario.rol === 'admin';
document.getElementById('contenedorFiltroAbogado').classList.toggle('oculto', !esAdmin);
document.getElementById('contenedorAbogadoAsignado').classList.toggle('oculto', !esAdmin);

async function cargarSelects() {
  const clientes = await apiFetch('/clientes');
  const opcionesClientes = clientes.map((c) => `<option value="${c._id}">${c.nombreCompleto} (${c.cedula})</option>`).join('');
  document.getElementById('eCliente').innerHTML = opcionesClientes;
  document.getElementById('fCliente').innerHTML = '<option value="">Todos</option>' + opcionesClientes;

  if (esAdmin) {
    const usuarios = await apiFetch('/usuarios');
    const abogados = usuarios.filter((u) => u.rol === 'abogado' || u.rol === 'admin');
    const opcionesAbogados = abogados.map((u) => `<option value="${u._id}">${u.nombre}</option>`).join('');
    document.getElementById('eAbogado').innerHTML = opcionesAbogados;
    document.getElementById('fAbogado').innerHTML = '<option value="">Todos</option>' + opcionesAbogados;
  }
}

function badgeEstado(estado) {
  const clases = { activo: 'badge-verde', en_proceso: 'badge-azul', finalizado: 'badge-verde', suspendido: 'badge-rojo', archivado: 'badge-rojo' };
  return `<span class="badge ${clases[estado] || 'badge-azul'}">${estado}</span>`;
}

async function cargarExpedientes() {
  const params = new URLSearchParams();
  const buscar = document.getElementById('fBuscar').value;
  const abogado = document.getElementById('fAbogado')?.value;
  const cliente = document.getElementById('fCliente').value;
  const estado = document.getElementById('fEstado').value;
  if (buscar) params.set('buscar', buscar);
  if (abogado) params.set('abogado', abogado);
  if (cliente) params.set('cliente', cliente);
  if (estado) params.set('estado', estado);

  const expedientes = await apiFetch(`/expedientes?${params.toString()}`);
  document.getElementById('tablaExpedientes').innerHTML = expedientes.length
    ? expedientes
        .map(
          (e) => `<tr>
            <td>${e.caratula}</td>
            <td>${e.cliente?.nombreCompleto || '-'}</td>
            <td>${e.abogadoAsignado?.nombre || '-'}</td>
            <td>${badgeEstado(e.estado)}</td>
            <td>${formatoGs(e.saldoPendiente)}</td>
            <td><button class="btn-secundario" onclick='verDetalleExpediente(${JSON.stringify(e)})'>Ver</button></td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="6">No hay expedientes para los filtros seleccionados.</td></tr>';
}

// Detalle del expediente en modal con plan de pagos y tickets 80mm.
let expedienteActual = null;

function badgeCuota(c) {
  return c.pagada
    ? `<span class="badge badge-verde">Pagada</span>`
    : `<span class="badge badge-rojo">Pendiente</span>`;
}

function verDetalleExpediente(expediente) {
  expedienteActual = expediente;
  document.getElementById('modalDetalle').classList.remove('oculto');
  document.getElementById('detTitulo').textContent = expediente.caratula;
  document.getElementById('detSub').textContent = `Creado: ${formatoFecha(expediente.createdAt)}`;

  document.getElementById('detDatos').innerHTML = `
    <div class="tarjeta" style="padding:10px"><div class="etiqueta" style="text-transform:uppercase">Cliente</div>${expediente.cliente?.nombreCompleto || '-'}</div>
    <div class="tarjeta" style="padding:10px"><div class="etiqueta" style="text-transform:uppercase">C.I.</div>${expediente.cliente?.cedula || '-'}</div>
    <div class="tarjeta" style="padding:10px"><div class="etiqueta" style="text-transform:uppercase">Fuero</div>${expediente.fuero || '-'}</div>
    <div class="tarjeta" style="padding:10px"><div class="etiqueta" style="text-transform:uppercase">Juzgado</div>${expediente.juzgado || '-'}</div>
  `;

  const cuotas = expediente.planPagos || [];
  document.getElementById('detPlan').innerHTML = cuotas.length
    ? `<table>
        <thead><tr><th>N.º</th><th>Monto</th><th>Vencimiento</th><th>Estado</th><th>Ticket</th></tr></thead>
        <tbody>
          ${cuotas.map((c) => `
            <tr>
              <td>${c.numero}</td>
              <td>${formatoGs(c.montoEsperado)}</td>
              <td>${formatoFecha(c.fechaVencimiento)}</td>
              <td>${badgeCuota(c)}</td>
              <td><button class="btn-secundario" onclick='imprimirTicketCuota(${JSON.stringify(c)})'>🖨️ 80mm</button></td>
            </tr>`).join('')}
        </tbody>
      </table>`
    : '<p style="color:var(--texto-suave)">Sin plan de pagos asociado.</p>';

  document.getElementById('detSaldo').textContent = `Saldo pendiente: ${formatoGs(expediente.saldoPendiente)}`;
}

function cerrarModalDetalle() {
  document.getElementById('modalDetalle').classList.add('oculto');
}

// ---------- Impresión de ticket 80mm ----------
function HTMLTicket(contenidoCuota) {
  const e = expedienteActual;
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8" />
<title>Ticket - LIN GROUP</title>
<style>
  @page { size: 80mm auto; margin: 3mm; }
  body { font-family: 'Courier New', monospace; width: 80mm; font-size: 11px; color: #000; margin:0; }
  .centro { text-align: center; }
  .linea { border-bottom: 1px dashed #000; }
  .borde { border: 1px dashed #000; padding: 6px; margin-top: 5px; }
  b { font-size: 13px; }
</style></head><body>
  <div class="centro"><img src="/img/logo.jpg" style="width:40mm; object-fit:contain" /></div>
  <div class="centro"><b>LIN GROUP &amp; ASOCIADOS</b><br>ESTUDIO JURÍDICO - PARAGUAY<br><span class="linea">&nbsp;</span></div>
  <div class="centro" style="font-size:12px; font-weight:bold; margin-top:4px">
    ${e.planPagos?.find(c => c.numero === 1)?.pagada ? 'RECIBO' : 'AVISO DE COBRO - CUOTA'}</div>
  <div class="borde">
    <b>EXPEDIENTE:</b> ${e.caratula}<br>
    <b>CLIENTE:</b> ${e.cliente?.nombreCompleto || '-'}<br>
    <b>C.I.:</b> ${e.cliente?.cedula || '-'}<br>
    <b>FUERO:</b> ${e.fuero || '-'} &nbsp; <b>JUZGADO:</b> ${e.juzgado || '-'}
  </div>
  <div class="borde">${contenidoCuota || ''}</div>
  <div class="centro" style="margin-top:6px">Gracias por su preferencia<br>LIN GROUP &amp; ASOCIADOS</div>
</body></html>`;
}

function imprimirTicketCuota(cuota) {
  const contenido = `
    <b>N.º DE CUOTA:</b> ${cuota.numero}<br>
    <b>MONTO:</b> ${formatoGs(cuota.montoEsperado)}<br>
    <b>VENCIMIENTO:</b> ${formatoFecha(cuota.fechaVencimiento)}<br>
    <b>ESTADO:</b> ${cuota.pagada ? 'PAGADA' : 'PENDIENTE'}`;
  abrirVentanaTicket(HTMLTicket(contenido));
}

function imprimirPlanCompleto() {
  const e = expedienteActual;
  const filas = (e.planPagos || [])
    .map((c) => `${String(c.numero).padStart(2, '0')} | ${formatoGs(c.montoEsperado)} | ${formatoFecha(c.fechaVencimiento)} | ${c.pagada ? 'PAG' : 'PEND'}`)
    .join('<br>');
  const contenido = `<b>HONORARIOS:</b> ${formatoGs(e.honorariosTotales)}<br><b>ENTREGA:</b> ${formatoGs(e.entregaInicial)}<br><b>SALDO:</b> ${formatoGs(e.saldoPendiente)}<br><br>${filas}`;
  abrirVentanaTicket(HTMLTicket(contenido));
}

// Abre ventana de impresión y dispara el diálogo de impresión de forma segura.
function abrirVentanaTicket(html) {
  const ventana = window.open('', '_blank', 'width=420,height=560');
  if (!ventana) { alert('Permite las ventanas emergentes para imprimir tickets.'); return; }
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
  setTimeout(() => { ventana.print(); }, 400);
}

function alternarCamposCredito() {
  const marcado = document.getElementById('eCreditoAutomatico').checked;
  document.getElementById('fCantidadCuotas').classList.toggle('oculto', !marcado);
  document.getElementById('fFrecuenciaCuotas').classList.toggle('oculto', !marcado);
}

function abrirModalExpediente() {
  document.getElementById('modalExpediente').classList.remove('oculto');
}
function cerrarModalExpediente() {
  document.getElementById('modalExpediente').classList.add('oculto');
}

async function guardarExpediente() {
  const datos = {
    caratula: document.getElementById('eCaratula').value,
    cliente: document.getElementById('eCliente').value,
    abogadoAsignado: esAdmin ? document.getElementById('eAbogado').value : usuario.id,
    fuero: document.getElementById('eFuero').value,
    juzgado: document.getElementById('eJuzgado').value,
    enlaceDocumento: document.getElementById('eEnlace').value,
    descripcion: document.getElementById('eDescripcion').value,
    fechaInicio: document.getElementById('eFechaInicio').value || undefined,
    fechaFin: document.getElementById('eFechaFin').value || undefined,
    honorariosTotales: Number(document.getElementById('eHonorarios').value) || 0,
    entregaInicial: Number(document.getElementById('eEntregaInicial').value) || 0,
    creditoAutomatico: document.getElementById('eCreditoAutomatico').checked,
    cantidadCuotas: Number(document.getElementById('eCantidadCuotas').value) || 0,
    frecuenciaCuotas: document.getElementById('eFrecuenciaCuotas').value,
  };

  try {
    await apiFetch('/expedientes', { method: 'POST', body: datos });
    cerrarModalExpediente();
    cargarExpedientes();
  } catch (err) {
    alert(err.message);
  }
}

cargarSelects().then(cargarExpedientes).catch((err) => alert(err.message));
