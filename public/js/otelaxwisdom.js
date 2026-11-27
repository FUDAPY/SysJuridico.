// Gestor del Acervo de Conocimiento OtelaxWisdom (Documentos .md)
const { token, usuario } = requerirSesion();
renderBarraLateral('otelaxwisdom');
inicializarSidebarColapsable();

const TIPOS_VALIDOS = [
  'CONSTITUCION NACIONAL',
  'CODIGO',
  'LEY',
  'ACORDADA',
  'JURISPRUDENCIA',
  'DOCTRINA',
  'TRATADO INTERNACIONAL',
  'RESOLUCION',
  'PROTOCOLO',
  'OTRO',
];

const COLORES_TIPO = {
  'CONSTITUCION NACIONAL': '#B45309', // ámbar oscuro
  'TRATADO INTERNACIONAL': '#0369A1', // celeste institucional
  'CODIGO': '#1E40AF',                // azul primario
  'LEY': '#047857',                   // verde esmeralda
  'JURISPRUDENCIA': '#6D28D9',        // violeta
  'ACORDADA': '#4338CA',              // índigo
  'DOCTRINA': '#475569',              // pizarra
  'RESOLUCION': '#0D9488',            // teal
  'PROTOCOLO': '#D97706',             // ocre
  'OTRO': '#64748B',                  // slate
};

let pestanaActiva = 'acervo';
let documentos = [];
let documentosMemoria = [];
let documentosAuto = [];
let documentoEditando = null;

function cambiarPestana(pestana) {
  pestanaActiva = pestana;

  // Actualizar botones de pestaña
  document.getElementById('tabAcervo').classList.toggle('activa', pestana === 'acervo');
  document.getElementById('tabMemoria').classList.toggle('activa', pestana === 'memoria');
  document.getElementById('tabAutoAprendido').classList.toggle('activa', pestana === 'auto');

  // Mostrar / Ocultar secciones
  document.getElementById('seccionAcervo').style.display = pestana === 'acervo' ? 'block' : 'none';
  document.getElementById('seccionMemoria').style.display = pestana === 'memoria' ? 'block' : 'none';
  document.getElementById('seccionAutoAprendido').style.display = pestana === 'auto' ? 'block' : 'none';

  if (pestana === 'acervo') {
    cargarDocumentos();
  } else if (pestana === 'memoria') {
    cargarMemoriaEstudio();
  } else if (pestana === 'auto') {
    cargarAutoAprendido();
  }
}

// ==============================================================================
// 1. CARGA DE ACERVO NACIONAL
// ==============================================================================

async function cargarDocumentos() {
  const fuero = document.getElementById('filtroFuero').value;
  const tipo = document.getElementById('filtroTipo').value;
  const busqueda = document.getElementById('buscadorDoc').value.trim();
  const tbody = document.getElementById('tablaOtelaxDocs');
  const badgeTotal = document.getElementById('badgeTotalDocs');

  tbody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align:center; padding:30px; color:var(--texto-muted)">
        <div style="font-size:1.1rem; margin-bottom:6px">⏳ Cargando acervo OtelaxWisdom...</div>
      </td>
    </tr>
  `;

  try {
    const params = new URLSearchParams();
    if (fuero && fuero !== 'TODOS') params.append('fuero', fuero);
    if (tipo && tipo !== 'TODOS') params.append('tipo', tipo);
    if (busqueda) params.append('busqueda', busqueda);
    params.append('visibilidad', 'PUBLICO_ACERVO');

    const data = await apiFetch(`/otelaxwisdom/docs?${params.toString()}`);
    documentos = data.docs || [];

    if (badgeTotal) {
      badgeTotal.textContent = `${documentos.length} documento${documentos.length === 1 ? '' : 's'}`;
    }

    if (!documentos.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:40px; color:var(--texto-muted)">
            <div style="font-size:2rem; margin-bottom:8px">📚</div>
            <strong>No se encontraron documentos en este filtro</strong>
            <p style="margin:4px 0 0; font-size:0.85rem">Prueba con otros términos o sincroniza desde GitHub.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = documentos
      .map((doc) => {
        const color = COLORES_TIPO[doc.tipo] || '#64748B';
        const fecha = doc.actualizado ? new Date(doc.actualizado).toLocaleDateString('es-PY') : '—';
        return `
          <tr>
            <td>
              <div style="font-weight:600; color:var(--texto); font-size:0.92rem">${doc.titulo}</div>
              <div style="font-size:0.75rem; color:var(--texto-muted); font-family:monospace; margin-top:2px">${doc.filename}</div>
            </td>
            <td>
              <span class="badge-fuero">${doc.fuero || 'GENERAL'}</span>
            </td>
            <td>
              <span style="display:inline-block; padding:3px 10px; border-radius:999px; font-size:0.72rem; font-weight:700; color:#fff; background:${color}; letter-spacing:0.02em">
                ${doc.tipo}
              </span>
            </td>
            <td style="font-size:0.85rem; color:var(--texto-secundario); font-family:monospace">
              ${doc.tamanoLegible || '—'}
            </td>
            <td style="font-size:0.85rem; color:var(--texto-secundario)">
              ${fecha}
            </td>
            <td style="text-align:right; white-space:nowrap">
              <button class="btn-secundario btn-sm" onclick="verDocumento('${encodeURIComponent(doc.filename)}')" title="Ver documento">
                👁️ Ver
              </button>
              <button class="btn-secundario btn-sm" onclick="abrirModalEditar('${encodeURIComponent(doc.filename)}')" title="Editar documento">
                ✏️
              </button>
              <button class="btn-peligro btn-sm" onclick="eliminarDoc('${encodeURIComponent(doc.filename)}')" title="Eliminar documento">
                🗑️
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:30px; color:#DC2626">
          Error al cargar documentos: ${err.message}
        </td>
      </tr>
    `;
  }
}

function filtrarDocumentos() {
  cargarDocumentos();
}

// ==============================================================================
// 2. SINCRONIZACIÓN CON GITHUB ZETTI
// ==============================================================================

async function sincronizarConGithub() {
  const btn = document.getElementById('btnSyncGithub');
  const seguro = confirm(
    '¿Deseas sincronizar el acervo legislativo con el repositorio oficial FUDAPY ZETTI en GitHub?\n\nLa sincronización es idempotente y actualizará o insertará normas sin alterar tus documentos privados.'
  );
  if (!seguro) return;

  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span> Sincronizando...';

  try {
    const res = await apiFetch('/otelaxwisdom/sync-github', {
      method: 'POST',
      body: { forzar: false },
    });

    const r = res.resultado;
    alert(
      `✅ Sincronización Oficial Completada:\n` +
      `- Total escaneados: ${r.totalEscaneados}\n` +
      `- Nuevos insertados: ${r.insertados}\n` +
      `- Actualizados: ${r.actualizados}\n` +
      `- Omitidos (sin cambios): ${r.omitidos}\n` +
      `- Duración: ${(r.duracionMs / 1000).toFixed(2)}s`
    );

    await cargarDocumentos();
  } catch (err) {
    alert(`❌ Error al sincronizar con GitHub: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>🔄</span> Sincronizar Acervo (GitHub)';
  }
}

// ==============================================================================
// 3. MEMORIA PRIVADA DEL ESTUDIO
// ==============================================================================

async function cargarMemoriaEstudio() {
  const editor = document.getElementById('editorEstiloForense');
  const tbody = document.getElementById('tablaMemoriaEstudio');

  // Cargar manual de estilo forense
  try {
    const resEstilo = await apiFetch('/otelaxwisdom/estilo-forense');
    if (resEstilo && resEstilo.contenido) {
      editor.value = resEstilo.contenido;
    }
  } catch (e) {
    console.warn('Error cargando estilo forense:', e.message);
  }

  // Cargar escritos modelo y fichas
  tbody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align:center; padding:20px; color:var(--texto-muted)">
        ⏳ Cargando memoria privada...
      </td>
    </tr>
  `;

  try {
    const data = await apiFetch('/otelaxwisdom/memoria-estudio');
    documentosMemoria = data.docs || [];

    if (!documentosMemoria.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding:30px; color:var(--texto-muted)">
            <div style="font-size:1.8rem; margin-bottom:6px">🔒</div>
            <strong>Sin escritos modelo o fichas de casos cargados</strong>
            <p style="margin:4px 0 0; font-size:0.83rem">Agrega escritos modelo o antecedentes del estudio para que Techapyrã IA redacte con tu estilo propio.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = documentosMemoria
      .map((doc) => {
        const subtipoEtiqueta =
          doc.subtipo === 'ESTILO_FORENSE'
            ? 'Manual de Estilo'
            : doc.subtipo === 'FICHA_EXPEDIENTE'
            ? 'Ficha de Caso'
            : 'Escrito Modelo';

        return `
          <tr>
            <td>
              <div style="font-weight:600; color:var(--texto); font-size:0.92rem">${doc.titulo}</div>
              <div style="font-size:0.75rem; color:var(--texto-muted); font-family:monospace; margin-top:2px">${doc.filename}</div>
            </td>
            <td>
              <span class="badge badge-dorado" style="font-size:0.72rem">${subtipoEtiqueta}</span>
            </td>
            <td>
              <span class="badge-fuero">${doc.fuero || 'GENERAL'}</span>
            </td>
            <td style="font-size:0.85rem; color:var(--texto-secundario); font-family:monospace">
              ${doc.tamanoLegible || '—'}
            </td>
            <td style="text-align:right; white-space:nowrap">
              <button class="btn-secundario btn-sm" onclick="verDocumento('${encodeURIComponent(doc.filename)}')">
                👁️ Ver
              </button>
              <button class="btn-secundario btn-sm" onclick="abrirModalEditar('${encodeURIComponent(doc.filename)}')">
                ✏️
              </button>
              <button class="btn-peligro btn-sm" onclick="eliminarDoc('${encodeURIComponent(doc.filename)}')">
                🗑️
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding:20px; color:#DC2626">
          Error al cargar memoria del estudio: ${err.message}
        </td>
      </tr>
    `;
  }
}

async function guardarEstiloEstudio() {
  const contenido = document.getElementById('editorEstiloForense').value.trim();
  const btn = document.getElementById('btnGuardarEstilo');

  if (!contenido) {
    alert('El manual de estilo forense no puede quedar vacío.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    await apiFetch('/otelaxwisdom/estilo-forense', {
      method: 'PUT',
      body: { contenido },
    });
    alert('✅ Manual de Estilo Forense guardado exitosamente. Se aplicará automáticamente en todos los borradores del Editor.');
  } catch (err) {
    alert(`❌ Error al guardar estilo: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Guardar Estilo Forense';
  }
}

// ==============================================================================
// 4. AUTO-APRENDIDO WEB OFICIAL
// ==============================================================================

async function cargarAutoAprendido() {
  const tbody = document.getElementById('tablaAutoAprendido');

  tbody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align:center; padding:20px; color:var(--texto-muted)">
        ⏳ Cargando documentos auto-aprendidos...
      </td>
    </tr>
  `;

  try {
    const data = await apiFetch('/otelaxwisdom/docs?origen=WEB_INSTITUCIONAL_AUTO');
    documentosAuto = data.docs || [];

    if (!documentosAuto.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding:35px; color:var(--texto-muted)">
            <div style="font-size:2rem; margin-bottom:6px">🌐</div>
            <strong>No hay normas auto-aprendidas aún</strong>
            <p style="margin:4px 0 0; font-size:0.83rem">
              Cuando consultes a Techapyrã IA sobre una ley o acordada no indexada, el sistema la buscará en portales <code>.gov.py</code> y la registrará aquí automáticamente.
            </p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = documentosAuto
      .map((doc) => {
        const esPendiente = doc.estado_revision === 'PENDIENTE_REVISION';
        const badgeRevision = esPendiente
          ? `<span style="background:#FEF3C7; color:#92400E; padding:3px 8px; border-radius:999px; font-size:0.72rem; font-weight:700">⏳ Pendiente de Aprobación</span>`
          : `<span style="background:#D1FAE5; color:#065F46; padding:3px 8px; border-radius:999px; font-size:0.72rem; font-weight:700">✓ Aprobado Oficial</span>`;

        const fecha = doc.actualizado ? new Date(doc.actualizado).toLocaleDateString('es-PY') : '—';

        return `
          <tr>
            <td>
              <div style="font-weight:600; color:var(--texto); font-size:0.92rem">${doc.titulo}</div>
              <div style="font-size:0.75rem; color:var(--texto-muted); font-family:monospace; margin-top:2px">${doc.filename}</div>
            </td>
            <td>
              <a href="${doc.url_fuente || '#'}" target="_blank" rel="noopener noreferrer" style="color:var(--azul-primary); font-size:0.83rem; text-decoration:none">
                🏛️ ${doc.fuente || 'Portal Oficial'} &rarr;
              </a>
            </td>
            <td>${badgeRevision}</td>
            <td style="font-size:0.85rem; color:var(--texto-secundario)">${fecha}</td>
            <td style="text-align:right; white-space:nowrap">
              ${
                esPendiente
                  ? `<button class="btn-primario btn-sm" onclick="aprobarDocAuto('${encodeURIComponent(doc.filename)}')">
                      ✓ Aprobar
                    </button>`
                  : ''
              }
              <button class="btn-secundario btn-sm" onclick="verDocumento('${encodeURIComponent(doc.filename)}')">
                👁️ Ver
              </button>
              <button class="btn-peligro btn-sm" onclick="eliminarDoc('${encodeURIComponent(doc.filename)}')">
                🗑️
              </button>
            </td>
          </tr>
        `;
      })
      .join('');
  } catch (err) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center; padding:20px; color:#DC2626">
          Error al cargar auto-aprendidos: ${err.message}
        </td>
      </tr>
    `;
  }
}

async function aprobarDocAuto(filenameEncoded) {
  const filename = decodeURIComponent(filenameEncoded);
  try {
    await apiFetch(`/otelaxwisdom/docs/${encodeURIComponent(filename)}/aprobar`, {
      method: 'PUT',
    });
    alert('✅ Documento aprobado e integrado oficialmente al acervo.');
    await cargarAutoAprendido();
  } catch (err) {
    alert(`Error al aprobar: ${err.message}`);
  }
}

// ==============================================================================
// 5. MODALES Y OPERACIONES CRUD
// ==============================================================================

function abrirModalNuevo(visibilidad = 'PUBLICO_ACERVO') {
  documentoEditando = null;
  document.getElementById('tituloModalDoc').textContent =
    visibilidad === 'PRIVADO_ESTUDIO'
      ? 'Nuevo Documento en Memoria Privada del Estudio'
      : 'Nuevo Documento en OtelaxWisdom';

  document.getElementById('docTitulo').value = '';
  document.getElementById('docFuero').value = 'CIVIL Y COMERCIAL';
  document.getElementById('docTipo').value = 'LEY';
  document.getElementById('docContenido').value = '';
  document.getElementById('docFilenameSugerido').value = '';
  document.getElementById('grupoFilename').style.display = 'none';

  const selectVis = document.getElementById('docVisibilidad');
  if (selectVis) {
    selectVis.value = visibilidad;
    document.getElementById('grupoVisibilidad').style.display = 'block';
  }

  ocultarAvisoSubida();
  document.getElementById('modalDocOtelax').classList.remove('oculto');
  document.getElementById('docTitulo').focus();
}

async function abrirModalEditar(filenameEncoded) {
  const filename = decodeURIComponent(filenameEncoded);
  try {
    const data = await apiFetch(`/otelaxwisdom/docs/${encodeURIComponent(filename)}`);
    const doc = data.doc;
    if (!doc) throw new Error('Documento no encontrado.');

    documentoEditando = filename;
    document.getElementById('tituloModalDoc').textContent = 'Editar Documento en OtelaxWisdom';
    document.getElementById('docTitulo').value = doc.titulo;
    document.getElementById('docFuero').value = doc.fuero || 'CIVIL Y COMERCIAL';
    document.getElementById('docTipo').value = doc.tipo;
    document.getElementById('docContenido').value = doc.contenido || '';
    document.getElementById('docFilenameSugerido').value = doc.filename;
    document.getElementById('grupoFilename').style.display = 'block';

    const selectVis = document.getElementById('docVisibilidad');
    if (selectVis) {
      selectVis.value = doc.visibilidad || 'PUBLICO_ACERVO';
      document.getElementById('grupoVisibilidad').style.display = 'block';
    }

    ocultarAvisoSubida();
    document.getElementById('modalDocOtelax').classList.remove('oculto');
  } catch (err) {
    alert(`Error al abrir documento: ${err.message}`);
  }
}

function cerrarModalDoc() {
  document.getElementById('modalDocOtelax').classList.add('oculto');
  documentoEditando = null;
}

async function guardarDoc() {
  const titulo = document.getElementById('docTitulo').value.trim();
  const fuero = document.getElementById('docFuero').value;
  const tipo = document.getElementById('docTipo').value;
  const visibilidad = document.getElementById('docVisibilidad')?.value || 'PUBLICO_ACERVO';
  const contenido = document.getElementById('docContenido').value.trim();
  const btn = document.getElementById('btnGuardarDoc');

  if (!titulo) {
    alert('Por favor, ingresa el título del documento.');
    document.getElementById('docTitulo').focus();
    return;
  }
  if (!contenido) {
    alert('El contenido del documento no puede estar vacío.');
    document.getElementById('docContenido').focus();
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    if (documentoEditando) {
      await apiFetch(`/otelaxwisdom/docs/${encodeURIComponent(documentoEditando)}`, {
        method: 'PUT',
        body: { titulo, fuero, tipo, visibilidad, contenido },
      });
    } else {
      await apiFetch('/otelaxwisdom/docs', {
        method: 'POST',
        body: { titulo, fuero, tipo, visibilidad, contenido },
      });
    }

    cerrarModalDoc();
    if (pestanaActiva === 'acervo') await cargarDocumentos();
    else if (pestanaActiva === 'memoria') await cargarMemoriaEstudio();
    else await cargarAutoAprendido();
  } catch (err) {
    alert(`Error al guardar: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar Documento';
  }
}

async function eliminarDoc(filenameEncoded) {
  const filename = decodeURIComponent(filenameEncoded);
  const seguro = confirm(`¿Estás seguro de eliminar "${filename}" de OtelaxWisdom?`);
  if (!seguro) return;

  try {
    await apiFetch(`/otelaxwisdom/docs/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
    if (pestanaActiva === 'acervo') await cargarDocumentos();
    else if (pestanaActiva === 'memoria') await cargarMemoriaEstudio();
    else await cargarAutoAprendido();
  } catch (err) {
    alert(`Error al eliminar: ${err.message}`);
  }
}

async function verDocumento(filenameEncoded) {
  const filename = decodeURIComponent(filenameEncoded);
  try {
    const data = await apiFetch(`/otelaxwisdom/docs/${encodeURIComponent(filename)}`);
    const doc = data.doc;
    if (!doc) throw new Error('Documento no encontrado.');

    document.getElementById('verDocTitulo').textContent = doc.titulo;
    document.getElementById('verDocTipo').textContent = doc.tipo;
    document.getElementById('verDocFuero').textContent = doc.fuero || 'GENERAL';
    document.getElementById('verDocTamano').textContent = doc.tamanoLegible || '';
    document.getElementById('verDocFilename').textContent = doc.filename;
    document.getElementById('verDocContenido').textContent = doc.contenido || '';
    document.getElementById('modalVerDocOtelax').classList.remove('oculto');
  } catch (err) {
    alert(`Error al cargar vista: ${err.message}`);
  }
}

function cerrarModalVer() {
  document.getElementById('modalVerDocOtelax').classList.add('oculto');
}

// ==============================================================================
// 6. IMPORTADOR DE ARCHIVOS .MD CON DETECCIÓN AUTOMÁTICA
// ==============================================================================

function mostrarAvisoSubida(mensaje) {
  const aviso = document.getElementById('avisoSubida');
  if (!aviso) return;
  aviso.textContent = mensaje;
  aviso.style.display = 'block';
}

function ocultarAvisoSubida() {
  const aviso = document.getElementById('avisoSubida');
  if (aviso) aviso.style.display = 'none';
}

function procesarArchivoMd(file) {
  if (!file) return;

  const extensionValida = /\.(md|markdown|txt)$/i.test(file.name);
  if (!extensionValida) {
    alert('Por favor selecciona un archivo con formato .md o Markdown.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const raw = String(e.target.result || '');
    let tituloDetectado = '';
    let tipoDetectado = '';
    let fueroDetectado = '';
    let contenidoLimpio = raw;

    // 1. Detección en Frontmatter YAML (^---\n...\n---)
    const frontmatterMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (frontmatterMatch) {
      const header = frontmatterMatch[1];
      contenidoLimpio = frontmatterMatch[2].trim();

      header.split(/\r?\n/).forEach((line) => {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const key = line.slice(0, colonIdx).trim().toLowerCase();
          let val = line.slice(colonIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (key === 'titulo' || key === 'title') {
            tituloDetectado = val;
          }
          if (key === 'tipo' || key === 'type') {
            tipoDetectado = val.toUpperCase().trim();
          }
          if (key === 'fuero') {
            fueroDetectado = val.toUpperCase().trim();
          }
        }
      });
    }

    // 2. Si no hubo título en frontmatter, buscar primer encabezado Markdown (# Título)
    if (!tituloDetectado) {
      const h1Match = contenidoLimpio.match(/^\s*#\s+(.+)$/m);
      if (h1Match) {
        tituloDetectado = h1Match[1].trim();
      }
    }

    // 3. Si no hay título, convertir el nombre de archivo en título legible
    if (!tituloDetectado) {
      const nombreBase = file.name.replace(/\.(md|markdown|txt)$/i, '');
      tituloDetectado = nombreBase
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    // Cargar en los campos del formulario
    document.getElementById('docTitulo').value = tituloDetectado;
    document.getElementById('docContenido').value = contenidoLimpio;

    // Preseleccionar Tipo si es válido
    const selectorTipo = document.getElementById('docTipo');
    if (tipoDetectado && TIPOS_VALIDOS.includes(tipoDetectado)) {
      selectorTipo.value = tipoDetectado;
    }

    // Preseleccionar Fuero si coincide
    const selectorFuero = document.getElementById('docFuero');
    if (fueroDetectado && selectorFuero) {
      for (const op of selectorFuero.options) {
        if (op.value.includes(fueroDetectado) || fueroDetectado.includes(op.value)) {
          selectorFuero.value = op.value;
          break;
        }
      }
    }

    selectorTipo.focus();
    mostrarAvisoSubida(`✓ Archivo cargado: "${file.name}". Ajusta tipo o fuero si es necesario y guarda.`);
  };

  reader.onerror = function () {
    alert('Error al leer el archivo desde el disco.');
  };

  reader.readAsText(file, 'UTF-8');
}

function inicializarImportadorMd() {
  const fileInput = document.getElementById('archivoMdInput');
  const dropZone = document.getElementById('dropZoneMd');

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        procesarArchivoMd(file);
      }
      fileInput.value = '';
    });
  }

  if (dropZone) {
    ['dragenter', 'dragover'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = 'var(--azul-accent)';
        dropZone.style.background = '#EFF6FF';
      });
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '#CBD5E1';
        dropZone.style.background = 'var(--bg-subtle)';
      });
    });

    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const file = dt.files && dt.files[0];
      if (file) {
        procesarArchivoMd(file);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  inicializarImportadorMd();
  cargarDocumentos();
});
