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
  base_local: 'Base de conocimiento (RAG local)',
  externo_csj: 'CSJ Paraguay (Scraping oficial)',
  externo_baselegal: 'BaseLegal Paraguay (Scraping)',
  ia_generativa: 'DeepSeek AI Generativo',
};

function agregarBurbuja(texto, esUsuario, fuente) {
  const contenedor = document.getElementById('chatMensajes');
  const burbuja = document.createElement('div');
  burbuja.className = `chat-burbuja ${esUsuario ? 'chat-usuario' : 'chat-asistente'}`;
  if (esUsuario) {
    burbuja.textContent = texto;
  } else {
    burbuja.innerHTML = renderMarkdown(texto);
  }
  contenedor.appendChild(burbuja);

  if (!esUsuario && fuente) {
    const etiqueta = document.createElement('div');
    etiqueta.className = 'fuente-tag';
    etiqueta.innerHTML = `<span>📌</span> Fuente: ${NOMBRES_FUENTE[fuente] || fuente}`;
    contenedor.appendChild(etiqueta);
  }
  contenedor.scrollTop = contenedor.scrollHeight;
}

async function enviarPregunta() {
  const campo = document.getElementById('entradaChat');
  const pregunta = campo.value.trim();
  if (!pregunta) return;

  agregarBurbuja(pregunta, true);
  campo.value = '';

  // Mensaje temporal de pensamiento
  const contenedor = document.getElementById('chatMensajes');
  const tempMsg = document.createElement('div');
  tempMsg.className = 'chat-burbuja chat-asistente';
  tempMsg.id = 'tempThinking';
  tempMsg.innerHTML = '<span style="color:var(--dorado)">⚡ Consultando legislación y analizando con DeepSeek...</span>';
  contenedor.appendChild(tempMsg);
  contenedor.scrollTop = contenedor.scrollHeight;

  try {
    const data = await apiFetch('/lexpy/chat', { method: 'POST', body: { pregunta, sesionId } });
    tempMsg.remove();
    sesionId = data.sesionId;
    agregarBurbuja(data.respuesta, false, data.fuente);
  } catch (err) {
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
  resultado.textContent = '⚡ Analizando hechos y redactando documento con DeepSeek...';
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

// Si viene un parámetro ?q= en la URL (por ejemplo desde la Red de Conocimiento), ejecutar automáticamente
(function () {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q && q.trim()) {
    const input = document.getElementById('entradaChat');
    if (input) {
      input.value = q;
      setTimeout(() => enviarPregunta(), 300);
    }
  }
})();

