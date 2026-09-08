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

async function confirmarCobro() {
  if (!creditoCobro) return;
  const monto = Number(document.getElementById('cbMonto').value) || 0;
  const saldo = Number(creditoCobro.saldoPendiente) || 0;
  if (monto <= 0) return alert('Indique el monto a cobrar.');
  if (monto > saldo) return alert(`El monto supera el saldo pendiente (${formatoGs(saldo)}).`);

  try {
    const data = await apiFetch(`/creditos/${creditoCobro._id}/cobrar`, {
      method: 'POST',
      body: {
        monto,
        metodoPago: document.getElementById('cbMetodo').value,
        fecha: document.getElementById('cbFecha').value || undefined,
        notas: document.getElementById('cbNota').value,
      },
    });
    alert(`Cobro registrado. Nuevo saldo: ${formatoGs(data.saldoActualizado)}`);
    cerrarModalCobro();
    creditoCobro = null;
    cargarCreditos();
  } catch (err) {
    alert(err.message);
  }
}

cargarCreditos().catch((err) => alert(err.message));
