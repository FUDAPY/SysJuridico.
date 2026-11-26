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
  return json.data !== undefined ? json.data : json;
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
      Hecho por <a href="https://zetti.grupooh.online" target="_blank" rel="noopener noreferrer" style="color: var(--azul-accent); font-weight: 700; text-decoration: none;">ZETTI DIGITAL PY</a>
    </div>
  `;

  inyectarWidgetLexpyFlotante(paginaActiva);
  inyectarPieDePaginaGlobal();
}

const DOMICILIO_PROCESAL_INSTITUCIONAL = 'Edificio BIJ, Av. Camilo Recalde c/ Capitán Miranda, Microcentro, Ciudad del Este';

function alternarSidebar() {
  const colapsado = document.body.classList.toggle('sidebar-colapsado');
  localStorage.setItem('sysjuridico_sidebar_colapsado', colapsado ? 'true' : 'false');
  actualizarIconoHamburguesa();
}

function inicializarSidebarColapsable() {
  const guardado = localStorage.getItem('sysjuridico_sidebar_colapsado');
  if (guardado === 'true') {
    document.body.classList.add('sidebar-colapsado');
  } else {
    document.body.classList.remove('sidebar-colapsado');
  }
  actualizarIconoHamburguesa();
}

function actualizarIconoHamburguesa() {
  const btn = document.getElementById('btnHamburguesaGlobal');
  if (btn) {
    const colapsado = document.body.classList.contains('sidebar-colapsado');
    btn.innerHTML = colapsado ? '☰' : '✕';
    btn.title = colapsado ? 'Expandir barra lateral' : 'Colapsar barra lateral (100% pantalla)';
  }
}

// Modal Bloqueante: Identidad Forense Obligatoria
function verificarPerfilForenseObligatorio() {
  if (window.location.pathname.endsWith('login.html')) return;
  const { usuario } = obtenerSesion();
  if (!usuario) return;

  const nombreCompleto = usuario.nombreCompleto || usuario.nombre || '';
  const matriculaCSJ = usuario.matriculaCSJ || '';
  const cedula = usuario.cedula || '';

  const perfilCompleto = Boolean(nombreCompleto.trim() && matriculaCSJ.trim() && cedula.trim());
  if (perfilCompleto) return;

  mostrarModalPerfilForense(usuario);
}

function mostrarModalPerfilForense(usuario) {
  if (document.getElementById('modalPerfilForenseBloqueante')) return;

  const modal = document.createElement('div');
  modal.id = 'modalPerfilForenseBloqueante';
  modal.className = 'modal-forense-overlay';
  modal.innerHTML = `
    <div class="modal-forense-card">
      <div class="modal-forense-header">
        <div style="font-size: 2rem; margin-bottom: 8px;">⚖️</div>
        <h2>Identidad Forense Obligatoria</h2>
        <p>Conforme a la normativa procesal paraguaya, SysJurídico requiere tu identificación profesional completa para la confección y validez de escritos judiciales.</p>
      </div>
      <form id="formPerfilForense" class="modal-forense-form">
        <div class="campo-grupo">
          <label>Nombre y Apellido Completo *</label>
          <input type="text" id="inpPerfilNombre" required placeholder="Ej: Abg. Giuliano Catella" value="${escapeHtml(usuario.nombreCompleto || usuario.nombre || '')}">
        </div>
        <div class="campo-grid-2">
          <div class="campo-grupo">
            <label>N° Matrícula C.S.J. *</label>
            <input type="text" id="inpPerfilMatricula" required placeholder="Ej: 45892" value="${escapeHtml(usuario.matriculaCSJ || '')}">
          </div>
          <div class="campo-grupo">
            <label>Cédula de Identidad *</label>
            <input type="text" id="inpPerfilCedula" required placeholder="Ej: 4.892.103" value="${escapeHtml(usuario.cedula || '')}">
          </div>
        </div>
        <div class="campo-info-fijo">
          <span>📍 Domicilio Procesal Fijo Institucional:</span>
          <strong>${DOMICILIO_PROCESAL_INSTITUCIONAL}</strong>
        </div>
        <div id="errorPerfilForense" class="error-msg" style="display:none; color: var(--rojo); font-size: 0.85rem; margin-bottom: 12px;"></div>
        <button type="submit" class="boton btn-dorado w-full" id="btnGuardarPerfilForense">
          <span>✓</span> Habilitar y Acceder al Sistema
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  const form = document.getElementById('formPerfilForense');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnGuardarPerfilForense');
    const errDiv = document.getElementById('errorPerfilForense');
    errDiv.style.display = 'none';

    const nombreCompleto = document.getElementById('inpPerfilNombre').value.trim();
    const matriculaCSJ = document.getElementById('inpPerfilMatricula').value.trim();
    const cedula = document.getElementById('inpPerfilCedula').value.trim();

    if (!nombreCompleto || !matriculaCSJ || !cedula) {
      errDiv.textContent = 'Todos los campos marcados con (*) son obligatorios.';
      errDiv.style.display = 'block';
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> Validando y registrando...';

      const res = await apiFetch('/auth/perfil-forense', {
        method: 'PUT',
        body: { nombreCompleto, matriculaCSJ, cedula },
      });

      // Actualizar localStorage
      const { usuario: uActual } = obtenerSesion();
      const uNuevo = { ...uActual, ...res.usuario, perfilForenseCompleto: true };
      localStorage.setItem('usuario', JSON.stringify(uNuevo));

      modal.remove();
      window.location.reload();
    } catch (err) {
      btn.disabled = false;
      btn.innerHTML = '<span>✓</span> Habilitar y Acceder al Sistema';
      errDiv.textContent = err.message || 'Error al guardar perfil forense.';
      errDiv.style.display = 'block';
    }
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Inyecta el botón hamburguesa global en la barra o pantalla
function inyectarBotonHamburguesa() {
  if (document.getElementById('btnHamburguesaGlobal')) return;
  const btn = document.createElement('button');
  btn.id = 'btnHamburguesaGlobal';
  btn.className = 'btn-hamburguesa-flotante';
  btn.title = 'Colapsar/Expandir barra lateral';
  btn.innerHTML = '☰';
  btn.onclick = alternarSidebar;
  document.body.appendChild(btn);
  inicializarSidebarColapsable();
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

// Inyecta pie de página institucional de ZETTI DIGITAL PY al final de las vistas
function inyectarPieDePaginaGlobal() {
  if (document.getElementById('piePaginaZetti') || document.getElementById('piePaginaOtelax')) return;
  const target = document.querySelector('.contenido') || document.querySelector('.app-main') || document.querySelector('main');
  if (!target) return;

  const footer = document.createElement('footer');
  footer.id = 'piePaginaZetti';
  footer.className = 'pie-pagina-sistema';
  footer.innerHTML = `
    <div>© ${new Date().getFullYear()} SysJurídico &bull; Todos los derechos reservados.</div>
    <div style="margin-top: 4px; display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;">
      <span>Sistema hecho por</span>
      <a href="https://zetti.grupooh.online" target="_blank" rel="noopener noreferrer" style="font-weight: 700; color: var(--azul-accent);">ZETTI DIGITAL PY</a>
    </div>
  `;
  target.appendChild(footer);
}

document.addEventListener('DOMContentLoaded', () => {
  inyectarBotonHamburguesa();
  setTimeout(() => {
    inyectarPieDePaginaGlobal();
    verificarPerfilForenseObligatorio();
  }, 100);
});

