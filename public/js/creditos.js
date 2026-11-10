requerirSesion();
renderBarraLateral('creditos');
const esAdmin = ocultarAccionesAdmin();

let creditos = [];

function nombreClienteCredito(c) {
  return c.cliente?.nombreCompleto || c.clienteNombre || '—';
}

function pintarTabla() {
  const q = (document.getElementById('buscador').value || '').toLowerCase();
  const filtrados = creditos.filter((c) =>
    [nombreClienteCredito(c), c.expediente?.caratula || '', c.concepto || '']
      .join(' ')
      .toLowerCase()
      .includes(q)
  );

  document.getElementById('tablaCreditos').innerHTML = filtrados.length
    ? filtrados
        .map(
          (c) => `<tr>
            <td>${nombreClienteCredito(c)}</td>
            <td>${c.expediente?.caratula || '—'}</td>
            <td>${c.concepto || '—'}</td>
            <td>${formatoGs(c.montoTotal)}</td>
            <td>${formatoGs(c.saldoPendiente)}</td>
            <td>${Number(c.saldoPendiente) > 0
              ? '<span class="badge badge-rojo">Pendiente</span>'
              : '<span class="badge badge-verde">Cancelado</span>'}</td>
            <td>
              ${esAdmin
                ? `${Number(c.saldoPendiente) > 0
                    ? `<button class="btn-primario" style="padding:6px 10px;font-size:.8rem" onclick='abrirCobro(${JSON.stringify(c)})'>💰 Cobrar</button>`
                    : ''}
                  <button class="btn-dorado" style="padding:6px 10px;font-size:.8rem" onclick='reimprimirTicketCredito(${JSON.stringify(c)})' title="Imprimir Ticket 80mm">🖨️ Ticket</button>
                  <button class="btn-secundario" onclick='editarCredito(${JSON.stringify(c)})'>Editar</button>
                  <button class="btn-peligro" onclick="eliminarCredito('${c._id}')">Eliminar</button>`
                : '—'}
            </td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="7">No hay créditos para los filtros seleccionados.</td></tr>';
}

async function cargarCreditos() {
  creditos = await apiFetch('/creditos');
  pintarTabla();
}

async function opcionesClientesYExpedientes() {
  const [clientes, expedientes] = await Promise.all([apiFetch('/clientes'), apiFetch('/expedientes')]);
  document.getElementById('crCliente').innerHTML =
    '<option value="">— Sin cliente —</option>' +
    clientes.map((x) => `<option value="${x._id}">${x.nombreCompleto} (${x.cedula})</option>`).join('');
  document.getElementById('crExpediente').innerHTML =
    '<option value="">— Sin expediente —</option>' +
    expedientes.map((x) => `<option value="${x._id}">${x.caratula}</option>`).join('');
}

function abrirModalCredito() {
  document.getElementById('tituloModalCredito').textContent = 'Nuevo crédito';
  document.getElementById('creditoId').value = '';
  document.getElementById('crConcepto').value = '';
  document.getElementById('crMontoTotal').value = '';
  document.getElementById('crSaldoPendiente').value = '';
  opcionesClientesYExpedientes().then(() => {
    document.getElementById('crCliente').value = '';
    document.getElementById('crExpediente').value = '';
  });
  document.getElementById('modalCredito').classList.remove('oculto');
}

async function editarCredito(credito) {
  document.getElementById('tituloModalCredito').textContent = 'Editar crédito';
  document.getElementById('creditoId').value = credito._id;
  document.getElementById('crConcepto').value = credito.concepto || '';
  document.getElementById('crMontoTotal').value = credito.montoTotal || 0;
  document.getElementById('crSaldoPendiente').value = credito.saldoPendiente ?? credito.montoTotal ?? 0;
  await opcionesClientesYExpedientes();
  document.getElementById('crCliente').value = credito.cliente?._id || '';
  document.getElementById('crExpediente').value = credito.expediente?._id || '';
  document.getElementById('modalCredito').classList.remove('oculto');
}

function cerrarModalCredito() {
  document.getElementById('modalCredito').classList.add('oculto');
}

async function guardarCredito() {
  const id = document.getElementById('creditoId').value;
  const datos = {
    cliente: document.getElementById('crCliente').value || null,
    expediente: document.getElementById('crExpediente').value || null,
    concepto: document.getElementById('crConcepto').value,
    montoTotal: Number(document.getElementById('crMontoTotal').value) || 0,
    saldoPendiente: Number(document.getElementById('crSaldoPendiente').value) || 0,
  };

  try {
    await apiFetch(id ? `/creditos/${id}` : '/creditos', { method: id ? 'PUT' : 'POST', body: datos });
    cerrarModalCredito();
    cargarCreditos();
  } catch (err) {
    alert(err.message);
  }
}

async function eliminarCredito(id) {
  if (!confirm('¿Eliminar este crédito?')) return;
  try {
    await apiFetch(`/creditos/${id}`, { method: 'DELETE' });
    cargarCreditos();
  } catch (err) {
    alert(err.message);
  }
}

let creditoCobro = null;

function abrirCobro(credito) {
  creditoCobro = credito;
  const saldo = Number(credito.saldoPendiente) || 0;
  document.getElementById('cobroInfo').innerHTML =
    `Cliente: <strong>${nombreClienteCredito(credito)}</strong><br />` +
    `Concepto: ${credito.concepto || '—'}<br />` +
    `Saldo pendiente: <strong>${formatoGs(saldo)}</strong>`;
  document.getElementById('cbMonto').value = saldo;
  document.getElementById('cbFecha').value = new Date().toISOString().slice(0, 10);
  document.getElementById('cbMetodo').value = 'efectivo';
  document.getElementById('cbNota').value = '';
  document.getElementById('modalCobro').classList.remove('oculto');
}

function cerrarModalCobro() {
  document.getElementById('modalCobro').classList.add('oculto');
}

// ---------- Impresión de Ticket 80mm para Cobranzas ----------
const EMPRESA_COBROS = {
  nombre: 'LIN GROUP & ASOCIADOS',
  slogan: 'ESTUDIO JURÍDICO - PARAGUAY',
  direccion: 'Av. Camilo Recalde c/ Av. Pioneros del Este',
  email: 'asesoria@lingroupsapy.com',
  telefono: '0982 210777',
};

function abrirVentanaTicket(html) {
  const ventana = window.open('', '_blank', 'width=420,height=580');
  if (!ventana) {
    alert('Por favor habilitá las ventanas emergentes (pop-ups) para imprimir el ticket de cobranza.');
    return;
  }
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
  setTimeout(() => { ventana.print(); }, 400);
}

function generarHTMLTicketCobro({ cliente, concepto, expediente, montoCobrado, nuevoSaldo, metodoPago, fecha, folio }) {
  const ahora = fecha ? new Date(fecha) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const folioFinal = folio || `${ahora.getFullYear()}${pad(ahora.getMonth() + 1)}${pad(ahora.getDate())}-${pad(ahora.getHours())}${pad(ahora.getMinutes())}${pad(ahora.getSeconds())}`;

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8" />
<title>COMPROBANTE DE COBRANZA - LIN GROUP</title>
<style>
  @page { size: 80mm auto; margin: 3mm; }
  body { font-family: 'Courier New', monospace; width: 80mm; font-size: 11px; color: #000; margin: 0; }
  .centro { text-align: center; }
  .linea { border-top: 1px dashed #000; margin: 5px 0; }
  .borde { border: 1px dashed #000; padding: 6px; margin-top: 5px; border-radius: 2px; }
  .empresa { font-size: 13px; font-weight: bold; }
  .slogan { letter-spacing: 1px; font-size: 10px; }
  .contacto { font-size: 9px; margin-top: 3px; line-height: 1.35; }
  .titulo-doc { font-size: 13px; font-weight: bold; letter-spacing: 2px; margin-top: 4px; background: #000; color: #fff; padding: 3px 0; text-align: center; }
  .fila { display: flex; justify-content: space-between; }
  b { font-size: 12px; }
  .monto-destacado { font-size: 15px; font-weight: bold; text-align: center; margin: 6px 0; }
  .pie { font-size: 9px; margin-top: 8px; text-align: center; line-height: 1.3; }
</style></head><body>
  <div class="centro"><img src="/img/logo.jpg" style="width:38mm; object-fit:contain" alt="Logo" onerror="this.style.display='none'" /></div>
  <div class="centro empresa">${EMPRESA_COBROS.nombre}</div>
  <div class="centro slogan">${EMPRESA_COBROS.slogan}</div>
  <div class="centro contacto">${EMPRESA_COBROS.direccion}<br>${EMPRESA_COBROS.email} - Tel. ${EMPRESA_COBROS.telefono}</div>
  <div class="linea"></div>
  <div class="titulo-doc">RECIBO DE COBRO</div>
  <div class="fila" style="margin-top:4px">
    <span>FOLIO: ${folioFinal}</span>
    <span>${ahora.toLocaleDateString('es-PY')} ${pad(ahora.getHours())}:${pad(ahora.getMinutes())}</span>
  </div>
  <div class="linea"></div>
  <div class="borde">
    <b>CLIENTE:</b> ${cliente || 'Cliente Titular'}<br>
    ${expediente ? `<b>EXPEDIENTE:</b> ${expediente}<br>` : ''}
    <b>CONCEPTO:</b> ${concepto || 'Amortización de honorarios'}<br>
    <b>MÉTODO:</b> ${(metodoPago || 'Efectivo').toUpperCase()}
  </div>
  <div class="borde">
    <div class="monto-destacado">COBRADO: ${formatoGs(montoCobrado)}</div>
    <div class="fila"><span>NUEVO SALDO:</span><b>${formatoGs(nuevoSaldo)}</b></div>
  </div>
  <div class="linea"></div>
  <div class="pie">
    ¡Gracias por su confianza y preferencia!<br>
    <b>${EMPRESA_COBROS.nombre}</b><br>
    ${EMPRESA_COBROS.email} &bull; ${EMPRESA_COBROS.telefono}<br>
    <i>Documento de control interno de cobranza.</i>
  </div>
</body></html>`;
}

function reimprimirTicketCredito(c) {
  const html = generarHTMLTicketCobro({
    cliente: nombreClienteCredito(c),
    concepto: c.concepto,
    expediente: c.expediente?.caratula,
    montoCobrado: Math.max(0, Number(c.montoTotal || 0) - Number(c.saldoPendiente || 0)),
    nuevoSaldo: c.saldoPendiente || 0,
    metodoPago: 'Registrado en sistema',
    fecha: new Date(),
  });
  abrirVentanaTicket(html);
}

async function confirmarCobro() {
  if (!creditoCobro) return;
  const monto = Number(document.getElementById('cbMonto').value) || 0;
  const saldo = Number(creditoCobro.saldoPendiente) || 0;
  if (monto <= 0) return alert('Indique el monto a cobrar.');
  if (monto > saldo) return alert(`El monto supera el saldo pendiente (${formatoGs(saldo)}).`);

  const metodoPago = document.getElementById('cbMetodo').value;
  const fechaCobro = document.getElementById('cbFecha').value;
  const notasCobro = document.getElementById('cbNota').value;

  try {
    const data = await apiFetch(`/creditos/${creditoCobro._id}/cobrar`, {
      method: 'POST',
      body: {
        monto,
        metodoPago,
        fecha: fechaCobro || undefined,
        notas: notasCobro,
      },
    });

    const ticketHTML = generarHTMLTicketCobro({
      cliente: nombreClienteCredito(creditoCobro),
      concepto: creditoCobro.concepto,
      expediente: creditoCobro.expediente?.caratula,
      montoCobrado: monto,
      nuevoSaldo: data.saldoActualizado,
      metodoPago,
      fecha: fechaCobro,
    });

    cerrarModalCobro();
    abrirVentanaTicket(ticketHTML);
    creditoCobro = null;
    cargarCreditos();
  } catch (err) {
    alert(err.message);
  }
}

cargarCreditos().catch((err) => alert(err.message));
