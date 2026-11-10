document.addEventListener('DOMContentLoaded', async () => {
  const hoja = document.getElementById('hojaEditor');
  const tituloDocInput = document.getElementById('tituloDocumento');
  const badgeExpediente = document.getElementById('badgeExpediente');

  // Panel Copiloto
  const copilotPane = document.getElementById('copilotPane');
  const btnToggleCopilot = document.getElementById('btnToggleCopilot');
  const btnCloseCopilot = document.getElementById('btnCloseCopilot');
  const selectExpediente = document.getElementById('copilotExpediente');
  const promptInput = document.getElementById('copilotPrompt');
  const btnGenerarCopilot = document.getElementById('btnGenerarCopilot');
  const resultadoBox = document.getElementById('copilotResultadoBox');
  const textoGeneradoDiv = document.getElementById('copilotTextoGenerado');
  const btnInsertarEnCursor = document.getElementById('btnInsertarEnCursor');
  const btnReemplazarTodo = document.getElementById('btnReemplazarTodo');
  const btnCopiarBorrador = document.getElementById('btnCopiarBorrador');

  // Modal Guardar
  const btnGuardarEnExpediente = document.getElementById('btnGuardarEnExpediente');
  const modalGuardarCaso = document.getElementById('modalGuardarCaso');
  const btnCerrarModalGuardar = document.getElementById('btnCerrarModalGuardar');
  const btnCancelarGuardar = document.getElementById('btnCancelarGuardar');
  const selectGuardarExpediente = document.getElementById('selectGuardarExpediente');
  const inputNombreEscrito = document.getElementById('inputNombreEscrito');
  const btnConfirmarGuardarCaso = document.getElementById('btnConfirmarGuardarCaso');
  const btnDescargarDocx = document.getElementById('btnDescargarDocx');

  let expedientesCargados = [];
  let expedienteActivo = null;

  // 1. Cargar expedientes para selector
  async function cargarExpedientes() {
    try {
      const res = await apiFetch('/expedientes');
      expedientesCargados = Array.isArray(res) ? res : (res.data || []);

      const opts = '<option value="">— Sin expediente vinculado —</option>' +
        expedientesCargados.map((e) => `<option value="${e._id}">Exp. ${e.caratula.slice(0, 45)}</option>`).join('');

      if (selectExpediente) selectExpediente.innerHTML = opts;
      if (selectGuardarExpediente) selectGuardarExpediente.innerHTML = opts;

      // Si viene ?expedienteId= en URL
      const params = new URLSearchParams(window.location.search);
      const expId = params.get('expedienteId');
      if (expId) {
        if (selectExpediente) selectExpediente.value = expId;
        if (selectGuardarExpediente) selectGuardarExpediente.value = expId;
        vincularExpediente(expId);
      }
    } catch (err) {
      console.warn('[Editor] Error cargando expedientes:', err.message);
    }
  }

  function vincularExpediente(id) {
    expedienteActivo = expedientesCargados.find((e) => e._id === id) || null;
    if (expedienteActivo) {
      badgeExpediente.textContent = `Vinculado: ${expedienteActivo.caratula.slice(0, 30)}...`;
      badgeExpediente.className = 'badge badge-success';
      tituloDocInput.value = `Escrito - ${expedienteActivo.caratula.slice(0, 35)}`;
      inputNombreEscrito.value = `Escrito_${expedienteActivo.numeroCSJ || 'Judicial'}.html`;
    } else {
      badgeExpediente.textContent = 'Sin expediente vinculado';
      badgeExpediente.className = 'badge badge-info';
    }
  }

  if (selectExpediente) {
    selectExpediente.addEventListener('change', (e) => vincularExpediente(e.target.value));
  }

  // 2. Toolbar & Comandos de Edición
  document.querySelectorAll('.tool-btn[data-cmd]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      document.execCommand(cmd, false, null);
      hoja.focus();
    });
  });

  // Estilo de texto (p, h1, h2, h3)
  document.getElementById('selectEstiloTexto')?.addEventListener('change', (e) => {
    document.execCommand('formatBlock', false, `<${e.target.value}>`);
    hoja.focus();
  });

  // Tipografía
  document.getElementById('selectFuente')?.addEventListener('change', (e) => {
    document.execCommand('fontName', false, e.target.value);
    hoja.focus();
  });

  // Tamaño
  document.getElementById('selectTamano')?.addEventListener('change', (e) => {
    document.execCommand('fontSize', false, e.target.value);
    hoja.focus();
  });

  // Membretes rápidos judiciales paraguayos
  document.getElementById('btnMembreteObjeto')?.addEventListener('click', () => {
    document.execCommand('insertHTML', false, '<p style="text-align: right; margin-bottom: 1.5rem;"><strong>OBJETO: PROMOVER DEMANDA ORDINARIA.-</strong></p>');
  });
  document.getElementById('btnMembreteJuez')?.addEventListener('click', () => {
    document.execCommand('insertHTML', false, '<p><strong>SEÑOR JUEZ DE PRIMERA INSTANCIA:</strong></p>');
  });
  document.getElementById('btnMembreteJusticia')?.addEventListener('click', () => {
    document.execCommand('insertHTML', false, '<p style="text-align: right; margin-top: 2.5rem;"><strong>SERÁ JUSTICIA.-</strong></p>');
  });

  // 3. Copiloto IA (LexPY)
  if (btnToggleCopilot) {
    btnToggleCopilot.addEventListener('click', () => {
      copilotPane.classList.toggle('collapsed');
    });
  }
  if (btnCloseCopilot) {
    btnCloseCopilot.addEventListener('click', () => {
      copilotPane.classList.add('collapsed');
    });
  }

  // Chips de sugerencia rápida
  document.querySelectorAll('.btn-chip[data-prompt]').forEach((chip) => {
    chip.addEventListener('click', () => {
      promptInput.value = chip.dataset.prompt;
      promptInput.focus();
    });
  });

  // Guardar última posición del cursor para inserción exacta
  let lastRange = null;
  hoja.addEventListener('keyup', guardarSeleccion);
  hoja.addEventListener('mouseup', guardarSeleccion);

  function guardarSeleccion() {
    const sel = window.getSelection();
    if (sel.getRangeAt && sel.rangeCount) {
      lastRange = sel.getRangeAt(0);
    }
  }

  // Generar con DeepSeek
  if (btnGenerarCopilot) {
    btnGenerarCopilot.addEventListener('click', async () => {
      const instrucciones = promptInput.value.trim();
      if (!instrucciones) {
        alert('Por favor ingresa instrucciones para la redacción.');
        return;
      }

      btnGenerarCopilot.disabled = true;
      btnGenerarCopilot.textContent = '⚡ Redactando con DeepSeek...';
      resultadoBox.style.display = 'block';
      textoGeneradoDiv.textContent = 'Analizando hechos, leyes paraguayas y antecedentes del expediente...';

      try {
        const payload = {
          pregunta: `Redacta para el documento judicial: ${instrucciones}`,
          expediente: expedienteActivo?._id || selectExpediente.value || null,
        };

        const res = await apiFetch('/lexpy/chat', {
          method: 'POST',
          body: payload,
        });

        const borrador = res.data?.respuesta || 'No se obtuvo respuesta del motor.';
        textoGeneradoDiv.textContent = borrador;
      } catch (err) {
        textoGeneradoDiv.textContent = `Error al generar: ${err.message}`;
      } finally {
        btnGenerarCopilot.disabled = false;
        btnGenerarCopilot.textContent = '⚡ Redactar con DeepSeek';
      }
    });
  }

  // Insertar en cursor
  if (btnInsertarEnCursor) {
    btnInsertarEnCursor.addEventListener('click', () => {
      const texto = textoGeneradoDiv.textContent;
      if (!texto) return;

      hoja.focus();
      if (lastRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(lastRange);
      }

      // Convertir saltos de línea a párrafos HTML
      const htmlFormateado = texto
        .split('\n\n')
        .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');

      document.execCommand('insertHTML', false, htmlFormateado);
      alert('¡Texto insertado en el documento!');
    });
  }

  // Reemplazar todo
  if (btnReemplazarTodo) {
    btnReemplazarTodo.addEventListener('click', () => {
      if (!confirm('¿Deseas reemplazar todo el contenido actual del documento?')) return;
      const texto = textoGeneradoDiv.textContent;
      const htmlFormateado = texto
        .split('\n\n')
        .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');
      hoja.innerHTML = htmlFormateado;
    });
  }

  // Copiar borrador
  if (btnCopiarBorrador) {
    btnCopiarBorrador.addEventListener('click', () => {
      navigator.clipboard.writeText(textoGeneradoDiv.textContent);
      btnCopiarBorrador.textContent = '¡Copiado!';
      setTimeout(() => { btnCopiarBorrador.textContent = 'Copiar'; }, 2000);
    });
  }

  // 4. Modal Guardar en Expediente
  if (btnGuardarEnExpediente) {
    btnGuardarEnExpediente.addEventListener('click', () => {
      modalGuardarCaso.style.display = 'flex';
    });
  }
  if (btnCerrarModalGuardar) {
    btnCerrarModalGuardar.addEventListener('click', () => { modalGuardarCaso.style.display = 'none'; });
  }
  if (btnCancelarGuardar) {
    btnCancelarGuardar.addEventListener('click', () => { modalGuardarCaso.style.display = 'none'; });
  }

  if (btnConfirmarGuardarCaso) {
    btnConfirmarGuardarCaso.addEventListener('click', async () => {
      const expId = selectGuardarExpediente.value;
      const nombreDoc = inputNombreEscrito.value.trim() || 'Escrito_Judicial.html';
      if (!expId) {
        alert('Por favor selecciona un expediente.');
        return;
      }

      btnConfirmarGuardarCaso.disabled = true;
      btnConfirmarGuardarCaso.textContent = 'Guardando...';

      try {
        const contenidoHtml = hoja.innerHTML;
        const contenidoBase64 = btoa(unescape(encodeURIComponent(contenidoHtml)));

        await apiFetch(`/expedientes/${expId}/documentos`, {
          method: 'POST',
          body: {
            nombre: nombreDoc.endsWith('.html') ? nombreDoc : `${nombreDoc}.html`,
            tipo: 'text/html',
            tamano: contenidoHtml.length,
            base64: contenidoBase64,
          },
        });

        alert('¡Escrito judicial guardado exitosamente en el expediente!');
        modalGuardarCaso.style.display = 'none';
      } catch (err) {
        alert(`Error al guardar en el caso: ${err.message}`);
      } finally {
        btnConfirmarGuardarCaso.disabled = false;
        btnConfirmarGuardarCaso.textContent = 'Guardar Documento';
      }
    });
  }

  // 5. Descarga de DOCX / DOC
  if (btnDescargarDocx) {
    btnDescargarDocx.addEventListener('click', () => {
      const titulo = tituloDocInput.value.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'Escrito_Judicial';
      const contenidoHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>${titulo}</title>
          <style>
            @page { size: 21cm 29.7cm; margin: 3.5cm 2.2cm 2.5cm 3.5cm; }
            body { font-family: 'Times New Roman', Georgia, serif; font-size: 12pt; text-align: justify; line-height: 1.5; }
            p { margin-bottom: 0.8em; }
          </style>
        </head>
        <body>
          ${hoja.innerHTML}
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', contenidoHtml], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${titulo}.doc`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    });
  }

  // 6. Autosave local cada 15 segundos
  setInterval(() => {
    localStorage.setItem('sysjuridico_editor_draft', hoja.innerHTML);
    localStorage.setItem('sysjuridico_editor_title', tituloDocInput.value);
  }, 15000);

  // Restaurar borrador local si existe
  const borradorPrevio = localStorage.getItem('sysjuridico_editor_draft');
  const tituloPrevio = localStorage.getItem('sysjuridico_editor_title');
  if (borradorPrevio && !window.location.search) {
    hoja.innerHTML = borradorPrevio;
  }
  if (tituloPrevio && !window.location.search) {
    tituloDocInput.value = tituloPrevio;
  }

  cargarExpedientes();
});
