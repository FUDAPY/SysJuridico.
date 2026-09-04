const { usuario } = requerirSesion();
renderBarraLateral('resumen');

async function cargarResumen() {
  if (usuario.rol === 'admin') {
    document.getElementById('vistaAdmin').classList.remove('oculto');
    document.getElementById('tituloResumen').textContent = 'Resumen general';
    const data = await apiFetch('/dashboard');
    document.getElementById('mExpedientes').textContent = data.expedientesActivos;
    document.getElementById('mSaldo').textContent = formatoGs(data.saldoPorCobrar);
    document.getElementById('mDiario').textContent = formatoGs(data.ingresoDiario);
    document.getElementById('mMensual').textContent = formatoGs(data.ingresoMensual);
    document.getElementById('mAnual').textContent = formatoGs(data.ingresoAnual);

    document.getElementById('tablaMovimientos').innerHTML = data.movimientosRecientes
      .map(
        (m) => `<tr>
          <td>${formatoFecha(m.fecha)}</td>
          <td>${m.concepto}</td>
          <td>${m.cliente?.nombreCompleto || '-'}</td>
          <td>${m.expediente?.caratula || '-'}</td>
          <td><span class="badge ${m.tipo === 'ingreso' ? 'badge-verde' : 'badge-rojo'}">${m.tipo}</span></td>
          <td>${formatoGs(m.monto)}</td>
        </tr>`
      )
      .join('');
  } else {
    document.getElementById('vistaAbogado').classList.remove('oculto');
    document.getElementById('tituloResumen').textContent = 'Resumen del día';
    const data = await apiFetch('/dashboard/mi-dia');
    document.getElementById('aExpedientes').textContent = data.expedientesActivos;
    document.getElementById('aIngreso').textContent = formatoGs(data.ingresoDiario);

    document.getElementById('tablaEventosHoy').innerHTML = data.eventosDeHoy.length
      ? data.eventosDeHoy
          .map(
            (e) => `<tr>
              <td>${new Date(e.fechaInicio).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}</td>
              <td>${e.titulo}</td>
              <td>${e.tipo}</td>
              <td>${e.lugar || '-'}</td>
            </tr>`
          )
          .join('')
      : '<tr><td colspan="4">No hay eventos agendados para hoy.</td></tr>';
  }
}

function abrirModalIngreso() {
  document.getElementById('modalIngreso').classList.remove('oculto');
}
function cerrarModalIngreso() {
  document.getElementById('modalIngreso').classList.add('oculto');
}

async function guardarIngreso() {
  try {
    await apiFetch('/movimientos', {
      method: 'POST',
      body: {
        tipo: 'ingreso',
        concepto: document.getElementById('fConcepto').value,
        monto: Number(document.getElementById('fMonto').value),
        metodoPago: document.getElementById('fMetodoPago').value,
        cliente: document.getElementById('fCliente').value || null,
        expediente: document.getElementById('fExpediente').value || null,
      },
    });
    cerrarModalIngreso();
    window.location.reload();
  } catch (err) {
    alert(err.message);
  }
}

cargarResumen().catch((err) => console.error(err));
