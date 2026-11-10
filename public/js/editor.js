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

  // 3. Fórmulas Judiciales Paraguayas
  const selectFormulasCSJ = document.getElementById('selectFormulasCSJ');
  if (selectFormulasCSJ) {
    selectFormulasCSJ.addEventListener('change', (e) => {
      const valor = e.target.value;
      if (!valor) return;
      let htmlInsertar = '';
      switch (valor) {
        case 'objeto':
          htmlInsertar = '<p style="text-align: right; margin-bottom: 1.5rem;"><strong>OBJETO: PROMOVER DEMANDA ORDINARIA.-</strong></p>';
          break;
        case 'juez':
          htmlInsertar = '<p><strong>SEÑOR JUEZ DE PRIMERA INSTANCIA EN LO CIVIL Y COMERCIAL:</strong></p>';
          break;
        case 'abogado':
          htmlInsertar = '<p><strong>ABG. [NOMBRE DEL PROFESIONAL]</strong>, con Matrícula CSJ N° [MATRÍCULA], fijando domicilio procesal en la calle [DIRECCIÓN], respetuosamente digo:</p>';
          break;
        case 'derecho':
          htmlInsertar = '<p><strong>DERECHO:</strong> Fundo la presente acción en las prescripciones de la Ley Nº 1183/85 (Código Civil) y las normas de procedimiento de la Ley Nº 1337/88 (Código Procesal Civil).</p>';
          break;
        case 'petitorio':
          htmlInsertar = '<p><strong>PETITORIO:</strong></p><p>1. Tenerme por presentado y por constituido el domicilio procesal indicado.</p><p>2. Tener por promovida la presente demanda en tiempo y forma, corriendo traslado a la contraparte.</p><p>3. Oportunamente, dictar Sentencia Definitiva haciendo lugar a la pretensión con costas a la contraria.</p>';
          break;
        case 'justicia':
          htmlInsertar = '<p style="text-align: right; margin-top: 2.5rem;"><strong>SERÁ JUSTICIA.-</strong></p>';
          break;
        case 'otrosi':
          htmlInsertar = '<p><strong>OTROSÍ DIGO:</strong> A los efectos procesales correspondientes, manifiesto que dejo expresa reserva de articular las demás defensas y recursos que a mi derecho correspondan.-</p>';
          break;
      }
      if (htmlInsertar) {
        document.execCommand('insertHTML', false, htmlInsertar);
        hoja.focus();
        actualizarEstadisticasTexto();
      }
      selectFormulasCSJ.value = '';
    });
  }

  // 4. Configuración de Márgenes Procesales CSJ
  const selectMargenes = document.getElementById('selectMargenes');
  const indicadorFoja = document.getElementById('indicadorFoja');
  if (selectMargenes) {
    selectMargenes.addEventListener('change', (e) => {
      hoja.classList.remove('margen-estandar', 'margen-estrecho', 'margen-amplio');
      const val = e.target.value;
      if (val === 'estandar') {
        hoja.classList.add('margen-estandar');
        if (indicadorFoja) indicadorFoja.textContent = 'Margen Estándar (2.5cm uniforme) · ~1 foja';
      } else if (val === 'estrecho') {
        hoja.classList.add('margen-estrecho');
        if (indicadorFoja) indicadorFoja.textContent = 'Margen Estrecho (1.5cm uniforme) · ~1 foja';
      } else if (val === 'amplio') {
        hoja.classList.add('margen-amplio');
        if (indicadorFoja) indicadorFoja.textContent = 'Margen Amplio Forense (4.5cm Izq / 4cm Sup) · ~1 foja';
      } else {
        if (indicadorFoja) indicadorFoja.textContent = 'Formato A4 Judicial CSJ (4cm Izq / 3.5cm Sup / 2cm Der / 2.5cm Inf) · ~1 foja';
      }
    });
  }

  // Guías visuales de margen de cosido e impresión
  const btnToggleGuias = document.getElementById('btnToggleGuias');
  if (btnToggleGuias) {
    btnToggleGuias.addEventListener('click', () => {
      hoja.classList.toggle('mostrar-guias');
      btnToggleGuias.classList.toggle('active');
    });
  }

  // 5. Control de Zoom de la Hoja
  const selectZoomHoja = document.getElementById('selectZoomHoja');
  const hojaWrapper = document.getElementById('hojaWrapper');
  const canvasScroller = document.getElementById('canvasScroller');

  function aplicarZoom(val) {
    if (!hojaWrapper) return;
    if (val === 'auto') {
      const anchoDisponible = (canvasScroller ? canvasScroller.clientWidth : window.innerWidth - 420) - 48;
      const factor = Math.min(Math.max(anchoDisponible / 816, 0.65), 1.0);
      hojaWrapper.style.transform = `scale(${factor})`;
    } else {
      const n = parseFloat(val) || 1;
      hojaWrapper.style.transform = n === 1 ? 'none' : `scale(${n})`;
    }
  }

  if (selectZoomHoja) {
    selectZoomHoja.addEventListener('change', (e) => aplicarZoom(e.target.value));
  }
  window.addEventListener('resize', () => {
    if (selectZoomHoja && selectZoomHoja.value === 'auto') {
      aplicarZoom('auto');
    }
  });

  // 6. Contador de palabras, caracteres y fojas
  const contadorTexto = document.getElementById('contadorTexto');
  function actualizarEstadisticasTexto() {
    if (!hoja || !contadorTexto) return;
    const texto = hoja.innerText || '';
    const caracteres = texto.length;
    const palabras = texto.trim() ? texto.trim().split(/\s+/).length : 0;
    const fojasAprox = Math.max(1, Math.ceil(palabras / 250));

    contadorTexto.textContent = `${palabras} ${palabras === 1 ? 'palabra' : 'palabras'} · ${caracteres} caracteres`;
    if (indicadorFoja && !selectMargenes?.value.includes('estandar')) {
      indicadorFoja.textContent = `Formato A4 Judicial CSJ (4cm Izq / 3.5cm Sup / 2cm Der) · ~${fojasAprox} ${fojasAprox === 1 ? 'foja' : 'fojas'}`;
    }
  }

  hoja.addEventListener('input', actualizarEstadisticasTexto);
  setTimeout(actualizarEstadisticasTexto, 100);

  // 7. Copiloto IA (LexPY)
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
