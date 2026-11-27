// Gestor del Acervo de Conocimiento OtelaxWisdom (Documentos .md)
const { token, usuario } = requerirSesion();
renderBarraLateral('otelaxwisdom');
inicializarSidebarColapsable();

const TIPOS_VALIDOS = [
  'CONSTITUCION NACIONAL',
  'TRATADO INTERNACIONAL',
  'CODIGO',
  'LEY',
  'JURISPRUDENCIA',
  'ACORDADA',
  'DOCTRINA',
  'OTRO',
];

const COLORES_TIPO = {
  'CONSTITUCION NACIONAL': '#B45309', // ambar oscuro
  'TRATADO INTERNACIONAL': '#0369A1', // celeste institucional
  'CODIGO': '#1E40AF',                // azul primario
  'LEY': '#047857',                   // verde esmeralda
  'JURISPRUDENCIA': '#6D28D9',        // violeta
  'ACORDADA': '#4338CA',              // indigo
  'DOCTRINA': '#475569',              // pizarra
  'OTRO': '#64748B',                  // slate
};

let documentos = [];
let documentoEditando = null;

async function cargarDocumentos() {
  const tipo = document.getElementById('filtroTipo').value;
  const busqueda = document.getElementById('buscadorDoc').value.trim();
  const tbody = document.getElementById('tablaOtelaxDocs');
  const badgeTotal = document.getElementById('badgeTotalDocs');

  tbody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align:center; padding:30px; color:var(--texto-muted)">
        <div style="font-size:1.1rem; margin-bottom:6px">⏳ Cargando acervo OtelaxWisdom...</div>
      </td>
    </tr>
  `;

  try {
    const params = new URLSearchParams();
    if (tipo && tipo !== 'TODOS') params.append('tipo', tipo);
    if (busqueda) params.append('busqueda', busqueda);

    const data = await apiFetch(`/otelaxwisdom/docs?${params.toString()}`);
    documentos = data.docs || [];

    if (badgeTotal) {
      badgeTotal.textContent = `${documentos.length} documento${documentos.length === 1 ? '' : 's'}`;
    }

    if (!documentos.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align:center; padding:40px; color:var(--texto-muted)">
            <div style="font-size:2rem; margin-bottom:8px">📚</div>
            <strong>No se encontraron documentos en OtelaxWisdom</strong>
            <p style="margin:4px 0 0; font-size:0.85rem">Agrega un documento nuevo o importa un archivo <code>.md</code> desde tu computadora.</p>
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
                ✏️ Editar
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
        <td colspan="5" style="text-align:center; padding:30px; color:#DC2626">
          Error al cargar documentos: ${err.message}
        </td>
      </tr>
    `;
  }
}

function filtrarDocumentos() {
  cargarDocumentos();
}

function abrirModalNuevo() {
  documentoEditando = null;
  document.getElementById('tituloModalDoc').textContent = 'Nuevo Documento en OtelaxWisdom';
  document.getElementById('docTitulo').value = '';
  document.getElementById('docTipo').value = 'CONSTITUCION NACIONAL';
  document.getElementById('docContenido').value = '';
  document.getElementById('docFilenameSugerido').value = '';
  document.getElementById('grupoFilename').style.display = 'none';
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
    document.getElementById('docTipo').value = doc.tipo;
    document.getElementById('docContenido').value = doc.contenido || '';
    document.getElementById('docFilenameSugerido').value = doc.filename;
    document.getElementById('grupoFilename').style.display = 'block';
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
  const tipo = document.getElementById('docTipo').value;
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
        body: { titulo, tipo, contenido },
      });
    } else {
      await apiFetch('/otelaxwisdom/docs', {
        method: 'POST',
        body: { titulo, tipo, contenido },
      });
    }

    cerrarModalDoc();
    await cargarDocumentos();
  } catch (err) {
    alert(`Error al guardar: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar Documento';
  }
}

async function eliminarDoc(filenameEncoded) {
  const filename = decodeURIComponent(filenameEncoded);
  const seguro = confirm(`¿Estás seguro de eliminar "${filename}" del acervo de OtelaxWisdom?`);
  if (!seguro) return;

  try {
    await apiFetch(`/otelaxwisdom/docs/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
    await cargarDocumentos();
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
// IMPORTADOR DE ARCHIVOS .MD CON DETECCIÓN AUTOMÁTICA
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

    // Enfocar el selector de Tipo
    selectorTipo.focus();

    // Mostrar feedback claro y discreto
    mostrarAvisoSubida(`✓ Archivo cargado: "${file.name}". Selecciona el tipo y guarda.`);
  };

  reader.onerror = function () {
    alert('Error al leer el archivo desde el disco.');
  };

  reader.readAsText(file, 'UTF-8');
}

// Configuración de zona Drag & Drop y file input
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
