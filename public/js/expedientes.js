const { usuario } = requerirSesion();
renderBarraLateral('expedientes');

const esAdmin = usuario.rol === 'admin';
document.getElementById('contenedorFiltroAbogado').classList.toggle('oculto', !esAdmin);
document.getElementById('contenedorAbogadoAsignado').classList.toggle('oculto', !esAdmin);
// Solo el admin puede crear expedientes o subir documentos
if (!esAdmin) {
  const btnNuevo = document.getElementById('btnNuevoExpediente');
  const zonaDocs = document.getElementById('zonaSubirDoc');
  if (btnNuevo) btnNuevo.style.display = 'none';
  if (zonaDocs) zonaDocs.style.display = 'none';
}

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

let pestanaEstadoActual = 'todos';
let listaExpedientesMemoria = [];

function filtrarPorPestanaEstado(tab) {
  pestanaEstadoActual = tab;
  document.getElementById('tabEstadoTodos').classList.toggle('activo', tab === 'todos');
  document.getElementById('tabEstadoArchivado').classList.toggle('activo', tab === 'archivado');
  
  if (tab === 'todos') {
    document.getElementById('tabEstadoTodos').style.background = '#fff';
    document.getElementById('tabEstadoTodos').style.color = '#0f172a';
    document.getElementById('tabEstadoArchivado').style.background = 'transparent';
    document.getElementById('tabEstadoArchivado').style.color = 'var(--texto-muted)';
  } else {
    document.getElementById('tabEstadoArchivado').style.background = '#fff';
    document.getElementById('tabEstadoArchivado').style.color = '#0f172a';
    document.getElementById('tabEstadoTodos').style.background = 'transparent';
    document.getElementById('tabEstadoTodos').style.color = 'var(--texto-muted)';
  }
  cargarExpedientes();
}

async function cargarExpedientes() {
  const params = new URLSearchParams();
  const buscar = document.getElementById('fBuscar')?.value;
  const juzgado = document.getElementById('fJuzgado')?.value;
  
  if (buscar) params.set('buscar', buscar);
  if (juzgado) params.set('juzgado', juzgado);
  if (pestanaEstadoActual === 'archivado') params.set('estado', 'archivado');

  try {
    const expedientes = await apiFetch(`/expedientes?${params.toString()}`);
    listaExpedientesMemoria = expedientes;

    // Actualizar contador en header de columna
    const badgeCant = document.getElementById('cantExpedientes');
    if (badgeCant) badgeCant.textContent = `(${expedientes.length})`;

    // Población dinámica de juzgados únicos si está vacío
    const selectJuzgado = document.getElementById('fJuzgado');
    if (selectJuzgado && selectJuzgado.options.length <= 1) {
      const juzgadosUnicos = [...new Set(expedientes.map((e) => e.juzgado).filter(Boolean))];
      juzgadosUnicos.forEach((j) => {
        const opt = document.createElement('option');
        opt.value = j;
        opt.textContent = j;
        selectJuzgado.appendChild(opt);
      });
    }

    const tabla = document.getElementById('tablaExpedientes');
    if (!expedientes.length) {
      tabla.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:48px 20px; color:var(--texto-muted); font-size:0.95rem;">No hay expedientes para mostrar.</td></tr>`;
      return;
    }

    tabla.innerHTML = expedientes
      .map(
        (e) => `
        <tr style="border-bottom:1px solid #1e293b; transition:background 0.2s;" onmouseover="this.style.background='#131f33'" onmouseout="this.style.background='transparent'">
          <td style="padding:16px 18px; font-weight:700; color:#60a5fa; font-size:0.9rem;">
            ${e.numero || 'S/N'}/${e.ano || '2026'}
          </td>
          <td style="padding:16px 18px;">
            <div style="font-weight:600; color:#fff; font-size:0.92rem; margin-bottom:4px;">${e.caratula}</div>
            <div style="font-size:0.78rem; color:var(--texto-muted); display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <span class="badge" style="background:#1e293b; color:#93c5fd; padding:2px 8px; border-radius:4px; font-size:0.75rem;">${e.materia || e.fuero || 'Civil y Comercial'}</span>
              <span>🏛️ ${e.juzgado || 'Juzgado s/d'}</span>
              <span>👤 ${e.cliente?.nombreCompleto || 'Cliente s/d'}</span>
            </div>
          </td>
          <td style="padding:16px 18px;">
            <span style="display:inline-flex; align-items:center; gap:5px; font-size:0.82rem; color:${e.visto ? '#34d399' : '#94a3b8'};">
              <span>${e.visto ? '👁️' : '⚪'}</span> ${e.visto ? 'Visto' : 'Sin ver'}
            </span>
          </td>
          <td style="padding:16px 18px;">
            <div style="font-size:0.85rem; color:#cbd5e1;">${e.ultimaActuacionTexto || 'Actuación en trámite'}</div>
            <div style="font-size:0.75rem; color:var(--texto-muted); margin-top:2px;">${formatoFecha(e.updatedAt || e.createdAt)}</div>
          </td>
          <td style="padding:16px 18px; text-align:right;">
            <div style="display:inline-flex; gap:6px; align-items:center;">
              <button class="boton btn-secundario btn-sm" onclick='verDetalleExpediente(${JSON.stringify(e)})' title="Ver detalles y documentación">
                👁️ Ver
              </button>
              ${Number(e.saldoPendiente) > 0 ? `<a href="/creditos.html" class="boton btn-primario btn-sm" title="Registrar cobranza">💰 Cobro</a>` : ''}
              <button class="boton btn-sm" style="background:#dc2626; color:#fff; border:none; padding:5px 9px; border-radius:6px; cursor:pointer;" onclick="eliminarExpediente('${e._id}', '${(e.caratula || '').replace(/'/g, "\\'")}')" title="Eliminar expediente">
                🗑️ Eliminar
              </button>
            </div>
          </td>
        </tr>
      `
      )
      .join('');
  } catch (err) {
    document.getElementById('tablaExpedientes').innerHTML = `<tr><td colspan="5" style="padding:20px; color:#f87171; text-align:center;">Error cargando causas: ${err.message}</td></tr>`;
  }
}

async function eliminarExpediente(id, caratula) {
  if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el expediente:\n"${caratula}"?\n\nEsta acción no se puede deshacer.`)) {
    return;
  }
  try {
    await apiFetch(`/expedientes/${id}`, { method: 'DELETE' });
    alert('Expediente eliminado correctamente.');
    cargarExpedientes();
  } catch (err) {
    alert('Error al eliminar expediente: ' + err.message);
  }
}

function alternarModoFocus() {
  const lateral = document.getElementById('barra-lateral');
  const contenido = document.querySelector('.contenido');
  if (lateral) lateral.classList.toggle('oculto');
  if (contenido) contenido.classList.toggle('modo-focus-activo');
  const btn = document.getElementById('btnModoFocus');
  if (btn) {
    btn.innerHTML = lateral?.classList.contains('oculto') ? '<span>🔙</span> Salir Focus' : '<span>⚡</span> Modo Focus 🚀';
  }
}

function exportarExpedientesCSV() {
  if (!listaExpedientesMemoria.length) return alert('No hay expedientes para exportar.');
  const encabezados = ['Nro', 'Ano', 'Caratula', 'Juzgado', 'Materia', 'TipoProceso', 'Fase', 'Cliente', 'SaldoPendiente'];
  const filas = listaExpedientesMemoria.map((e) => [
    `"${e.numero || ''}"`,
    `"${e.ano || ''}"`,
    `"${(e.caratula || '').replace(/"/g, '""')}"`,
    `"${(e.juzgado || '').replace(/"/g, '""')}"`,
    `"${(e.materia || e.fuero || '').replace(/"/g, '""')}"`,
    `"${(e.tipoProceso || '').replace(/"/g, '""')}"`,
    `"${(e.fase || '').replace(/"/g, '""')}"`,
    `"${(e.cliente?.nombreCompleto || '').replace(/"/g, '""')}"`,
    e.saldoPendiente || 0,
  ]);

  const csvContenido = 'data:text/csv;charset=utf-8,' + [encabezados.join(','), ...filas.map((f) => f.join(','))].join('\n');
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContenido));
  link.setAttribute('download', `Expedientes_SysJuridico_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
    <div class="tarjeta" style="padding:10px"><div class="etiqueta" style="text-transform:uppercase">Materia / Fuero</div>${expediente.materia || expediente.fuero || '-'}</div>
    <div class="tarjeta" style="padding:10px"><div class="etiqueta" style="text-transform:uppercase">Juzgado</div>${expediente.juzgado || '-'}</div>
    <div class="tarjeta" style="padding:10px"><div class="etiqueta" style="text-transform:uppercase">Nro / Año</div>${expediente.numero || 'S/N'} / ${expediente.ano || '-'}</div>
    <div class="tarjeta" style="padding:10px"><div class="etiqueta" style="text-transform:uppercase">Tipo Proceso</div>${expediente.tipoProceso || '-'}</div>
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
    <b>FUERO:</b> ${e.materia || e.fuero || '-'} &nbsp; <b>JUZGADO:</b> ${e.juzgado || '-'}
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

function abrirVentanaTicket(html) {
  const ventana = window.open('', '_blank', 'width=420,height=560');
  if (!ventana) { alert('Permite las ventanas emergentes para imprimir tickets.'); return; }
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
  setTimeout(() => { ventana.print(); }, 400);
}

function alternarCamposCredito() {
  const chk = document.getElementById('eCreditoAutomatico');
  const grupo = document.getElementById('grupoCredito');
  if (chk && grupo) {
    grupo.style.display = chk.checked ? 'grid' : 'none';
  }
}

function abrirModalExpediente() {
  const chk = document.getElementById('eCreditoAutomatico');
  if (chk) chk.checked = true; // Activo por defecto como solicitado
  alternarCamposCredito();

  if (document.getElementById('eCaratula')) document.getElementById('eCaratula').value = '';
  if (document.getElementById('eNumero')) document.getElementById('eNumero').value = '';
  if (document.getElementById('eAno')) document.getElementById('eAno').value = '2026';
  if (document.getElementById('eJuzgado')) document.getElementById('eJuzgado').value = '';
  if (document.getElementById('eCircunscripcion')) document.getElementById('eCircunscripcion').value = 'Capital';
  if (document.getElementById('eMateria')) document.getElementById('eMateria').value = 'Civil y Comercial';
  if (document.getElementById('eTipoProceso')) document.getElementById('eTipoProceso').value = '';
  if (document.getElementById('eFase')) document.getElementById('eFase').value = 'Inicio';
  if (document.getElementById('eMontoCuantia')) document.getElementById('eMontoCuantia').value = '';
  if (document.getElementById('eCantidadCuotas')) document.getElementById('eCantidadCuotas').value = '3';
  if (document.getElementById('eFrecuenciaCuotas')) document.getElementById('eFrecuenciaCuotas').value = 'mensual';
  if (document.getElementById('eEntregaInicial')) document.getElementById('eEntregaInicial').value = '0';

  document.getElementById('modalExpediente').classList.remove('oculto');
}

function cerrarModalExpediente() {
  document.getElementById('modalExpediente').classList.add('oculto');
}

async function guardarExpediente() {
  const caratula = document.getElementById('eCaratula')?.value.trim();
  if (!caratula) {
    return alert('Por favor, ingresá la Carátula del Expediente.');
  }

  const datos = {
    caratula,
    numero: document.getElementById('eNumero')?.value.trim() || '',
    ano: Number(document.getElementById('eAno')?.value) || 2026,
    juzgado: document.getElementById('eJuzgado')?.value.trim() || '',
    circunscripcion: document.getElementById('eCircunscripcion')?.value.trim() || 'Capital',
    materia: document.getElementById('eMateria')?.value || 'Civil y Comercial',
    tipoProceso: document.getElementById('eTipoProceso')?.value.trim() || '',
    fase: document.getElementById('eFase')?.value.trim() || 'Inicio',
    montoCuantia: Number(document.getElementById('eMontoCuantia')?.value) || 0,
    honorariosTotales: Number(document.getElementById('eMontoCuantia')?.value) || 0,
    cliente: document.getElementById('eCliente')?.value || null,
    abogadoAsignado: document.getElementById('eAbogado')?.value || usuario.id,
    creditoAutomatico: document.getElementById('eCreditoAutomatico')?.checked !== false,
    cantidadCuotas: Number(document.getElementById('eCantidadCuotas')?.value) || 3,
    frecuenciaCuotas: document.getElementById('eFrecuenciaCuotas')?.value || 'mensual',
    entregaInicial: Number(document.getElementById('eEntregaInicial')?.value) || 0,
  };

  try {
    await apiFetch('/expedientes', { method: 'POST', body: datos });
    alert('Expediente y plan de crédito creados exitosamente.');
    cerrarModalExpediente();
    cargarExpedientes();
  } catch (err) {
    alert('Error al guardar expediente: ' + err.message);
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
              ${esAdmin ? `<button class="btn-peligro" style="padding:5px 8px;font-size:.75rem" onclick="eliminarDocumentoExpediente('${d._id}')">🗑 Eliminar</button>` : ''}
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

/* ---------- Sincronización con Portal CSJ (Judisoft) ---------- */
async function verificarEstadoCSJ() {
  try {
    const res = await apiFetch('/expedientes/csj/estado');
    if (!res.success) return;
    const est = res.data;
    const badge = document.getElementById('csjBadgeEstado');
    const txt = document.getElementById('txtEstadoCSJ');

    if (est.conectado) {
      if (badge) {
        badge.textContent = `Conectado (${est.usuarioCSJ})`;
        badge.className = 'badge badge-success';
      }
      if (txt) txt.textContent = `CSJ Conectado (${est.totalExpedientesCSJ})`;
      const u = document.getElementById('csjUsuario');
      const m = document.getElementById('csjMatricula');
      if (u) u.value = est.usuarioCSJ;
      if (m) m.value = est.matriculaCSJ || '';
    } else {
      if (badge) {
        badge.textContent = 'No vinculado';
        badge.className = 'badge badge-warning';
      }
      if (txt) txt.textContent = 'Vincular CSJ';
    }
  } catch (err) {
    console.warn('[CSJ] Error consultando estado:', err.message);
  }
}

function abrirModalCSJ() {
  verificarEstadoCSJ();
  document.getElementById('modalCSJ')?.classList.remove('oculto');
}

function cerrarModalCSJ() {
  document.getElementById('modalCSJ')?.classList.add('oculto');
}

async function guardarCredencialesCSJ() {
  const usuarioCSJ = document.getElementById('csjUsuario')?.value;
  const passwordCSJ = document.getElementById('csjPassword')?.value;
  const matriculaCSJ = document.getElementById('csjMatricula')?.value;

  if (!usuarioCSJ || !passwordCSJ) {
    alert('Ingresa el usuario y la contraseña del portal CSJ.');
    return;
  }

  try {
    await apiFetch('/expedientes/csj/vincular', {
      method: 'POST',
      body: { usuarioCSJ, passwordCSJ, matriculaCSJ },
    });
    alert('¡Credenciales de la CSJ vinculadas exitosamente con cifrado AES-256!');
    verificarEstadoCSJ();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
}

async function ejecutarSincronizacionCSJ() {
  const btn = document.getElementById('btnSincronizarAhora');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Sincronizando causas...';
  }

  try {
    const res = await apiFetch('/expedientes/csj/sincronizar', { method: 'POST' });
    alert(`¡Sincronización completada! ${res.data.total} causas procesadas (${res.data.sincronizados} actualizadas, ${res.data.creados} nuevas).`);
    cerrarModalCSJ();
    cargarExpedientes();
    verificarEstadoCSJ();
  } catch (err) {
    alert(`Error al sincronizar: ${err.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '⚡ Sincronizar Ahora';
    }
  }
}

cargarSelects().then(() => {
  cargarExpedientes();
  verificarEstadoCSJ();
}).catch((err) => alert(err.message));

