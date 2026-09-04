requerirSesion();
renderBarraLateral('lexpy');

let sesionId = null;

function agregarBurbuja(texto, esUsuario, fuente) {
  const contenedor = document.getElementById('chatMensajes');
  const burbuja = document.createElement('div');
  burbuja.className = `chat-burbuja ${esUsuario ? 'chat-usuario' : 'chat-asistente'}`;
  burbuja.textContent = texto;
  contenedor.appendChild(burbuja);

  if (!esUsuario && fuente) {
    const etiqueta = document.createElement('div');
    etiqueta.className = 'fuente-tag';
    etiqueta.textContent = `Fuente: ${fuente}`;
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
