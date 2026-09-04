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

// Detalle simplificado del expediente (plan de pagos, descripción, enlace). Vista completa: pendiente.
function verDetalleExpediente(expediente) {
  const cuotas = (expediente.planPagos || [])
    .map((c) => `Cuota ${c.numero}: ${formatoGs(c.montoEsperado)} - vence ${formatoFecha(c.fechaVencimiento)} - ${c.pagada ? 'Pagada' : 'Pendiente'}`)
    .join('\n');
  alert(
    `${expediente.caratula}\nDescripción: ${expediente.descripcion || 'N/D'}\nDocumento: ${expediente.enlaceDocumento || 'N/D'}\n\nPlan de pagos:\n${cuotas || 'Sin plan de pagos asociado.'}`
  );
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
