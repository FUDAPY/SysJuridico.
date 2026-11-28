requerirSesion();
renderBarraLateral('lexpy');

let sesionId = null;

function seleccionarTab(tab) {
  document.getElementById('tabChat').classList.toggle('activo', tab === 'chat');
  document.getElementById('tabRedactor').classList.toggle('activo', tab === 'redactor');
  document.getElementById('panelChat').classList.toggle('activo', tab === 'chat');
  document.getElementById('panelRedactor').classList.toggle('activo', tab === 'redactor');
}

function usarSugerencia(texto) {
  document.getElementById('entradaChat').value = texto;
  enviarPregunta();
}

function limpiarChat() {
  sesionId = null;
  const contenedor = document.getElementById('chatMensajes');
  contenedor.innerHTML = `
    <div class="chat-burbuja chat-asistente">
      <strong>¡Nueva conversación iniciada!</strong>
      <p style="margin-top:4px">¿En qué asunto legal o trámite procesal puedo ayudarte?</p>
    </div>
  `;
}

async function cargarSelectsRedactor() {
  try {
    const [clientes, expedientes] = await Promise.all([
      apiFetch('/clientes').catch(() => []),
      apiFetch('/expedientes').catch(() => []),
    ]);

    const elCli = document.getElementById('borradorCliente');
    if (elCli && clientes.length) {
      elCli.innerHTML = '<option value="">— Sin cliente asociado —</option>' +
        clientes.map((c) => `<option value="${c._id}">${c.nombreCompleto} (${c.cedula || 'S/D'})</option>`).join('');
    }

    const elExp = document.getElementById('borradorExpediente');
    if (elExp && expedientes.length) {
      elExp.innerHTML = '<option value="">— Sin expediente vinculado —</option>' +
        expedientes.map((e) => `<option value="${e._id}">${e.caratula}</option>`).join('');
    }
  } catch (err) {
    console.warn('Error cargando selects del redactor:', err.message);
  }
}

function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatoEnLinea(texto) {
  return texto
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--azul-accent)">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.06); padding:2px 4px; border-radius:4px">$1</code>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function renderMarkdown(md) {
  const lineas = escaparHtml(md).split('\n');
  let html = '';
  let listaAbierta = null;
  const cerrarLista = () => {
    if (listaAbierta) {
      html += `</${listaAbierta}>`;
      listaAbierta = null;
    }
  };

  lineas.forEach((linea) => {
    const heading = linea.match(/^(#{1,4})\s+(.*)$/);
    const hr = /^\s*---+\s*$/.test(linea);
    const bullet = linea.match(/^\s*[-*]\s+(.*)$/);
    const numerada = linea.match(/^\s*\d+[.)]\s+(.*)$/);
    const tipoLista = bullet ? 'ul' : numerada ? 'ol' : null;

    if (hr) {
      cerrarLista();
      html += '<hr style="border:none; border-top:1px dashed var(--borde); margin:10px 0"/>';
      return;
    }
    if (heading) {
      cerrarLista();
      html += `<div style="font-family:var(--fuente-titulos); font-weight:700; margin-top:10px; color:var(--azul-accent)">${formatoEnLinea(heading[2])}</div>`;
      return;
    }
    if (tipoLista) {
      if (listaAbierta !== tipoLista) {
        cerrarLista();
        html += `<${tipoLista} style="margin:4px 0 4px 18px">`;
        listaAbierta = tipoLista;
      }
      html += `<li>${formatoEnLinea((bullet || numerada)[1])}</li>`;
      return;
    }

    cerrarLista();
    if (!linea.trim()) {
      html += '<br/>';
      return;
    }
    html += `<p style="margin:4px 0">${formatoEnLinea(linea)}</p>`;
  });
  cerrarLista();
  return html;
}

const NOMBRES_FUENTE = {
  base_local: 'Techapyrã IA · Motor OtelaxWisdom',
  otelaxwisdom: 'Techapyrã IA · Motor OtelaxWisdom',
  externo_csj: 'CSJ Paraguay (Scraping oficial)',
  externo_baselegal: 'BaseLegal Paraguay (Scraping)',
  ia_generativa: 'Techapyrã IA',
};

function agregarBurbuja(texto, esUsuario, fuente, metadatos) {
  const contenedor = document.getElementById('chatMensajes');
  const burbuja = document.createElement('div');
  burbuja.className = `chat-burbuja ${esUsuario ? 'chat-usuario' : 'chat-asistente'}`;
  if (esUsuario) {
    burbuja.textContent = texto;
  } else {
    burbuja.innerHTML = renderMarkdown(texto);

    // Botones de acción rápida para respuestas del asistente
    const barraAcciones = document.createElement('div');
    barraAcciones.style.cssText = 'display:flex; gap:6px; flex-wrap:wrap; margin-top:10px; padding-top:8px; border-top:1px solid var(--borde);';
    barraAcciones.innerHTML = `
      <button type="button" class="btn-chip" style="font-size:0.75rem; padding:3px 8px; cursor:pointer;" onclick="copiarTextoRespuesta(this)" title="Copiar respuesta completa">
        📋 Copiar
      </button>
      <button type="button" class="btn-chip" style="font-size:0.75rem; padding:3px 8px; cursor:pointer;" onclick="enviarRespuestaAlEditor(this)" title="Abrir y continuar redactando en el Editor Judicial">
        ✍️ Enviar al Editor Judicial
      </button>
      <button type="button" class="btn-chip" style="font-size:0.75rem; padding:3px 8px; cursor:pointer;" onclick="guardarRespuestaEnCronologia(this)" title="Guardar informe en la memoria del expediente activo">
        📌 Guardar en Cronología
      </button>
    `;
    burbuja.appendChild(barraAcciones);
    burbuja.dataset.rawText = texto;
  }
  contenedor.appendChild(burbuja);

  if (!esUsuario && fuente) {
    const etiqueta = document.createElement('div');
    etiqueta.className = 'fuente-tag';
    const docs = metadatos?.documentosConsultados?.length ? ` &bull; ${metadatos.documentosConsultados.length} norma(s)` : '';
    const cacheInfo = metadatos?.desdeCache ? ' &bull; ⚡ Caché Normativo (0 tokens)' : '';
    etiqueta.innerHTML = `<span>📌</span> Fuente: <strong>${NOMBRES_FUENTE[fuente] || fuente}</strong>${docs}${cacheInfo}`;
    contenedor.appendChild(etiqueta);
  }
  contenedor.scrollTop = contenedor.scrollHeight;
}

function copiarTextoRespuesta(btn) {
  const burbuja = btn.closest('.chat-burbuja');
  const texto = burbuja?.dataset?.rawText || burbuja?.innerText || '';
  navigator.clipboard.writeText(texto).then(() => {
    const original = btn.textContent;
    btn.textContent = '✓ ¡Copiado!';
    setTimeout(() => { btn.textContent = original; }, 1800);
  });
}

function enviarRespuestaAlEditor(btn) {
  const burbuja = btn.closest('.chat-burbuja');
  const texto = burbuja?.dataset?.rawText || burbuja?.innerText || '';
  const expId = document.getElementById('selectExpedienteChat')?.value || '';
  localStorage.setItem('sysjuridico_editor_import_text', texto);
  if (expId) localStorage.setItem('sysjuridico_editor_import_exp', expId);
  window.location.href = `/editor.html?importar=1${expId ? `&expedienteId=${expId}` : ''}`;
}

async function guardarRespuestaEnCronologia(btn) {
  const burbuja = btn.closest('.chat-burbuja');
  const texto = burbuja?.dataset?.rawText || burbuja?.innerText || '';
  const expId = document.getElementById('selectExpedienteChat')?.value;

  if (!expId) {
    alert('Por favor selecciona un expediente en la parte superior del chat para guardar esta respuesta en su cronología.');
    document.getElementById('selectExpedienteChat')?.focus();
    return;
  }

  const titulo = prompt('Título para asentar en la cronología del caso:', 'Informe Jurídico de Techapyrã IA');
  if (!titulo) return;

  try {
    btn.disabled = true;
    btn.textContent = '⏳ Guardando...';
    await apiFetch('/v1/editor/guardar', {
      method: 'POST',
      body: {
        expedienteId: expId,
        titulo,
        contenidoTexto: texto,
        contenidoHtml: `<p>${texto.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}</p>`,
      },
    });
    btn.textContent = '✓ Asentado en Causa';
    setTimeout(() => { btn.textContent = '📌 Guardar en Cronología'; btn.disabled = false; }, 2500);
    alert('¡Hito guardado con éxito en la memoria persistente del expediente!');
  } catch (err) {
    alert('Error al guardar en cronología: ' + err.message);
    btn.disabled = false;
    btn.textContent = '📌 Guardar en Cronología';
  }
}

let archivosAdjuntosParaEnvio = [];

function renderChipsArchivos() {
  const caja = document.getElementById('cajaArchivosAdjuntosChat');
  if (!caja) return;
  if (!archivosAdjuntosParaEnvio.length) {
    caja.style.display = 'none';
    caja.innerHTML = '';
    return;
  }

  caja.style.display = 'flex';
  caja.innerHTML = archivosAdjuntosParaEnvio
    .map(
      (a, idx) => `
    <div style="display:inline-flex; align-items:center; gap:6px; background:#EFF6FF; border:1px solid #BFDBFE; color:#1D4ED8; padding:3px 10px; border-radius:12px; font-size:0.78rem;">
      <span>📎 ${escaparHtml(a.nombre)}</span>
      <button type="button" onclick="quitarArchivoAdjunto(${idx})" style="background:transparent; border:none; cursor:pointer; font-weight:bold; color:#DC2626;">&times;</button>
    </div>`
    )
    .join('');
}

function quitarArchivoAdjunto(index) {
  archivosAdjuntosParaEnvio.splice(index, 1);
  renderChipsArchivos();
}

async function procesarArchivosLocales(archivos) {
  for (const file of archivos) {
    if (file.size > 25 * 1024 * 1024) {
      alert(`El archivo ${file.name} supera el límite de 25 MB.`);
      continue;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Completo = e.target.result;
      const base64Pure = base64Completo.split(',')[1];
      archivosAdjuntosParaEnvio.push({
        nombre: file.name,
        tipo: file.type,
        bufferBase64: base64Pure,
      });
      renderChipsArchivos();
    };
    reader.readAsDataURL(file);
  }
}

function manejarSeleccionArchivosChat(event) {
  const files = Array.from(event.target.files || []);
  procesarArchivosLocales(files);
  event.target.value = '';
}

// Soporte Drag & Drop en el panel de chat
(function setupDragAndDrop() {
  const dropZone = document.getElementById('panelChat');
  if (!dropZone) return;

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.style.border = '2px dashed var(--azul-primary)';
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.style.border = '';
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = Array.from(dt.files || []);
    if (files.length) {
      procesarArchivosLocales(files);
    }
  });
})();

async function cargarSelectExpedientesChat() {
  try {
    const expedientes = await apiFetch('/expedientes').catch(() => []);
    const el = document.getElementById('selectExpedienteChat');
    if (el && Array.isArray(expedientes)) {
      el.innerHTML =
        '<option value="">📁 Vincular a Expediente (Opcional)</option>' +
        expedientes.map((e) => `<option value="${e._id}">${escaparHtml(e.caratula)} (N° ${e.numero || 'S/N'})</option>`).join('');

      // Si viene expedienteId en la URL, preseleccionarlo
      const params = new URLSearchParams(window.location.search);
      const expUrl = params.get('expedienteId');
      if (expUrl) {
        el.value = expUrl;
      }
    }
  } catch (err) {
    console.warn('Error cargando expedientes en chat:', err.message);
  }
}

async function enviarPregunta() {
  const campo = document.getElementById('entradaChat');
  const pregunta = campo.value.trim();
  if (!pregunta && !archivosAdjuntosParaEnvio.length) return;

  const expSeleccionado = document.getElementById('selectExpedienteChat')?.value || null;
  const archivosActuales = [...archivosAdjuntosParaEnvio];

  let textoMostrado = pregunta;
  if (archivosActuales.length) {
    textoMostrado += `\n[Archivos adjuntos: ${archivosActuales.map((a) => a.nombre).join(', ')}]`;
  }

  agregarBurbuja(textoMostrado, true);
  campo.value = '';
  archivosAdjuntosParaEnvio = [];
  renderChipsArchivos();

  // Mensaje temporal con retroalimentación progresiva en tiempo real
  const contenedor = document.getElementById('chatMensajes');
  const tempMsg = document.createElement('div');
  tempMsg.className = 'chat-burbuja chat-asistente';
  tempMsg.id = 'tempThinking';

  const pasos = [
    '🔍 Consultando antecedentes de la causa y memoria procesal...',
    '📚 Buscando doctrina y normas en OtelaxWisdom (215 leyes)...',
    '🌐 Verificando normativa actualizada en portales oficiales paraguayos...',
    '⚖️ Redactando fundamentación forense con Techapyrã IA...',
  ];
  let pasoIdx = 0;
  tempMsg.innerHTML = `<span style="color:var(--dorado)">${pasos[0]}</span>`;
  contenedor.appendChild(tempMsg);
  contenedor.scrollTop = contenedor.scrollHeight;

  const timerPasos = setInterval(() => {
    pasoIdx = (pasoIdx + 1) % pasos.length;
    if (tempMsg && tempMsg.parentNode) {
      tempMsg.innerHTML = `<span style="color:var(--dorado)">${pasos[pasoIdx]}</span>`;
    }
  }, 1400);

  try {
    const data = await apiFetch('/lexpy/chat', {
      method: 'POST',
      body: {
        pregunta: pregunta || 'Analiza los documentos adjuntos y realiza un informe procesal.',
        sesionId,
        expediente: expSeleccionado,
        archivosAdjuntos: archivosActuales,
        modo: 'MODO_CHAT',
      },
    });
    clearInterval(timerPasos);
    tempMsg.remove();
    sesionId = data.sesionId;
    agregarBurbuja(data.respuesta, false, data.fuente, data);
  } catch (err) {
    clearInterval(timerPasos);
    tempMsg.remove();
    agregarBurbuja(`Error al consultar: ${err.message}`, false);
  }
}

document.getElementById('entradaChat').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') enviarPregunta();
});

async function redactarBorrador() {
  const btn = document.getElementById('btnGenerarEscrito');
  const caja = document.getElementById('cajaBorrador');
  const resultado = document.getElementById('resultadoBorrador');

  caja.classList.remove('oculto');
  resultado.textContent = '⚡ Analizando hechos y redactando documento con Techapyrã IA...';
  btn.disabled = true;

  try {
    const data = await apiFetch('/lexpy/redactar', {
      method: 'POST',
      body: {
        tipoDocumento: document.getElementById('tipoDocumento').value,
        clienteId: document.getElementById('borradorCliente').value || null,
        expedienteId: document.getElementById('borradorExpediente').value || null,
        instrucciones: document.getElementById('borradorInstrucciones').value,
      },
    });
    resultado.textContent = data.borrador;
  } catch (err) {
    resultado.textContent = `Error: ${err.message}`;
  } finally {
    btn.disabled = false;
  }
}

function copiarBorrador() {
  const texto = document.getElementById('resultadoBorrador').textContent;
  if (!texto) return;
  navigator.clipboard.writeText(texto).then(() => {
    alert('¡Escrito copiado al portapapeles!');
  });
}

cargarSelectsRedactor();
cargarSelectExpedientesChat();

// Si viene un parámetro ?q= o ?consulta= en la URL, ejecutar automáticamente
(function () {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q') || params.get('consulta');
  if (q && q.trim()) {
    const input = document.getElementById('entradaChat');
    if (input) {
      input.value = q;
      setTimeout(() => enviarPregunta(), 350);
    }
  }
})();


