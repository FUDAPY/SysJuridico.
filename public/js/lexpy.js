requerirSesion();
renderBarraLateral('lexpy');

let sesionId = null;

function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatoEnLinea(texto) {
  return texto
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
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
      html += '<hr/>';
      return;
    }
    if (heading) {
      cerrarLista();
      html += `<div class="md-h">${formatoEnLinea(heading[2])}</div>`;
      return;
    }
    if (tipoLista) {
      if (listaAbierta !== tipoLista) {
        cerrarLista();
        html += `<${tipoLista}>`;
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
    html += `<p>${formatoEnLinea(linea)}</p>`;
  });
  cerrarLista();
  return html;
}

const NOMBRES_FUENTE = {
  base_local: 'Base de conocimiento (RAG)',
  externo_csj: 'CSJ - scraping',
  externo_baselegal: 'BaseLegal - scraping',
  ia_generativa: 'IA generativa',
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
    etiqueta.textContent = `Fuente: ${NOMBRES_FUENTE[fuente] || fuente}`;
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

  try {
    const data = await apiFetch('/lexpy/chat', { method: 'POST', body: { pregunta, sesionId } });
    sesionId = data.sesionId;
    agregarBurbuja(data.respuesta, false, data.fuente);
  } catch (err) {
    agregarBurbuja(`Error: ${err.message}`, false);
  }
}

document.getElementById('entradaChat').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') enviarPregunta();
});

async function redactarBorrador() {
  const resultado = document.getElementById('resultadoBorrador');
  resultado.classList.remove('oculto');
  resultado.textContent = 'Generando borrador...';

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
  }
}
