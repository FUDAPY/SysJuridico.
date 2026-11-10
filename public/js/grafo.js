document.addEventListener('DOMContentLoaded', () => {
  renderBarraLateral('grafo');

  const canvas = document.getElementById('grafoCanvas');
  const ctx = canvas.getContext('2d');

  // Elementos de UI
  const statNodos = document.getElementById('statNodos');
  const statEnlaces = document.getElementById('statEnlaces');
  const statLeyes = document.getElementById('statLeyes');
  const statMemorias = document.getElementById('statMemorias');
  const busquedaInput = document.getElementById('busquedaGrafo');
  const drawer = document.getElementById('grafoDrawer');
  const drawerBadge = document.getElementById('drawerBadge');
  const drawerTitulo = document.getElementById('drawerTitulo');
  const drawerDetalle = document.getElementById('drawerDetalle');
  const drawerConexiones = document.getElementById('drawerConexiones');
  const btnCloseDrawer = document.getElementById('btnCloseDrawer');
  const btnAccionNodo = document.getElementById('btnAccionNodo');

  // Modal Obsidian
  const btnGuiaObsidian = document.getElementById('btnGuiaObsidian');
  const modalObsidian = document.getElementById('modalObsidian');
  const btnCerrarModalObsidian = document.getElementById('btnCerrarModalObsidian');
  const btnEntendidoObsidian = document.getElementById('btnEntendidoObsidian');
  const endpointUrlInput = document.getElementById('endpointUrl');
  const btnCopiarEndpoint = document.getElementById('btnCopiarEndpoint');

  if (endpointUrlInput) {
    endpointUrlInput.value = `${window.location.origin}/api/v1`;
  }

  // Estado del Grafo
  let nodos = [];
  let enlaces = [];
  let nodosVisibles = [];
  let enlacesVisibles = [];
  let filtroActivo = 'todos';
  let terminoBusqueda = '';
  let nodoSeleccionado = null;
  let nodoHover = null;
  let nodoArrastrado = null;

  // Transformación de la vista (Pan & Zoom)
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  // Ajuste de resolución Canvas
  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);
    if (panX === 0 && panY === 0) {
      panX = rect.width / 2;
      panY = rect.height / 2;
    }
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const COLORES = {
    ley: '#eab308',
    expediente: '#3b82f6',
    cliente: '#10b981',
    concepto: '#8b5cf6',
    default: '#94a3b8',
  };

  // Cargar datos desde la API
  async function cargarDatosGrafo() {
    try {
      const res = await apiFetch('/lexpy/grafo');
      if (!res.success) return;

      const data = res.data;
      const rect = canvas.parentElement.getBoundingClientRect();

      // Inicializar posiciones espaciales aleatorias alrededor del centro
      nodos = (data.nodos || []).map((n, i) => {
        const angulo = (i / data.nodos.length) * Math.PI * 2;
        const radio = 100 + Math.random() * 220;
        return {
          ...n,
          x: Math.cos(angulo) * radio,
          y: Math.sin(angulo) * radio,
          vx: 0,
          vy: 0,
          radio: n.tipo === 'expediente' ? 14 : n.tipo === 'ley' ? 12 : 10,
        };
      });

      // Mapear enlaces
      const nodosMap = new Map(nodos.map((n) => [n.id, n]));
      enlaces = (data.enlaces || [])
        .map((e) => ({
          ...e,
          sourceNode: nodosMap.get(e.source),
          targetNode: nodosMap.get(e.target),
        }))
        .filter((e) => e.sourceNode && e.targetNode);

      // Actualizar estadísticas
      if (statNodos) statNodos.textContent = nodos.length;
      if (statEnlaces) statEnlaces.textContent = enlaces.length;
      if (statLeyes) statLeyes.textContent = nodos.filter((n) => n.tipo === 'ley').length;
      if (statMemorias) statMemorias.textContent = nodos.filter((n) => n.tipo === 'concepto').length;

      aplicarFiltros();
      requestAnimationFrame(animarGrafo);
    } catch (err) {
      console.error('[Grafo] Error cargando datos:', err);
    }
  }

  function aplicarFiltros() {
    nodosVisibles = nodos.filter((n) => {
      const matchTipo = filtroActivo === 'todos' || n.tipo === filtroActivo;
      const matchTexto =
        !terminoBusqueda ||
        n.etiqueta.toLowerCase().includes(terminoBusqueda) ||
        (n.detalle && n.detalle.toLowerCase().includes(terminoBusqueda));
      return matchTipo && matchTexto;
    });

    const setVisibles = new Set(nodosVisibles.map((n) => n.id));
    enlacesVisibles = enlaces.filter(
      (e) => setVisibles.has(e.sourceNode.id) && setVisibles.has(e.targetNode.id)
    );
  }

  // Simulación física estilo Obsidian (Force-Directed Layout)
  function pasoFisica() {
    const kRepulsion = 1200;
    const kAtraccion = 0.04;
    const amortiguacion = 0.88;
    const gravedadCentro = 0.005;

    // Fuerza de repulsión entre todos los nodos visibles
    for (let i = 0; i < nodosVisibles.length; i++) {
      const n1 = nodosVisibles[i];
      for (let j = i + 1; j < nodosVisibles.length; j++) {
        const n2 = nodosVisibles[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distSq = dx * dx + dy * dy + 1;
        const dist = Math.sqrt(distSq);

        if (dist < 400) {
          const f = kRepulsion / distSq;
          const fx = (dx / dist) * f;
          const fy = (dy / dist) * f;
          n1.vx -= fx;
          n1.vy -= fy;
          n2.vx += fx;
          n2.vy += fy;
        }
      }

      // Gravedad hacia el centro (0, 0)
      n1.vx -= n1.x * gravedadCentro;
      n1.vy -= n1.y * gravedadCentro;
    }

    // Fuerza elástica sobre los enlaces
    for (const e of enlacesVisibles) {
      const dx = e.targetNode.x - e.sourceNode.x;
      const dy = e.targetNode.y - e.sourceNode.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (dist - 80) * kAtraccion;
      const fx = (dx / dist) * f;
      const fy = (dy / dist) * f;

      e.sourceNode.vx += fx;
      e.sourceNode.vy += fy;
      e.targetNode.vx -= fx;
      e.targetNode.vy -= fy;
    }

    // Aplicar velocidades
    for (const n of nodosVisibles) {
      if (n === nodoArrastrado) continue;
      n.vx *= amortiguacion;
      n.vy *= amortiguacion;
      n.x += n.vx;
      n.y += n.vy;
    }
  }

  // Renderizado en Canvas
  function dibujar() {
    const rect = canvas.parentElement.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    const esDark = document.documentElement.classList.contains('dark');
    const colorLineas = esDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.12)';
    const colorLineasResaltadas = esDark ? 'rgba(37, 99, 235, 0.8)' : 'rgba(37, 99, 235, 0.7)';

    // Dibujar enlaces
    for (const e of enlacesVisibles) {
      const estaConectado =
        nodoSeleccionado &&
        (e.sourceNode.id === nodoSeleccionado.id || e.targetNode.id === nodoSeleccionado.id);

      ctx.beginPath();
      ctx.moveTo(e.sourceNode.x, e.sourceNode.y);
      ctx.lineTo(e.targetNode.x, e.targetNode.y);
      ctx.strokeStyle = estaConectado ? colorLineasResaltadas : colorLineas;
      ctx.lineWidth = estaConectado ? 2.5 : 1;
      ctx.stroke();
    }

    // Dibujar nodos
    for (const n of nodosVisibles) {
      const esSeleccionado = nodoSeleccionado && nodoSeleccionado.id === n.id;
      const esHover = nodoHover && nodoHover.id === n.id;
      const color = COLORES[n.tipo] || COLORES.default;

      // Halo de brillo para seleccionado o hover
      if (esSeleccionado || esHover) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radio + 7, 0, Math.PI * 2);
        ctx.fillStyle = esSeleccionado ? `${color}44` : `${color}22`;
        ctx.fill();
      }

      // Cuerpo del nodo
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.radio, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = esSeleccionado ? 2.5 : 1.5;
      ctx.strokeStyle = esDark ? '#0f172a' : '#ffffff';
      ctx.stroke();

      // Etiqueta del nodo
      ctx.font = `${esSeleccionado ? '600' : '500'} ${esSeleccionado ? '12px' : '10px'} Inter, sans-serif`;
      ctx.fillStyle = esDark ? '#f1f5f9' : '#1e293b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const texto = n.etiqueta.length > 22 ? n.etiqueta.slice(0, 20) + '...' : n.etiqueta;
      ctx.fillText(texto, n.x, n.y + n.radio + 4);
    }

    ctx.restore();
  }

  function animarGrafo() {
    pasoFisica();
    dibujar();
    requestAnimationFrame(animarGrafo);
  }

  // Detección de colisión punto-nodo
  function obtenerNodoEnPunto(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const mx = (clientX - rect.left - panX) / zoom;
    const my = (clientY - rect.top - panY) / zoom;

    for (let i = nodosVisibles.length - 1; i >= 0; i--) {
      const n = nodosVisibles[i];
      const dx = mx - n.x;
      const dy = my - n.y;
      if (dx * dx + dy * dy <= (n.radio + 5) * (n.radio + 5)) {
        return n;
      }
    }
    return null;
  }

  // Interacción de mouse y gestos
  canvas.addEventListener('mousedown', (e) => {
    const nodo = obtenerNodoEnPunto(e.clientX, e.clientY);
    if (nodo) {
      nodoArrastrado = nodo;
      seleccionarNodo(nodo);
    } else {
      isDragging = true;
      dragStartX = e.clientX - panX;
      dragStartY = e.clientY - panY;
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (nodoArrastrado) {
      const rect = canvas.getBoundingClientRect();
      nodoArrastrado.x = (e.clientX - rect.left - panX) / zoom;
      nodoArrastrado.y = (e.clientY - rect.top - panY) / zoom;
      nodoArrastrado.vx = 0;
      nodoArrastrado.vy = 0;
    } else if (isDragging) {
      panX = e.clientX - dragStartX;
      panY = e.clientY - dragStartY;
    } else {
      nodoHover = obtenerNodoEnPunto(e.clientX, e.clientY);
      canvas.style.cursor = nodoHover ? 'pointer' : 'grab';
    }
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
    nodoArrastrado = null;
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    const nuevoZoom = Math.min(Math.max(zoom * zoomFactor, 0.3), 3.5);

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    panX = mx - (mx - panX) * (nuevoZoom / zoom);
    panY = my - (my - panY) * (nuevoZoom / zoom);
    zoom = nuevoZoom;
  });

  // Selección e Inspector de Nodo
  function seleccionarNodo(nodo) {
    nodoSeleccionado = nodo;
    drawerBadge.textContent = nodo.tipo.toUpperCase();
    drawerBadge.className = `badge badge-${nodo.tipo === 'ley' ? 'warning' : nodo.tipo === 'expediente' ? 'info' : 'success'}`;
    drawerTitulo.textContent = nodo.etiqueta;
    drawerDetalle.textContent = nodo.detalle || 'Nodo de conocimiento sin descripción adicional.';

    // Conexiones vecinas
    const vecinos = enlaces
      .filter((e) => e.sourceNode.id === nodo.id || e.targetNode.id === nodo.id)
      .map((e) => (e.sourceNode.id === nodo.id ? { nodo: e.targetNode, rel: e.relacion } : { nodo: e.sourceNode, rel: e.relacion }));

    drawerConexiones.innerHTML = vecinos.length
      ? vecinos
          .map(
            (v) => `
          <div style="padding: 0.5rem; background: var(--bg-hover); border-radius: var(--radius-md); font-size: 0.8rem; cursor: pointer; border: 1px solid var(--border-color);" onclick="window.centrarEnNodo('${v.nodo.id}')">
            <span style="font-weight: 600; color: var(--text-primary);">${v.nodo.etiqueta}</span>
            <div style="font-size: 0.7rem; color: var(--text-muted);">${v.rel.replace(/_/g, ' ')} (${v.nodo.tipo})</div>
          </div>
        `
          )
          .join('')
      : '<p style="font-size: 0.8rem; color: var(--text-muted);">Sin enlaces directos adicionales.</p>';

    btnAccionNodo.onclick = () => {
      window.location.href = `/lexpy.html?q=${encodeURIComponent('Explicame el alcance legal de ' + nodo.etiqueta)}`;
    };

    drawer.classList.add('active');
  }

  window.centrarEnNodo = function (id) {
    const nodo = nodos.find((n) => n.id === id);
    if (!nodo) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    panX = rect.width / 2 - nodo.x * zoom;
    panY = rect.height / 2 - nodo.y * zoom;
    seleccionarNodo(nodo);
  };

  if (btnCloseDrawer) {
    btnCloseDrawer.addEventListener('click', () => {
      drawer.classList.remove('active');
      nodoSeleccionado = null;
    });
  }

  // Controles de Zoom
  document.getElementById('btnZoomIn')?.addEventListener('click', () => {
    zoom = Math.min(zoom * 1.25, 3.5);
  });
  document.getElementById('btnZoomOut')?.addEventListener('click', () => {
    zoom = Math.max(zoom * 0.8, 0.3);
  });
  document.getElementById('btnResetView')?.addEventListener('click', () => {
    const rect = canvas.parentElement.getBoundingClientRect();
    zoom = 1;
    panX = rect.width / 2;
    panY = rect.height / 2;
    nodoSeleccionado = null;
    drawer.classList.remove('active');
  });

  // Filtros de categoría
  document.querySelectorAll('.btn-chip[data-filtro]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-chip[data-filtro]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      filtroActivo = btn.dataset.filtro;
      aplicarFiltros();
    });
  });

  // Buscador interactivo
  if (busquedaInput) {
    busquedaInput.addEventListener('input', (e) => {
      terminoBusqueda = e.target.value.toLowerCase().trim();
      aplicarFiltros();
    });
  }

  // Modal Obsidian
  if (btnGuiaObsidian) {
    btnGuiaObsidian.addEventListener('click', () => {
      modalObsidian.style.display = 'flex';
    });
  }
  if (btnCerrarModalObsidian) {
    btnCerrarModalObsidian.addEventListener('click', () => {
      modalObsidian.style.display = 'none';
    });
  }
  if (btnEntendidoObsidian) {
    btnEntendidoObsidian.addEventListener('click', () => {
      modalObsidian.style.display = 'none';
    });
  }
  if (btnCopiarEndpoint) {
    btnCopiarEndpoint.addEventListener('click', () => {
      navigator.clipboard.writeText(endpointUrlInput.value);
      btnCopiarEndpoint.textContent = '¡Copiado!';
      setTimeout(() => {
        btnCopiarEndpoint.textContent = 'Copiar URL';
      }, 2000);
    });
  }

  cargarDatosGrafo();
});
