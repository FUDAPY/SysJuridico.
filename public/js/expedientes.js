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
              <td><button class="btn-secundario" onclick='imprimirTicketCuota(${JSON.stringify(c)})'>🖨️ Comprobante</button></td>
            </tr>`).join('')}
        </tbody>
      </table>`
    : '<p style="color:var(--texto-suave)">Sin plan de pagos asociado.</p>';

  document.getElementById('detSaldo').textContent = `Saldo pendiente: ${formatoGs(expediente.saldoPendiente)}`;
  cargarDocumentosExpediente(expediente._id);
}

function cerrarModalDetalle() {
  document.getElementById('modalDetalle').classList.add('oculto');
}

// ---------- Impresión de ticket 80mm (comprobante de pago) ----------
const EMPRESA = {
  nombre: 'LIN GROUP & ASOCIADOS',
  slogan: 'ESTUDIO JURÍDICO - PARAGUAY',
  direccion: 'Av. Camilo Recalde c/ Av. Pioneros del Este',
  email: 'asesoria@lingroupsapy.com',
  telefono: '0982 210777',
};

function HTMLTicket(contenidoCuota, documentoEtiqueta = '') {
  const e = expedienteActual;
  const ahora = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const folio = `${ahora.getFullYear()}${pad(ahora.getMonth() + 1)}${pad(ahora.getDate())}-${pad(ahora.getHours())}${pad(ahora.getMinutes())}${pad(ahora.getSeconds())}`;
  const etiquetaDoc =
    documentoEtiqueta ||
    (e.planPagos?.find((c) => c.numero === 1)?.pagada ? 'RECIBO DE PAGO' : 'AVISO DE COBRO');
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8" />
<title>${etiquetaDoc} - LIN GROUP</title>
<style>
  @page { size: 80mm auto; margin: 3mm; }
  body { font-family: 'Courier New', monospace; width: 80mm; font-size: 11px; color: #000; margin: 0; }
  .centro { text-align: center; }
  .linea { border-top: 1px dashed #000; margin: 4px 0; }
  .borde { border: 1px dashed #000; padding: 6px; margin-top: 5px; border-radius: 2px; }
  .empresa { font-size: 13px; font-weight: bold; }
  .slogan { letter-spacing: 1px; font-size: 10px; }
  .contacto { font-size: 9px; margin-top: 3px; line-height: 1.35; }
  .titulo-doc { font-size: 13px; font-weight: bold; letter-spacing: 2px; margin-top: 4px; background: #000; color: #fff; padding: 3px 0; }
  .fila { display: flex; justify-content: space-between; }
  b { font-size: 12px; }
  .pie { font-size: 9px; margin-top: 6px; text-align: center; }
</style></head><body>
  <div class="centro"><img src="/img/logo.jpg" style="width:38mm; object-fit:contain" alt="Logo" /></div>
  <div class="centro empresa">LIN GROUP &amp; ASOCIADOS</div>
  <div class="centro slogan">ESTUDIO JURÍDICO - PARAGUAY</div>
  <div class="centro contacto">${EMPRESA.direccion}<br>${EMPRESA.email} - Tel. ${EMPRESA.telefono}</div>
  <div class="linea"></div>
  <div class="centro titulo-doc">${etiquetaDoc}</div>
  <div class="fila" style="margin-top:4px"><span>FOLIO: ${folio}</span><span>${ahora.toLocaleDateString('es-PY')} ${pad(ahora.getHours())}:${pad(ahora.getMinutes())}</span></div>
  <div class="linea"></div>
  <div class="borde">
    <b>EXPEDIENTE:</b> ${e.caratula}<br>
    <b>CLIENTE:</b> ${e.cliente?.nombreCompleto || '-'}<br>
    <b>C.I.:</b> ${e.cliente?.cedula || '-'}<br>
    <b>FUERO:</b> ${e.fuero || '-'} &nbsp; <b>JUZGADO:</b> ${e.juzgado || '-'}
  </div>
  <div class="borde">${contenidoCuota || ''}</div>
  <div class="linea"></div>
  <div class="pie">
    Gracias por su preferencia<br><b>LIN GROUP &amp; ASOCIADOS</b><br>${EMPRESA.email} - ${EMPRESA.telefono}<br><i>Documento de control, no es factura.</i>
  </div>
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

/* ---------- Documentos adjuntos del expediente ---------- */
function tamanoArchivo(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function iconoDocumento(nombre) {
  const ext = (nombre.split('.').pop() || '').toUpperCase();
  return ext === 'PDF' ? '📕' : '📘';
}

async function cargarDocumentosExpediente(id) {
  const contenedor = document.getElementById('listaDocs');
  if (!contenedor) return;
  contenedor.innerHTML = 'Cargando documentos…';
  try {
    const docs = await apiFetch(`/expedientes/${id}/documentos`);
    contenedor.innerHTML = docs.length
      ? docs
          .map(
            (d) => `<div style="display:flex; align-items:center; gap:8px; padding:6px 8px; border:1px solid var(--borde); border-radius:8px; margin-bottom:6px; flex-wrap:wrap">
              <span style="font-size:1.1rem">${iconoDocumento(d.nombre)}</span>
              <span style="flex:1; min-width:120px"><strong>${d.nombre}</strong><br /><small style="color:var(--texto-suave)">${tamanoArchivo(d.tamano)} · ${formatoFecha(d.createdAt)}</small></span>
              <button class="btn-secundario" style="padding:5px 8px;font-size:.75rem" onclick="descargarDocumentoExpediente('${d._id}')">⬇ Descargar</button>
              <button class="btn-peligro" style="padding:5px 8px;font-size:.75rem" onclick="eliminarDocumentoExpediente('${d._id}')">🗑 Eliminar</button>
            </div>`
          )
          .join('')
      : '<p style="color:var(--texto-suave)">Aún no hay documentos adjuntos.</p>';
  } catch (err) {
    contenedor.innerHTML = `<p style="color:var(--rojo)">Error: ${err.message}</p>`;
  }
}

async function subirDocumentoExpediente() {
  if (!expedienteActual) return;
  const input = document.getElementById('inputDocumento');
  const archivo = input.files && input.files[0];
  if (!archivo) return alert('Seleccione un archivo .doc, .docx o .pdf.');
  if (!/\.(doc|docx|pdf)$/i.test(archivo.name)) return alert('Solo se permiten archivos .doc, .docx o .pdf.');
  if (archivo.size > 15 * 1024 * 1024) return alert('El archivo supera el tamaño máximo de 15 MB.');

  const lector = new FileReader();
  lector.onload = async () => {
    try {
      const base64 = String(lector.result).split(',')[1];
      await apiFetch(`/expedientes/${expedienteActual._id}/documentos`, {
        method: 'POST',
        body: { nombre: archivo.name, tipo: archivo.type || '', datos: base64 },
      });
      input.value = '';
      cargarDocumentosExpediente(expedienteActual._id);
    } catch (err) {
      alert(err.message);
    }
  };
  lector.onerror = () => alert('No se pudo leer el archivo.');
  lector.readAsDataURL(archivo);
}

async function descargarDocumentoExpediente(docId) {
  if (!expedienteActual) return;
  try {
    const data = await apiFetch(`/expedientes/${expedienteActual._id}/documentos/${docId}/descargar`);
    const binario = atob(data.base64);
    const arreglo = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i += 1) arreglo[i] = binario.charCodeAt(i);
    const blob = new Blob([arreglo], { type: data.tipo || 'application/octet-stream' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = data.nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 4000);
  } catch (err) {
    alert(err.message);
  }
}

async function eliminarDocumentoExpediente(docId) {
  if (!expedienteActual) return;
  if (!confirm('¿Eliminar este documento?')) return;
  try {
    await apiFetch(`/expedientes/${expedienteActual._id}/documentos/${docId}`, { method: 'DELETE' });
    cargarDocumentosExpediente(expedienteActual._id);
  } catch (err) {
    alert(err.message);
  }
}

cargarSelects().then(cargarExpedientes).catch((err) => alert(err.message));
