requerirSesion();
renderBarraLateral('clientes');

let temporizadorBusqueda = null;

async function cargarClientes(buscar = '') {
  const clientes = await apiFetch(`/clientes${buscar ? `?buscar=${encodeURIComponent(buscar)}` : ''}`);
  document.getElementById('tablaClientes').innerHTML = clientes.length
    ? clientes
        .map(
          (c) => `<tr>
            <td>${c.nombreCompleto}</td>
            <td>${c.cedula}</td>
            <td>${c.telefono}</td>
            <td>${c.direccion || '-'}</td>
            <td>
              <button class="btn-secundario" onclick='editarCliente(${JSON.stringify(c)})'>Editar</button>
              <button class="btn-peligro" onclick="eliminarCliente('${c._id}')">Eliminar</button>
            </td>
          </tr>`
        )
        .join('')
    : '<tr><td colspan="5">No hay clientes registrados.</td></tr>';
}

function buscarClientes() {
  clearTimeout(temporizadorBusqueda);
  const valor = document.getElementById('buscador').value;
  temporizadorBusqueda = setTimeout(() => cargarClientes(valor), 300);
}

function abrirModalCliente() {
  document.getElementById('tituloModalCliente').textContent = 'Nuevo cliente';
  document.getElementById('clienteId').value = '';
  ['fNombre', 'fCedula', 'fTelefono', 'fDireccion'].forEach((id) => (document.getElementById(id).value = ''));
  document.getElementById('modalCliente').classList.remove('oculto');
}

function editarCliente(cliente) {
  document.getElementById('tituloModalCliente').textContent = 'Editar cliente';
  document.getElementById('clienteId').value = cliente._id;
  document.getElementById('fNombre').value = cliente.nombreCompleto;
  document.getElementById('fCedula').value = cliente.cedula;
  document.getElementById('fTelefono').value = cliente.telefono;
  document.getElementById('fDireccion').value = cliente.direccion || '';
  document.getElementById('modalCliente').classList.remove('oculto');
}

function cerrarModalCliente() {
  document.getElementById('modalCliente').classList.add('oculto');
}

async function guardarCliente() {
  const id = document.getElementById('clienteId').value;
  const datos = {
    nombreCompleto: document.getElementById('fNombre').value,
    cedula: document.getElementById('fCedula').value,
    telefono: document.getElementById('fTelefono').value,
    direccion: document.getElementById('fDireccion').value,
  };

  try {
    await apiFetch(id ? `/clientes/${id}` : '/clientes', { method: id ? 'PUT' : 'POST', body: datos });
    cerrarModalCliente();
    cargarClientes();
  } catch (err) {
    alert(err.message);
  }
}

async function eliminarCliente(id) {
  if (!confirm('¿Eliminar este cliente?')) return;
  try {
    await apiFetch(`/clientes/${id}`, { method: 'DELETE' });
    cargarClientes();
  } catch (err) {
    alert(err.message);
  }
}

cargarClientes().catch((err) => alert(err.message));
