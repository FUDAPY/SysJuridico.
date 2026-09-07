requerirSesion();
renderBarraLateral('archivos');

let archivos = [];

function pintarTabla() {
  const q = (document.getElementById('buscador').value || '').toLowerCase();
  const filtrados = archivos.filter((a) =>
    [a.nombre || '', a.ubicacion || ''].join(' ').toLowerCase().includes(q)
  );

  document.getElementById('tablaArchivos').innerHTML = filtrados.length
    ? filtrados
        .map(
          (a) => `<tr>
            <td><strong>${a.nombre || '—'}</strong></td>
            <td>${a.ubicacion || '—'}</td>
            <td>${formatoFecha(a.createdAt)}</td>
            <td>
              <button class="btn-secundario" onclick='editarArchivo(${JSON.stringify(a)})'>Editar</button>
              <button class="btn-peligro" onclick="eliminarArchivo('${a._id}')">Eliminar</button>
            </td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="4">No hay archivos registrados.</td></tr>';
}

async function cargarArchivos() {
  archivos = await apiFetch('/archivos');
  pintarTabla();
}

function abrirModalArchivo() {
  document.getElementById('tituloModalArchivo').textContent = 'Registrar archivo';
  document.getElementById('archivoId').value = '';
  document.getElementById('afNombre').value = '';
  document.getElementById('afUbicacion').value = '';
  document.getElementById('modalArchivo').classList.remove('oculto');
}

function editarArchivo(archivo) {
  document.getElementById('tituloModalArchivo').textContent = 'Editar archivo';
  document.getElementById('archivoId').value = archivo._id;
  document.getElementById('afNombre').value = archivo.nombre || '';
  document.getElementById('afUbicacion').value = archivo.ubicacion || '';
  document.getElementById('modalArchivo').classList.remove('oculto');
}

function cerrarModalArchivo() {
  document.getElementById('modalArchivo').classList.add('oculto');
}

async function guardarArchivo() {
  const id = document.getElementById('archivoId').value;
  const datos = {
    nombre: document.getElementById('afNombre').value,
    ubicacion: document.getElementById('afUbicacion').value,
  };

  try {
    await apiFetch(id ? `/archivos/${id}` : '/archivos', { method: id ? 'PUT' : 'POST', body: datos });
    cerrarModalArchivo();
    cargarArchivos();
  } catch (err) {
    alert(err.message);
  }
}

async function eliminarArchivo(id) {
  if (!confirm('¿Eliminar este registro de archivo?')) return;
  try {
    await apiFetch(`/archivos/${id}`, { method: 'DELETE' });
    cargarArchivos();
  } catch (err) {
    alert(err.message);
  }
}

cargarArchivos().catch((err) => alert(err.message));
