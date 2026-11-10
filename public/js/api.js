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

function esAdministrador() {
  const { usuario } = obtenerSesion();
  return !!(usuario && usuario.rol === 'admin');
}

// Oculta los elementos marcados con [data-admin] cuando el usuario no es admin.
function ocultarAccionesAdmin() {
  const admin = esAdministrador();
  document.querySelectorAll('[data-admin]').forEach((el) => {
    el.style.display = admin ? '' : 'none';
  });
  return admin;
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

// Gestión de tema (Modo Oscuro / Claro) estilo expedientes.click
function obtenerTemaActual() {
  return localStorage.getItem('sysjuridico_theme') || 'light';
}

function aplicarTema(tema) {
  document.documentElement.setAttribute('data-theme', tema);
  if (tema === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem('sysjuridico_theme', tema);
  const btn = document.getElementById('btnToggleTema');
  if (btn) btn.innerHTML = tema === 'dark' ? '☀️' : '🌙';
}

function alternarTema() {
  const actual = obtenerTemaActual();
  aplicarTema(actual === 'dark' ? 'light' : 'dark');
}

// Inicializar tema inmediatamente
(function () {
  try {
    const temaGuardado = localStorage.getItem('sysjuridico_theme') || 'light';
    aplicarTema(temaGuardado);
  } catch {}
})();

function formatoGs(numero) {
  return new Intl.NumberFormat('es-PY').format(Math.round(numero || 0)) + ' Gs.';
}

function formatoFecha(fecha) {
  if (!fecha) return '';
  return new Date(fecha).toLocaleDateString('es-PY');
}

// Construye la barra lateral de navegación según el rol del usuario estilo expedientes.click
function renderBarraLateral(paginaActiva) {
  const { usuario } = obtenerSesion();
  if (!usuario) return;

  const grupos = [
    {
      titulo: 'Operaciones',
      enlaces: [
        { href: '/index.html', texto: 'Inicio / Asistente', id: 'resumen', icono: '🏠' },
        { href: '/expedientes.html', texto: 'Expedientes', id: 'expedientes', icono: '📁' },
        { href: '/clientes.html', texto: 'Clientes', id: 'clientes', icono: '👥' },
        { href: '/agenda.html', texto: 'Agenda & Plazos', id: 'agenda', icono: '📅' },
      ],
    },
    {
      titulo: 'Finanzas & Trámites',
      enlaces: [
        { href: '/creditos.html', texto: 'Créditos / Cobros', id: 'creditos', icono: '💰' },
        { href: '/liquidacion.html', texto: 'Liquidación MTESS', id: 'liquidacion', icono: '🧮' },
        { href: '/requisitos.html', texto: 'Requisitos & Trámites', id: 'requisitos', icono: '🧾' },
        { href: '/archivos.html', texto: 'Ubicación Archivos', id: 'archivos', icono: '🗂️' },
      ],
    },
    {
      titulo: 'Inteligencia & Red',
      enlaces: [
        { href: '/editor.html', texto: 'Editor Judicial', id: 'editor', icono: '📝' },
        { href: '/lexpy.html', texto: 'Techapyrã IA', id: 'lexpy', icono: '🤖' },
        { href: '/grafo.html', texto: 'Red de Conocimiento', id: 'grafo', icono: '🕸️' },
        ...(usuario.rol === 'admin' ? [{ href: '/usuarios.html', texto: 'Usuarios & Equipo', id: 'usuarios', icono: '⚙️' }] : []),
      ],
    },
  ];

  const contenedor = document.getElementById('barra-lateral');
  if (!contenedor) return;

  const iniciales = (usuario.nombre || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const temaActual = obtenerTemaActual();

  contenedor.innerHTML = `
    <div class="logo-marca">
      <img src="/img/logo.jpg" alt="Logo LIN GROUP & Asociados" onerror="this.src='/877114.jpg'" />
      <div class="marca-nombre">LIN GROUP<small>Asociados • SysJurídico</small></div>
    </div>
    <nav>
      ${grupos
        .map(
          (g) => `
        <div class="seccion-titulo">${g.titulo}</div>
        ${g.enlaces
          .map(
            (e) => `
          <a href="${e.href}" class="${e.id === paginaActiva ? 'activo' : ''}">
            <span class="icono">${e.icono}</span>
            <span>${e.texto}</span>
          </a>`
          )
          .join('')}
      `
        )
        .join('')}
    </nav>
    <div class="usuario-actual">
      <div class="user-card">
        <div class="user-avatar">${iniciales}</div>
        <div style="flex:1; overflow:hidden">
          <strong style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${usuario.nombre}</strong>
          <span style="font-size:0.75rem; color:var(--dorado); text-transform:uppercase; font-weight:700">${usuario.rol}</span>
        </div>
        <button id="btnToggleTema" class="toggle-tema-btn" onclick="alternarTema()" title="Cambiar modo oscuro/claro" style="width:32px; height:32px; font-size:0.9rem">
          ${temaActual === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
      <button class="salir" onclick="cerrarSesion()">
        <span>🚪</span> Cerrar sesión
      </button>
    </div>
    <div style="padding: 12px 14px 16px; font-size: 0.7rem; color: var(--texto-muted); text-align: center; border-top: 1px solid var(--borde); line-height: 1.4;">
      Todos los derechos reservados.<br>
      Sistema creado e impulsado por <a href="https://dev.grupooh.online/" target="_blank" rel="noopener noreferrer" style="color: var(--azul-claro); font-weight: 600; text-decoration: none;">Otelax Dev</a>
    </div>
  `;

  inyectarWidgetLexpyFlotante(paginaActiva);
  inyectarPieDePaginaGlobal();
}

// Inyecta el botón de acceso rápido de Techapyrã si no estamos en la página del chat
function inyectarWidgetLexpyFlotante(paginaActiva) {
  if (paginaActiva === 'lexpy') return;
  if (document.getElementById('btnWidgetLexpy')) return;

  const btn = document.createElement('a');
  btn.id = 'btnWidgetLexpy';
  btn.href = '/lexpy.html';
  btn.className = 'widget-lexpy-btn';
  btn.title = 'Consultar a Techapyrã IA';
  btn.innerHTML = '🤖';
  document.body.appendChild(btn);
}

// Inyecta pie de página institucional de Otelax Dev al final de las vistas
function inyectarPieDePaginaGlobal() {
  if (document.getElementById('piePaginaOtelax')) return;
  const target = document.querySelector('.contenido') || document.querySelector('.app-main') || document.querySelector('main');
  if (!target) return;

  const footer = document.createElement('footer');
  footer.id = 'piePaginaOtelax';
  footer.className = 'pie-pagina-sistema';
  footer.innerHTML = `
    <div>© ${new Date().getFullYear()} Todos los derechos reservados.</div>
    <div style="margin-top: 4px;">
      Sistema creado e impulsado por 
      <a href="https://dev.grupooh.online/" target="_blank" rel="noopener noreferrer">Otelax Dev</a> 
      (<em><a href="https://dev.grupooh.online/" target="_blank" rel="noopener noreferrer">www.dev.grupooh.online</a></em>)
    </div>
  `;
  target.appendChild(footer);
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(inyectarPieDePaginaGlobal, 100);
});

