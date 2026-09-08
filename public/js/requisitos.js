requerirSesion();
renderBarraLateral('requisitos');
const esAdmin = ocultarAccionesAdmin();

let requisitos = [];

function pintarTabla() {
  const q = (document.getElementById('buscador').value || '').toLowerCase();
  const filtrados = requisitos.filter((r) =>
    [r.titulo || '', r.categoria || ''].join(' ').toLowerCase().includes(q)
  );

  document.getElementById('tablaRequisitos').innerHTML = filtrados.length
    ? filtrados
        .map(
          (r) => `<tr>
            <td><strong>${r.titulo || '—'}</strong></td>
            <td>${r.categoria || '—'}</td>
            <td>${formatoGs(r.costo)}</td>
            <td style="white-space:pre-line; font-size:.85rem; max-width:420px">${r.requisitos || '—'}</td>
            <td>
              ${esAdmin
                ? `<button class="btn-secundario" onclick='editarRequisito(${JSON.stringify(r)})'>Editar</button>
                   <button class="btn-peligro" onclick="eliminarRequisito('${r._id}')">Eliminar</button>`
                : '—'}
            </td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="5">No hay requisitos para los filtros seleccionados.</td></tr>';
}

async function cargarRequisitos() {
  requisitos = await apiFetch('/requisitos');
  pintarTabla();
}

function abrirModalRequisito() {
  document.getElementById('tituloModalRequisito').textContent = 'Nuevo requisito';
  document.getElementById('requisitoId').value = '';
  ['rqTitulo', 'rqCategoria', 'rqCosto', 'rqRequisitos'].forEach((id) => (document.getElementById(id).value = ''));
  document.getElementById('modalRequisito').classList.remove('oculto');
}

function editarRequisito(requisito) {
  document.getElementById('tituloModalRequisito').textContent = 'Editar requisito';
  document.getElementById('requisitoId').value = requisito._id;
  document.getElementById('rqTitulo').value = requisito.titulo || '';
  document.getElementById('rqCategoria').value = requisito.categoria || '';
  document.getElementById('rqCosto').value = requisito.costo || 0;
  document.getElementById('rqRequisitos').value = requisito.requisitos || '';
  document.getElementById('modalRequisito').classList.remove('oculto');
}

function cerrarModalRequisito() {
  document.getElementById('modalRequisito').classList.add('oculto');
}

async function guardarRequisito() {
  const id = document.getElementById('requisitoId').value;
  const datos = {
    titulo: document.getElementById('rqTitulo').value,
    categoria: document.getElementById('rqCategoria').value,
    costo: Number(document.getElementById('rqCosto').value) || 0,
    requisitos: document.getElementById('rqRequisitos').value,
  };

  try {
    await apiFetch(id ? `/requisitos/${id}` : '/requisitos', { method: id ? 'PUT' : 'POST', body: datos });
    cerrarModalRequisito();
    cargarRequisitos();
  } catch (err) {
    alert(err.message);
  }
}

async function eliminarRequisito(id) {
  if (!confirm('¿Eliminar este requisito?')) return;
  try {
    await apiFetch(`/requisitos/${id}`, { method: 'DELETE' });
    cargarRequisitos();
  } catch (err) {
    alert(err.message);
  }
}

cargarRequisitos().catch((err) => alert(err.message));
