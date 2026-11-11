document.addEventListener('DOMContentLoaded', () => {
  renderBarraLateral('grafo');

  const canvas = document.getElementById('grafoCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Elementos de UI
  const statNodos = document.getElementById('statNodos');
  const statEnlaces = document.getElementById('statEnlaces');
  const statLeyes = document.getElementById('statLeyes');
  const statMemorias = document.getElementById('statMemorias');
  const statJurisprudencia = document.getElementById('statJurisprudencia');
  const busquedaInput = document.getElementById('busquedaGrafo');
  const drawer = document.getElementById('grafoDrawer');
  const drawerBadge = document.getElementById('drawerBadge');
  const drawerCantArticulos = document.getElementById('drawerCantArticulos');
  const drawerTitulo = document.getElementById('drawerTitulo');
  const drawerMeta = document.getElementById('drawerMeta');
  const drawerConexiones = document.getElementById('drawerConexiones');
  const btnCloseDrawer = document.getElementById('btnCloseDrawer');
  const btnAccionNodo = document.getElementById('btnAccionNodo');
  const filtroArticulosDrawer = document.getElementById('filtroArticulosDrawer');
  const listaArticulosDrawer = document.getElementById('listaArticulosDrawer');
  const btnModoLecturaModal = document.getElementById('btnModoLecturaModal');
  const btnCopiarTodoDrawer = document.getElementById('btnCopiarTodoDrawer');

  // Modal Articulado Completo
  const modalArticuladoCompleto = document.getElementById('modalArticuladoCompleto');
  const modalArticuladoTitulo = document.getElementById('modalArticuladoTitulo');
  const modalArticuladoBadge = document.getElementById('modalArticuladoBadge');
  const modalArticuladoContador = document.getElementById('modalArticuladoContador');
  const busquedaArticuloModal = document.getElementById('busquedaArticuloModal');
  const contenedorArticulosModal = document.getElementById('contenedorArticulosModal');
  const btnCerrarModalArticulado = document.getElementById('btnCerrarModalArticulado');
  const btnCopiarTodoModal = document.getElementById('btnCopiarTodoModal');
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
  let simulacionActiva = false; // Control de reposo estático

  // Transformación de la vista (Pan & Zoom)
  let zoom = 0.85;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  // Ajuste de resolución Canvas
  function resizeCanvas() {
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = rect.width || window.innerWidth - 300;
    const h = rect.height || 600;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.resetTransform?.();
    ctx.scale(dpr, dpr);

    if (panX === 0 && panY === 0) {
      panX = w / 2;
      panY = h / 2;
    }
    dibujarGrafo();
  }

  window.addEventListener('resize', resizeCanvas);
  setTimeout(resizeCanvas, 50);

  const COLORES = {
    hub: '#f59e0b',
    constitucion: '#eab308',
    codigo: '#3b82f6',
    ley: '#0ea5e9',
    jurisprudencia: '#06b6d4',
    decreto: '#06b6d4',
    acordada: '#14b8a6',
    institucion: '#6366f1',
    ensenanza: '#10b981',
    expediente: '#f97316',
    cliente: '#a855f7',
    memoria: '#ec4899',
    concepto: '#ec4899',
    default: '#94a3b8',
  };

  // Coordenadas fijas orbitales de los 7 Hubs principales por Fuero
  const COORDENADAS_HUBS = {
    'hub_constitucional': { x: 0, y: -340 },
    'hub_penal': { x: 380, y: -190 },
    'hub_civil': { x: 420, y: 160 },
    'hub_laboral': { x: 230, y: 400 },
    'hub_ninez': { x: -230, y: 400 },
    'hub_administrativo': { x: -420, y: 160 },
    'hub_tributario': { x: -380, y: -190 },
    'hub_instituciones': { x: 0, y: 320 },
  };

  function determinarHubPertenencia(nodo) {
    if (nodo.tipo === 'hub') return nodo.id;
    if (nodo.id === 'ley_constitucion_1992' || nodo.tipo === 'constitucion') return 'centro';
    if (nodo.tipo === 'institucion') return 'hub_instituciones';

    const fuero = (nodo.fuero || '').toLowerCase();
    if (fuero.includes('penal')) return 'hub_penal';
    if (fuero.includes('laboral')) return 'hub_laboral';
    if (fuero.includes('niñez') || fuero.includes('menor')) return 'hub_ninez';
    if (fuero.includes('tribut')) return 'hub_tributario';
    if (fuero.includes('administrativ') || fuero.includes('constitucional')) return 'hub_administrativo';
    return 'hub_civil';
  }

  // Cargar datos desde la API
  async function cargarDatosGrafo() {
    try {
      let res = null;
      try {
        res = await apiFetch('/obsidian/grafo');
      } catch {
        res = await apiFetch('/v1/grafo');
      }

      let data = res?.data || res;
      if (!data || !data.nodos || !data.nodos.length) {
        data = generarNodosSemilla();
      }

      // Agrupar nodos por su Hub de pertenencia para inicializarlos en cúmulos espaciales
      const conteoPorHub = {};

      nodos = (data.nodos || []).map((n) => {
        const hubId = determinarHubPertenencia(n);
        conteoPorHub[hubId] = (conteoPorHub[hubId] || 0) + 1;
        const indiceEnCluster = conteoPorHub[hubId];

        let posX = 0;
        let posY = 0;

        if (n.tipo === 'hub') {
          const coord = COORDENADAS_HUBS[n.id] || { x: 0, y: 0 };
          posX = coord.x;
          posY = coord.y;
        } else if (hubId === 'centro') {
          posX = 0;
          posY = 0;
        } else {
          const centroHub = COORDENADAS_HUBS[hubId] || { x: 0, y: 0 };
          // Disposición orbital suave alrededor de su Hub temático
          const angulo = (indiceEnCluster * 137.5 * Math.PI) / 180;
          const radioOrbita = 75 + Math.sqrt(indiceEnCluster) * 36;
          posX = centroHub.x + Math.cos(angulo) * radioOrbita;
          posY = centroHub.y + Math.sin(angulo) * radioOrbita;
        }

        return {
          ...n,
          x: posX,
          y: posY,
          vx: 0,
          vy: 0,
          radio:
            n.tipo === 'hub'
              ? 22
              : n.tipo === 'constitucion'
              ? 18
              : n.tipo === 'codigo' || n.tipo === 'institucion'
              ? 15
              : n.tipo === 'jurisprudencia' && n.totalFallos
              ? 16
              : n.tipo === 'expediente'
              ? 13
              : n.tipo === 'ensenanza' || n.tipo === 'ley' || n.tipo === 'jurisprudencia'
              ? 11
              : 9,
        };
      });

      // Mapear enlaces
      const nodosMap = new Map(nodos.map((n) => [n.id, n]));
      enlaces = (data.enlaces || [])
        .map((e) => ({
          ...e,
          sourceNode: nodosMap.get(typeof e.source === 'object' ? e.source.id : e.source),
          targetNode: nodosMap.get(typeof e.target === 'object' ? e.target.id : e.target),
        }))
        .filter((e) => e.sourceNode && e.targetNode);

      // Actualizar estadísticas Bento
      if (statNodos) statNodos.textContent = (data.estadisticas?.totalNodos || nodos.length).toLocaleString('es-PY');
      if (statEnlaces) statEnlaces.textContent = (data.estadisticas?.totalEnlaces || enlaces.length).toLocaleString('es-PY');
      if (statLeyes) statLeyes.textContent = (data.estadisticas?.leyes || nodos.filter((n) => ['ley', 'codigo', 'constitucion', 'decreto', 'acordada'].includes(n.tipo)).length).toLocaleString('es-PY');
      if (statJurisprudencia) statJurisprudencia.textContent = (data.estadisticas?.jurisprudencia || 72375).toLocaleString('es-PY');
      if (statMemorias) statMemorias.textContent = (data.estadisticas?.ensenanzas || nodos.filter((n) => n.tipo === 'ensenanza').length).toLocaleString('es-PY');

      aplicarFiltros();

      // =========================================================================
      // ESTABILIZACIÓN OFFSCREEN PREVIA (Burn-in)
      // Ejecuta 90 iteraciones de relajación física en memoria. Al abrirse,
      // el grafo queda 100% ESTÁTICO, sin oscilaciones ni vibraciones ("sin bailar").
      // =========================================================================
      for (let step = 0; step < 90; step++) {
        const factorEnfriamiento = Math.max(0.12, 1 - step / 90);
        pasoFisica(factorEnfriamiento);
      }

      // Anular cualquier residuo de velocidad y congelar en reposo
      nodos.forEach((n) => {
        n.vx = 0;
        n.vy = 0;
      });

      simulacionActiva = false;
      dibujarGrafo();
    } catch (err) {
      console.error('[Grafo] Error cargando red de conocimiento:', err);
    }
  }

  function generarNodosSemilla() {
    return {
      nodos: [
        { id: 'ley_cyp', tipo: 'constitucion', etiqueta: 'Constitución Nacional 1992', detalle: 'Ley Suprema de la República del Paraguay.', peso: 8 },
        { id: 'ley_cc', tipo: 'codigo', etiqueta: 'Código Civil (Ley 1183/85)', detalle: 'Regula las obligaciones, contratos y derechos reales.', peso: 7 },
        { id: 'ley_cl', tipo: 'codigo', etiqueta: 'Código del Trabajo (Ley 213/93)', detalle: 'Normativa laboral de orden público en Paraguay.', peso: 7 },
        { id: 'juris_penal', tipo: 'jurisprudencia', etiqueta: '⚖️ Jurisprudencia Penal CSJ (17.153 fallos)', detalle: 'Catálogo oficial de la Sala Penal CSJ.', totalFallos: 17153, peso: 10 },
        { id: 'ley_1462', tipo: 'ley', etiqueta: 'Ley 1462/1935', detalle: 'Procedimiento para lo Contencioso Administrativo.', peso: 6 },
        { id: 'ley_6715', tipo: 'ley', etiqueta: 'Ley 6715/2021', detalle: 'Procedimientos Administrativos y Acto Administrativo.', peso: 6 },
        { id: 'ens_1', tipo: 'ensenanza', etiqueta: 'Caducidad de Instancia Art. 172', detalle: 'Plazos de perención en primera y segunda instancia.', peso: 5 },
        { id: 'ens_2', tipo: 'ensenanza', etiqueta: 'Preaviso e Indemnización Laboral', detalle: 'Cálculo según antigüedad y salario mínimo legal.', peso: 5 },
      ],
      enlaces: [
        { source: 'ens_1', target: 'ley_cc', relacion: 'interpreta_norma' },
        { source: 'ens_2', target: 'ley_cl', relacion: 'interpreta_norma' },
        { source: 'ley_1462', target: 'ley_cyp', relacion: 'control_constitucional' },
        { source: 'ley_6715', target: 'ley_1462', relacion: 'via_previa' },
      ],
      estadisticas: { totalNodos: 8, totalEnlaces: 4, leyes: 5, jurisprudencia: 72375, ensenanzas: 2 },
    };
  }

  function aplicarFiltros() {
    nodosVisibles = nodos.filter((n) => {
      let matchTipo = true;
      if (filtroActivo === 'ley') {
        matchTipo = ['ley', 'codigo', 'constitucion', 'decreto', 'acordada'].includes(n.tipo);
      } else if (filtroActivo === 'jurisprudencia') {
        matchTipo = n.tipo === 'jurisprudencia';
      } else if (filtroActivo === 'institucion') {
        matchTipo = n.tipo === 'institucion';
      } else if (filtroActivo === 'hub') {
        matchTipo = n.tipo === 'hub';
      } else if (filtroActivo !== 'todos') {
        matchTipo = n.tipo === filtroActivo;
      }

      const matchTexto =
        !terminoBusqueda ||
        (n.etiqueta && n.etiqueta.toLowerCase().includes(terminoBusqueda)) ||
        (n.detalle && n.detalle.toLowerCase().includes(terminoBusqueda)) ||
        (n.fuero && n.fuero.toLowerCase().includes(terminoBusqueda));
      return matchTipo && matchTexto;
    });

    const setVisibles = new Set(nodosVisibles.map((n) => n.id));
    enlacesVisibles = enlaces.filter(
      (e) => setVisibles.has(e.sourceNode.id) && setVisibles.has(e.targetNode.id)
    );
  }

  // Simulación física con amortiguación y detección de colisiones suaves
  function pasoFisica(factorEnfriamiento = 1.0) {
    const kRepulsion = 1400 * factorEnfriamiento;
    const kAtraccion = 0.028 * factorEnfriamiento;
    const amortiguacion = 0.82;
    const gravedadCentro = 0.003 * factorEnfriamiento;

    let energiaCinetica = 0;

    for (let i = 0; i < nodosVisibles.length; i++) {
      const n1 = nodosVisibles[i];

      // Los Hubs y la Constitución tienen mayor inercia y anclaje
      const esAnclado = n1.tipo === 'hub' || n1.id === 'ley_constitucion_1992';

      for (let j = i + 1; j < nodosVisibles.length; j++) {
        const n2 = nodosVisibles[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const distSq = dx * dx + dy * dy + 1;
        const dist = Math.sqrt(distSq);

        // Separación mínima obligatoria para que nunca colisionen en una masa apelotonada
        const minSeparacion = n1.radio + n2.radio + 16;

        if (dist < minSeparacion) {
          const overlap = minSeparacion - dist;
          const push = overlap * 0.45;
          const pushX = (dx / (dist || 1)) * push;
          const pushY = (dy / (dist || 1)) * push;
          if (!esAnclado && n1 !== nodoArrastrado) {
            n1.vx -= pushX;
            n1.vy -= pushY;
          }
          if (n2.tipo !== 'hub' && n2 !== nodoArrastrado) {
            n2.vx += pushX;
            n2.vy += pushY;
          }
        } else if (dist < 320) {
          const f = kRepulsion / distSq;
          const fx = (dx / dist) * f;
          const fy = (dy / dist) * f;
          if (!esAnclado && n1 !== nodoArrastrado) {
            n1.vx -= fx;
            n1.vy -= fy;
          }
          if (n2.tipo !== 'hub' && n2 !== nodoArrastrado) {
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      // Suave atracción hacia su centro de gravedad
      if (!esAnclado && n1 !== nodoArrastrado) {
        n1.vx -= n1.x * gravedadCentro;
        n1.vy -= n1.y * gravedadCentro;
      }
    }

    // Fuerza de resorte en las aristas
    for (let i = 0; i < enlacesVisibles.length; i++) {
      const e = enlacesVisibles[i];
      const dx = e.targetNode.x - e.sourceNode.x;
      const dy = e.targetNode.y - e.sourceNode.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const longitudDeseada = 130;
      const f = (dist - longitudDeseada) * kAtraccion;
      const fx = (dx / (dist || 1)) * f;
      const fy = (dy / (dist || 1)) * f;

      if (e.sourceNode !== nodoArrastrado && e.sourceNode.tipo !== 'hub') {
        e.sourceNode.vx += fx;
        e.sourceNode.vy += fy;
      }
      if (e.targetNode !== nodoArrastrado && e.targetNode.tipo !== 'hub') {
        e.targetNode.vx -= fx;
        e.targetNode.vy -= fy;
      }
    }

    // Actualizar posiciones y calcular energía
    for (let i = 0; i < nodosVisibles.length; i++) {
      const n = nodosVisibles[i];
      if (n === nodoArrastrado) continue;

      n.vx *= amortiguacion;
      n.vy *= amortiguacion;

      // Velocidad máxima para evitar saltos o vibraciones
      const velocidad = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      if (velocidad > 8) {
        n.vx = (n.vx / velocidad) * 8;
        n.vy = (n.vy / velocidad) * 8;
      }

      n.x += n.vx;
      n.y += n.vy;

      energiaCinetica += Math.abs(n.vx) + Math.abs(n.vy);
    }

    return energiaCinetica;
  }

  // Función de renderizado limpio (un único frame sin forzar loops innecesarios)
  function dibujarGrafo() {
    const parent = canvas.parentElement;
    const w = parent?.clientWidth || canvas.width;
    const h = parent?.clientHeight || canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Dibujar Enlaces
    ctx.lineWidth = 1;
    for (let i = 0; i < enlacesVisibles.length; i++) {
      const e = enlacesVisibles[i];
      const esConectadoHover =
        nodoHover && (e.sourceNode === nodoHover || e.targetNode === nodoHover);
      const esConectadoSel =
        nodoSeleccionado && (e.sourceNode === nodoSeleccionado || e.targetNode === nodoSeleccionado);

      ctx.beginPath();
      ctx.moveTo(e.sourceNode.x, e.sourceNode.y);
      ctx.lineTo(e.targetNode.x, e.targetNode.y);

      if (esConectadoSel) {
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 2.5;
      } else if (esConectadoHover) {
        ctx.strokeStyle = '#93c5fd';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
        ctx.lineWidth = 1;
      }
      ctx.stroke();
    }

    // Dibujar Nodos
    for (let i = 0; i < nodosVisibles.length; i++) {
      const n = nodosVisibles[i];
      const color = COLORES[n.tipo] || COLORES.default;
      const esHover = n === nodoHover;
      const esSel = n === nodoSeleccionado;

      // Halo sutil
      ctx.shadowBlur = esSel ? 18 : esHover ? 12 : 5;
      ctx.shadowColor = color;

      ctx.beginPath();
      ctx.arc(n.x, n.y, esHover || esSel ? n.radio + 3 : n.radio, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Borde exterior
      ctx.shadowBlur = 0;
      ctx.lineWidth = esSel ? 3 : esHover ? 2 : 1;
      ctx.strokeStyle = '#fff';
      ctx.stroke();

      // Etiquetas legibles adaptativas
      const esDark = document.documentElement.classList.contains('dark') || document.documentElement.getAttribute('data-theme') === 'dark';
      const esDestacado = ['hub', 'jurisprudencia', 'institucion', 'constitucion', 'codigo', 'expediente'].includes(n.tipo);

      if (zoom > 0.45 || esHover || esSel || esDestacado) {
        if (n.tipo === 'hub') {
          ctx.font = 'bold 12px Inter, sans-serif';
          ctx.fillStyle = esDark ? '#fbbf24' : '#b45309';
        } else if (n.tipo === 'jurisprudencia' && n.totalFallos) {
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.fillStyle = esDark ? '#38bdf8' : '#0284c7';
        } else if (esSel) {
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.fillStyle = esDark ? '#ffffff' : '#1e3a8a';
        } else if (esHover) {
          ctx.font = 'bold 11px Inter, sans-serif';
          ctx.fillStyle = esDark ? '#93c5fd' : '#2563eb';
        } else {
          ctx.font = '10px Inter, sans-serif';
          ctx.fillStyle = esDark ? '#cbd5e1' : '#0f172a';
        }
        ctx.textAlign = 'center';
        const maxLen = n.tipo === 'hub' ? 32 : 24;
        const label = n.etiqueta.length > maxLen ? n.etiqueta.slice(0, maxLen - 2) + '…' : n.etiqueta;
        ctx.fillText(label, n.x, n.y + n.radio + 13);
      }
    }

    ctx.restore();
  }

  // Bucle de animación reactivo: solo corre cuando el usuario arrastra o interactúa
  function animarGrafo() {
    if (!simulacionActiva) return;
    const energia = pasoFisica(1.0);
    dibujarGrafo();

    // Si la energía cae por debajo del umbral y no hay nodo arrastrado, detener y congelar en reposo
    if (!nodoArrastrado && energia < 0.05) {
      simulacionActiva = false;
      nodos.forEach((n) => {
        n.vx = 0;
        n.vy = 0;
      });
      dibujarGrafo();
      return;
    }

    requestAnimationFrame(animarGrafo);
  }

  function despertarFisica() {
    if (!simulacionActiva) {
      simulacionActiva = true;
      requestAnimationFrame(animarGrafo);
    }
  }

  // Interacción Mouse
  function screenToWorld(sx, sy) {
    const rect = canvas.getBoundingClientRect();
    const cx = sx - rect.left;
    const cy = sy - rect.top;
    return {
      x: (cx - panX) / zoom,
      y: (cy - panY) / zoom,
    };
  }

  function encontrarNodoBajoPuntero(wx, wy) {
    for (let i = nodosVisibles.length - 1; i >= 0; i--) {
      const n = nodosVisibles[i];
      const dx = wx - n.x;
      const dy = wy - n.y;
      if (dx * dx + dy * dy <= (n.radio + 6) * (n.radio + 6)) {
        return n;
      }
    }
    return null;
  }

  canvas.addEventListener('mousedown', (e) => {
    const w = screenToWorld(e.clientX, e.clientY);
    const n = encontrarNodoBajoPuntero(w.x, w.y);

    if (n) {
      nodoArrastrado = n;
      nodoSeleccionado = n;
      despertarFisica();
      abrirInspectorNodo(n);
    } else {
      isDragging = true;
      dragStartX = e.clientX - panX;
      dragStartY = e.clientY - panY;
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (nodoArrastrado) {
      const w = screenToWorld(e.clientX, e.clientY);
      nodoArrastrado.x = w.x;
      nodoArrastrado.y = w.y;
      nodoArrastrado.vx = 0;
      nodoArrastrado.vy = 0;
      despertarFisica();
      return;
    }

    if (isDragging) {
      panX = e.clientX - dragStartX;
      panY = e.clientY - dragStartY;
      dibujarGrafo();
      return;
    }

    const w = screenToWorld(e.clientX, e.clientY);
    const n = encontrarNodoBajoPuntero(w.x, w.y);
    if (nodoHover !== n) {
      nodoHover = n;
      canvas.style.cursor = n ? 'pointer' : 'grab';
      dibujarGrafo();
    }
  });

  window.addEventListener('mouseup', () => {
    if (nodoArrastrado) {
      nodoArrastrado = null;
      despertarFisica();
    }
    isDragging = false;
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.88;
    const nuevoZoom = Math.min(Math.max(zoom * factor, 0.25), 3.5);

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    panX = mouseX - (mouseX - panX) * (nuevoZoom / zoom);
    panY = mouseY - (mouseY - panY) * (nuevoZoom / zoom);
    zoom = nuevoZoom;
    dibujarGrafo();
  });

  // Controles de Botones de Zoom
  document.getElementById('btnZoomIn')?.addEventListener('click', () => {
    zoom = Math.min(zoom * 1.25, 3.5);
    dibujarGrafo();
  });
  document.getElementById('btnZoomOut')?.addEventListener('click', () => {
    zoom = Math.max(zoom * 0.8, 0.25);
    dibujarGrafo();
  });
  document.getElementById('btnResetView')?.addEventListener('click', () => {
    const parent = canvas.parentElement;
    panX = (parent?.clientWidth || 800) / 2;
    panY = (parent?.clientHeight || 600) / 2;
    zoom = 0.85;
    dibujarGrafo();
  });

  // Filtros de Botones Chips
  document.querySelectorAll('.btn-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-chip').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      filtroActivo = btn.dataset.filtro;
      aplicarFiltros();
      dibujarGrafo();
    });
  });

  // Input de Búsqueda
  busquedaInput?.addEventListener('input', (e) => {
    terminoBusqueda = e.target.value.toLowerCase().trim();
    aplicarFiltros();
    dibujarGrafo();
  });

  // Estado del Inspector de Artículos
  let articulosActuales = [];
  let nodoInspectorActivo = null;

  function parsearArticulosDeTexto(texto, titulo, nodo) {
    if (!texto || typeof texto !== 'string') return [];
    const limpio = texto.trim();

    // Caso Especial: Jurisprudencia Oficial CSJ
    if (nodo && nodo.tipo === 'jurisprudencia') {
      const tarjetas = [];
      if (nodo.totalFallos) {
        tarjetas.push({
          id: 'juris_resumen',
          numero: '🏛️ Fuero & Sala Competente',
          titulo: nodo.sala || 'Corte Suprema de Justicia',
          cuerpo: `Fuero Judicial: ${nodo.fuero}\nTotal Fallos CSJ Catalogados: ${(nodo.totalFallos || 0).toLocaleString('es-PY')} resoluciones.\n\nAlcance y Doctrina:\n${nodo.detalle}`,
        });
        tarjetas.push({
          id: 'juris_consulta',
          numero: '⚖️ Consulta Jurisprudencial',
          titulo: 'Búsqueda en 72.375 Fallos CSJ',
          cuerpo: `Podés buscar resoluciones de este fuero escribiendo su carátula o número en el buscador superior, o en Techapyrã IA.\n\nPortal oficial CSJ: https://www.csj.gov.py/jurisprudencia`,
        });
      } else {
        tarjetas.push({
          id: 'juris_fallo',
          numero: '⚖️ Fallo Judicial CSJ',
          titulo: titulo || 'Resolución Judicial CSJ',
          cuerpo: `${limpio}\n\nFuero competente: ${nodo.fuero || 'General'}\nEnlace oficial: ${nodo.url || 'https://www.csj.gov.py/jurisprudencia'}`,
        });
      }
      return tarjetas;
    }

    // Caso Especial: Enseñanza / Doctrina RAG OtelaxWisdom
    if (nodo && nodo.tipo === 'ensenanza') {
      const tarjetas = [];
      if (nodo.pregunta) {
        tarjetas.push({
          id: 'ens_pregunta',
          numero: '📌 Criterio & Consulta Planteada',
          titulo: nodo.pregunta,
          cuerpo: nodo.pregunta,
        });
      }

      // Dividir la respuesta por secciones si contiene títulos o Markdown
      const parrafos = limpio.split(/\n\s*\n/).filter(Boolean);
      if (parrafos.length > 1) {
        parrafos.forEach((p, idx) => {
          const primerLinea = p.split('\n')[0].replace(/^[#\-*\s]+/, '').trim();
          tarjetas.push({
            id: `ens_seccion_${idx + 1}`,
            numero: `⚖️ Dictamen ${idx + 1}`,
            titulo: primerLinea.slice(0, 60),
            cuerpo: p,
          });
        });
      } else {
        tarjetas.push({
          id: 'ens_doctrina',
          numero: '⚖️ Fundamentación Doctrinal & Solución Procesal',
          titulo: titulo || 'Doctrina Jurídica',
          cuerpo: limpio,
        });
      }

      return tarjetas;
    }

    // Regex forense para detectar inicios de artículos, disposiciones, libros o títulos
    const regexSeparador = /(?:^|\n+)(?=(?:Artículo|Art\.|Disposición|LIBRO|TÍTULO|CAPÍTULO)\s+[0-9A-Za-zº°\/-]+)/gi;
    const bloques = limpio.split(regexSeparador).map((b) => b.trim()).filter(Boolean);

    if (bloques.length <= 1 && !limpio.match(/^(?:Artículo|Art\.|Disposición)/i)) {
      // Intentar dividir por numeración estándar (1. , 2. , etc.) o párrafos dobles
      const regexNumerados = /(?:^|\n)(?=[0-9]+\.\s+)/g;
      const partesNumeradas = limpio.split(regexNumerados).map((p) => p.trim()).filter(Boolean);
      if (partesNumeradas.length > 1) {
        return partesNumeradas.map((parte, idx) => {
          const lineas = parte.split('\n');
          const primera = lineas[0].trim();
          return {
            id: `punto_${idx + 1}`,
            numero: `Apartado ${idx + 1}`,
            titulo: primera.slice(0, 60),
            cuerpo: parte,
          };
        });
      }

      const parrafosDobles = limpio.split(/\n\s*\n/).filter(Boolean);
      if (parrafosDobles.length > 1) {
        return parrafosDobles.map((p, idx) => ({
          id: `disp_${idx + 1}`,
          numero: `Disposición ${idx + 1}`,
          titulo: p.split('\n')[0].slice(0, 60),
          cuerpo: p,
        }));
      }

      return [
        {
          id: 'art_1',
          numero: 'Contenido General',
          titulo: titulo || 'Contenido',
          cuerpo: limpio,
        },
      ];
    }

    return bloques.map((bloque, idx) => {
      const lineas = bloque.split('\n');
      const primera = lineas[0].trim();
      const matchNum = primera.match(/^((?:Artículo|Art\.|Disposición|LIBRO|TÍTULO|CAPÍTULO)\s+[0-9A-Za-zº°\/-]+)(?:\s*[-–—:]\s*(.*))?$/i);

      let numero = `Art. ${idx + 1}`;
      let tituloArt = primera;
      if (matchNum) {
        numero = matchNum[1].trim();
        tituloArt = (matchNum[2] || '').trim() || numero;
      }

      return {
        id: `art_${idx + 1}`,
        numero: numero,
        titulo: tituloArt,
        cuerpo: bloque,
      };
    });
  }

  function renderizarArticulosDrawer(filtro = '') {
    if (!listaArticulosDrawer) return;
    const term = (filtro || '').toLowerCase().trim();
    const filtrados = articulosActuales.filter((a) =>
      !term ||
      a.numero.toLowerCase().includes(term) ||
      a.titulo.toLowerCase().includes(term) ||
      a.cuerpo.toLowerCase().includes(term)
    );

    if (drawerCantArticulos) {
      drawerCantArticulos.textContent = `${filtrados.length} ${filtrados.length === 1 ? 'Artículo' : 'Artículos'}`;
    }

    if (!filtrados.length) {
      listaArticulosDrawer.innerHTML = `
        <div style="text-align:center; padding:1.5rem 0.5rem; color:#94a3b8; font-size:0.82rem;">
          No se encontraron artículos con "<strong>${escapeHtml(filtro)}</strong>".
        </div>`;
      return;
    }

    listaArticulosDrawer.innerHTML = filtrados
      .map((art) => `
        <div class="articulo-card">
          <div class="articulo-card-header">
            <span class="articulo-card-num">${escapeHtml(art.numero)}</span>
            <button class="btn-copiar-art" onclick="window.copiarTextoArticulo('${art.id}', this)" title="Copiar artículo">
              <span>📋</span> Copiar
            </button>
          </div>
          <div class="articulo-card-body">${escapeHtml(art.cuerpo)}</div>
        </div>
      `)
      .join('');
  }

  function renderizarArticulosModal(filtro = '') {
    if (!contenedorArticulosModal) return;
    const term = (filtro || '').toLowerCase().trim();
    const filtrados = articulosActuales.filter((a) =>
      !term ||
      a.numero.toLowerCase().includes(term) ||
      a.titulo.toLowerCase().includes(term) ||
      a.cuerpo.toLowerCase().includes(term)
    );

    if (modalArticuladoContador) {
      modalArticuladoContador.textContent = `${filtrados.length} de ${articulosActuales.length} artículos`;
    }

    if (!filtrados.length) {
      contenedorArticulosModal.innerHTML = `
        <div style="text-align:center; padding:3rem 1rem; color:var(--texto-muted); font-size:0.95rem;">
          No se encontraron artículos con "<strong>${escapeHtml(filtro)}</strong>".
        </div>`;
      return;
    }

    contenedorArticulosModal.innerHTML = filtrados
      .map((art) => `
        <div style="background:var(--bg-subtle); border:1px solid var(--borde); border-radius:10px; padding:14px 18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:6px;">
            <div style="font-weight:700; color:var(--azul-accent); font-size:0.95rem;">${escapeHtml(art.numero)}</div>
            <button class="boton btn-secundario btn-sm" onclick="window.copiarTextoArticulo('${art.id}', this)" style="padding:2px 8px; font-size:0.75rem; gap:4px;">
              <span>📋</span> Copiar
            </button>
          </div>
          <div style="font-size:0.88rem; line-height:1.65; color:var(--texto-principal); white-space:pre-wrap;">${escapeHtml(art.cuerpo)}</div>
        </div>
      `)
      .join('');
  }

  window.copiarTextoArticulo = function(artId, btnEl) {
    const art = articulosActuales.find((a) => a.id === artId);
    if (!art) return;
    navigator.clipboard.writeText(art.cuerpo).then(() => {
      const orig = btnEl.innerHTML;
      btnEl.innerHTML = '<span>✓</span> Copiado';
      setTimeout(() => { btnEl.innerHTML = orig; }, 1800);
    });
  };

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Inspector Lateral
  function abrirInspectorNodo(n) {
    if (!drawer) return;
    nodoInspectorActivo = n;
    drawer.classList.add('active');

    if (drawerBadge) {
      drawerBadge.textContent = n.tipo;
      drawerBadge.style.background = COLORES[n.tipo] || COLORES.default;
    }
    if (drawerTitulo) drawerTitulo.textContent = n.etiqueta;

    if (drawerMeta) {
      const esJuris = n.tipo === 'jurisprudencia';
      const tagFuero = n.fuero ? `<span class="badge" style="background:rgba(37,99,235,0.15); color:var(--azul-accent); font-size:0.75rem;">${escapeHtml(n.fuero)}</span>` : '';
      const badgeVigencia = esJuris
        ? `<span class="badge" style="background:rgba(6,182,212,0.15); color:#06b6d4; font-size:0.75rem;">Precedente CSJ</span>`
        : `<span class="badge" style="background:rgba(16,185,129,0.15); color:#10b981; font-size:0.75rem;">Legislación Vigente PY</span>`;
      const urlDestino = n.url || (esJuris ? 'https://www.csj.gov.py/jurisprudencia' : '');
      const linkOficial = urlDestino
        ? `<a href="${urlDestino}" target="_blank" rel="noopener noreferrer" style="color:var(--azul-accent); text-decoration:none; font-size:0.75rem; display:inline-flex; align-items:center; gap:4px; margin-left:auto;"><span>${esJuris ? '⚖️ CSJ Oficial' : '🏛️ BACN Oficial'}</span> ↗</a>`
        : '';

      drawerMeta.innerHTML = `
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
          ${tagFuero}
          ${badgeVigencia}
          ${linkOficial}
        </div>
      `;
    }

    // Parsear artículos completos de contenido o detalle
    const textoCompleto = n.contenido || n.detalle || '';
    articulosActuales = parsearArticulosDeTexto(textoCompleto, n.etiqueta, n);

    // Carga perezosa del articulado íntegro si el nodo contiene un resumen
    if ((n.tipo === 'ley' || n.tipo === 'codigo' || n.tipo === 'institucion') && (!n.contenido || n.contenido.length < 500)) {
      const idRef = n.numeroLey || n.id.replace(/^ley_/, '');
      apiFetch(`/obsidian/norma/${encodeURIComponent(idRef)}`).then((res) => {
        if (res?.data?.contenido) {
          n.contenido = res.data.contenido;
          articulosActuales = parsearArticulosDeTexto(n.contenido, n.etiqueta, n);
          renderizarArticulosDrawer(filtroArticulosDrawer ? filtroArticulosDrawer.value : '');
          if (modalArticuladoCompleto && modalArticuladoCompleto.classList.contains('active')) {
            renderizarArticulosModal(busquedaArticuloModal ? busquedaArticuloModal.value : '');
          }
        }
      }).catch(() => {});
    }

    // Resetear filtro del drawer y renderizar
    if (filtroArticulosDrawer) filtroArticulosDrawer.value = '';
    renderizarArticulosDrawer('');

    // Conexiones del nodo
    if (drawerConexiones) {
      const conectados = enlaces
        .filter((e) => e.sourceNode && e.targetNode && (e.sourceNode.id === n.id || e.targetNode.id === n.id))
        .map((e) => (e.sourceNode.id === n.id ? e.targetNode : e.sourceNode));

      drawerConexiones.innerHTML = conectados.length
        ? conectados
            .map(
              (c) => `
              <div style="background:var(--bg-subtle); border:1px solid var(--borde); padding:6px 10px; border-radius:6px; font-size:0.8rem; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="enfocarNodo('${c.id}')">
                <span>${escapeHtml(c.etiqueta.slice(0, 32))}</span>
                <span class="badge" style="background:${COLORES[c.tipo] || '#64748b'}; font-size:0.7rem; padding:1px 6px;">${c.tipo}</span>
              </div>
            `
            )
            .join('')
        : '<span style="color:var(--texto-muted); font-size:0.8rem;">Sin conexiones directas registradas.</span>';
    }

    if (btnAccionNodo) {
      btnAccionNodo.onclick = () => {
        window.location.href = `/lexpy.html?consulta=${encodeURIComponent('Analizar norma y artículos de: ' + n.etiqueta)}`;
      };
    }
  }

  // Filtrado de artículos en vivo dentro del drawer
  filtroArticulosDrawer?.addEventListener('input', (e) => {
    renderizarArticulosDrawer(e.target.value);
  });

  // Copiar todo el texto del drawer
  btnCopiarTodoDrawer?.addEventListener('click', () => {
    if (!nodoInspectorActivo) return;
    const txt = nodoInspectorActivo.contenido || nodoInspectorActivo.detalle || '';
    navigator.clipboard.writeText(txt).then(() => {
      alert('Texto legal completo copiado al portapapeles.');
    });
  });

  // Modal Articulado Completo
  function abrirModalArticulado() {
    if (!nodoInspectorActivo || !modalArticuladoCompleto) return;
    modalArticuladoCompleto.classList.remove('oculto');
    if (modalArticuladoTitulo) modalArticuladoTitulo.textContent = nodoInspectorActivo.etiqueta;
    if (modalArticuladoBadge) {
      modalArticuladoBadge.textContent = nodoInspectorActivo.tipo;
      modalArticuladoBadge.style.background = COLORES[nodoInspectorActivo.tipo] || COLORES.default;
    }
    if (busquedaArticuloModal) busquedaArticuloModal.value = '';
    renderizarArticulosModal('');
  }

  btnModoLecturaModal?.addEventListener('click', abrirModalArticulado);
  btnCerrarModalArticulado?.addEventListener('click', () => {
    modalArticuladoCompleto?.classList.add('oculto');
  });

  busquedaArticuloModal?.addEventListener('input', (e) => {
    renderizarArticulosModal(e.target.value);
  });

  btnCopiarTodoModal?.addEventListener('click', () => {
    if (!nodoInspectorActivo) return;
    const txt = nodoInspectorActivo.contenido || nodoInspectorActivo.detalle || '';
    navigator.clipboard.writeText(txt).then(() => {
      alert('Texto legal completo copiado al portapapeles.');
    });
  });

  window.enfocarNodo = function (nodoId) {
    const n = nodos.find((x) => x.id === nodoId);
    if (!n) return;
    nodoSeleccionado = n;
    panX = canvas.parentElement.clientWidth / 2 - n.x * zoom;
    panY = canvas.parentElement.clientHeight / 2 - n.y * zoom;
    abrirInspectorNodo(n);
  };

  btnCloseDrawer?.addEventListener('click', () => {
    drawer?.classList.remove('active');
  });

  // Modal Obsidian Guía
  btnGuiaObsidian?.addEventListener('click', () => {
    modalObsidian?.classList.remove('oculto');
  });
  btnCerrarModalObsidian?.addEventListener('click', () => {
    modalObsidian?.classList.add('oculto');
  });
  btnEntendidoObsidian?.addEventListener('click', () => {
    modalObsidian?.classList.add('oculto');
  });
  btnCopiarEndpoint?.addEventListener('click', () => {
    if (endpointUrlInput) {
      navigator.clipboard.writeText(endpointUrlInput.value);
      alert('URL del endpoint de SysJuridico copiada al portapapeles.');
    }
  });

  // Iniciar carga
  cargarDatosGrafo();
});
