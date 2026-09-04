requerirSesion();
renderBarraLateral('usuarios');

async function cargarUsuarios() {
  const usuarios = await apiFetch('/usuarios');
  document.getElementById('tablaUsuarios').innerHTML = usuarios
    .map(
      (u) => `<tr>
        <td>${u.nombre}</td>
        <td>${u.email}</td>
        <td><span class="badge badge-azul">${u.rol}</span></td>
        <td><span class="badge ${u.activo ? 'badge-verde' : 'badge-rojo'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
        <td>
          <button class="btn-secundario" onclick="alternarActivo('${u._id}', ${!u.activo})">${u.activo ? 'Desactivar' : 'Activar'}</button>
          <button class="btn-peligro" onclick="eliminarUsuario('${u._id}')">Eliminar</button>
        </td>
      </tr>`
    )
    .join('');
}

function abrirModalUsuario() {
  document.getElementById('modalUsuario').classList.remove('oculto');
}
function cerrarModalUsuario() {
  document.getElementById('modalUsuario').classList.add('oculto');
}

async function guardarUsuario() {
  try {
    await apiFetch('/usuarios', {
      method: 'POST',
      body: {
        nombre: document.getElementById('uNombre').value,
        email: document.getElementById('uEmail').value,
        password: document.getElementById('uPassword').value,
        rol: document.getElementById('uRol').value,
      },
    });
    cerrarModalUsuario();
    cargarUsuarios();
  } catch (err) {
    alert(err.message);
  }
}

async function alternarActivo(id, nuevoEstado) {
  try {
    await apiFetch(`/usuarios/${id}`, { method: 'PUT', body: { activo: nuevoEstado } });
    cargarUsuarios();
  } catch (err) {
    alert(err.message);
  }
}

async function eliminarUsuario(id) {
  if (!confirm('¿Eliminar este usuario?')) return;
  try {
    await apiFetch(`/usuarios/${id}`, { method: 'DELETE' });
    cargarUsuarios();
  } catch (err) {
    alert(err.message);
  }
}

cargarUsuarios().catch((err) => alert(err.message));
