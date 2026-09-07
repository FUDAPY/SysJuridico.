// Cliente API compartido: maneja token JWT, sesión y helpers comunes a todas las páginas.
const API_BASE = '/api';

function obtenerSesion() {
  const token = localStorage.getItem('token');
  const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
  return { token, usuario };
}

function requerirSesion() {
  const { token, usuario } = obtenerSesion();
  if (!token || !usuario) {
    window.location.href = '/login.html';
    throw new Error('Sesión no encontrada');
  }
  return { token, usuario };
}

function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = '/login.html';
}

async function apiFetch(ruta, { method = 'GET', body } = {}) {
  const { token } = obtenerSesion();
  const respuesta = await fetch(`${API_BASE}${ruta}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await respuesta.json().catch(() => ({}));
  if (respuesta.status === 401) {
    cerrarSesion();
    throw new Error('Sesión expirada');
  }
  if (!respuesta.ok) {
    throw new Error(json.message || 'Error en la solicitud.');
  }
  return json.data;
}

function formatoGs(numero) {
  return new Intl.NumberFormat('es-PY').format(Math.round(numero || 0)) + ' Gs.';
}

function formatoFecha(fecha) {
  if (!fecha) return '';
  return new Date(fecha).toLocaleDateString('es-PY');
}

// Construye la barra lateral de navegación según el rol del usuario (admin ve todo, abogado solo su subconjunto)
function renderBarraLateral(paginaActiva) {
  const { usuario } = obtenerSesion();
  if (!usuario) return;

  const enlacesAdmin = [
    { href: '/index.html', texto: 'Resumen', id: 'resumen', icono: '📊' },
    { href: '/clientes.html', texto: 'Clientes', id: 'clientes', icono: '👥' },
    { href: '/expedientes.html', texto: 'Expedientes', id: 'expedientes', icono: '📁' },
    { href: '/creditos.html', texto: 'Créditos / Cobranzas', id: 'creditos', icono: '💰' },
    { href: '/agenda.html', texto: 'Agenda', id: 'agenda', icono: '📅' },
    { href: '/requisitos.html', texto: 'Requisitos y Trámites', id: 'requisitos', icono: '🧾' },
    { href: '/archivos.html', texto: 'Ubicación de Archivos', id: 'archivos', icono: '🗂️' },
    { href: '/usuarios.html', texto: 'Usuarios', id: 'usuarios', icono: '⚙️' },
    { href: '/liquidacion.html', texto: 'Liquidación Laboral', id: 'liquidacion', icono: '🧮' },
    { href: '/lexpy.html', texto: 'LexPY (Chat IA)', id: 'lexpy', icono: '🤖' },
  ];

  const enlacesAbogado = [
    { href: '/index.html', texto: 'Resumen del día', id: 'resumen', icono: '📊' },
    { href: '/expedientes.html', texto: 'Expedientes', id: 'expedientes', icono: '📁' },
    { href: '/liquidacion.html', texto: 'Créditos / Liquidación', id: 'liquidacion', icono: '🧮' },
    { href: '/lexpy.html', texto: 'LexPY (Chat IA)', id: 'lexpy', icono: '🤖' },
  ];

  const enlaces = usuario.rol === 'admin' ? enlacesAdmin : enlacesAbogado;

  const contenedor = document.getElementById('barra-lateral');
  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="logo-marca">
      <img src="/img/logo.jpg" alt="Logo LIN GROUP & Asociados" />
      <div class="marca-nombre">LIN GROUP<small>Asociados</small></div>
    </div>
    <nav>
      ${enlaces
        .map((e) => `<a href="${e.href}" class="${e.id === paginaActiva ? 'activo' : ''}"><span>${e.icono}</span>${e.texto}</a>`)
        .join('')}
    </nav>
    <div class="usuario-actual">
      <strong>${usuario.nombre}</strong><br />
      <span style="text-transform:capitalize">${usuario.rol}</span>
      <button class="salir" onclick="cerrarSesion()">Cerrar sesión</button>
    </div>
  `;
}
