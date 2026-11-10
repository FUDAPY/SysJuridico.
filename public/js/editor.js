document.addEventListener('DOMContentLoaded', async () => {
  const hoja = document.getElementById('hojaEditor');
  const docContainer = document.getElementById('documentContainer');
  const canvasScroller = document.getElementById('canvasScroller');
  const tituloDocInput = document.getElementById('tituloDocumento');
  const badgeExpediente = document.getElementById('badgeExpediente');

  // Sidebar y Pestañas
  const loSidebar = document.getElementById('loSidebar');
  const btnToggleSidebar = document.getElementById('btnToggleSidebar');
  const btnCloseSidebar = document.getElementById('btnCloseSidebar');
  const tabButtons = document.querySelectorAll('.lo-tab-btn');
  const tabPanes = document.querySelectorAll('.sidebar-tab-pane');

  // Copiloto IA
  const selectExpediente = document.getElementById('copilotExpediente');
  const promptInput = document.getElementById('copilotPrompt');
  const btnGenerarCopilot = document.getElementById('btnGenerarCopilot');
  const resultadoBox = document.getElementById('copilotResultadoBox');
  const textoGeneradoDiv = document.getElementById('copilotTextoGenerado');
  const btnInsertarEnCursor = document.getElementById('btnInsertarEnCursor');
  const btnCopiarBorrador = document.getElementById('btnCopiarBorrador');
  const btnDescartarBorrador = document.getElementById('btnDescartarBorrador');
  const boxTextoSeleccionado = document.getElementById('boxTextoSeleccionado');
  const previewSeleccion = document.getElementById('previewSeleccion');
  const checkUsarExpediente = document.getElementById('checkUsarExpediente');
  const checkUsarCSJ = document.getElementById('checkUsarCSJ');

  // Burbuja Flotante de IA
  const floatingAiBubble = document.getElementById('floatingAiBubble');
  const btnBubbleMejorar = document.getElementById('btnBubbleMejorar');
  const btnBubbleFundamentar = document.getElementById('btnBubbleFundamentar');
  const btnBubblePolir = document.getElementById('btnBubblePolir');

  // Modal Guardar
  const btnGuardarEnExpediente = document.getElementById('btnGuardarEnExpediente');
  const modalGuardarCaso = document.getElementById('modalGuardarCaso');
  const btnCerrarModalGuardar = document.getElementById('btnCerrarModalGuardar');
  const btnCancelarGuardar = document.getElementById('btnCancelarGuardar');
  const selectGuardarExpediente = document.getElementById('selectGuardarExpediente');
  const inputNombreEscrito = document.getElementById('inputNombreEscrito');
  const btnConfirmarGuardarCaso = document.getElementById('btnConfirmarGuardarCaso');
  const btnDescargarDocx = document.getElementById('btnDescargarDocx');

  // Barra de Búsqueda
  const loFindbar = document.getElementById('loFindbar');
  const btnCloseFindbar = document.getElementById('btnCloseFindbar');
  const findInput = document.getElementById('findInput');
  const replaceInput = document.getElementById('replaceInput');
  const btnFindNext = document.getElementById('btnFindNext');
  const btnFindPrev = document.getElementById('btnFindPrev');
  const btnReplaceOne = document.getElementById('btnReplaceOne');
  const btnReplaceAll = document.getElementById('btnReplaceAll');

  // Métricas y Zoom
  const statusPaginas = document.getElementById('statusPaginas');
  const statusPalabras = document.getElementById('statusPalabras');
  const sliderZoom = document.getElementById('sliderZoom');
  const labelZoom = document.getElementById('labelZoom');

  let expedientesCargados = [];
  let expedienteActivo = null;
  let ultimaSeleccionTexto = '';
  let ultimoRange = null;
  let accionIAPendiente = 'redactar';

  // =========================================================================
  // 1. GESTIÓN FLUIDA DEL LIENZO A4: CLIC Y ESCRITURA INMEDIATA
  // =========================================================================
  if (hoja) {
    // Si el usuario hace clic en el área blanca de la foja (incluso abajo del texto),
    // garantizar que el cursor se posicione inmediatamente para escribir
    hoja.addEventListener('click', (e) => {
      if (e.target === hoja) {
        const sel = window.getSelection();
        if (!sel.rangeCount || sel.isCollapsed) {
          // Posicionar al final del último párrafo
          const ultElemento = hoja.lastElementChild;
          if (ultElemento) {
            const range = document.createRange();
            range.selectNodeContents(ultElemento);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      }
    });

    // Guardar selección de texto al tipear o seleccionar con el mouse
    const actualizarRango = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        ultimoRange = sel.getRangeAt(0);
        const txt = sel.toString().trim();
        ultimaSeleccionTexto = txt;

        if (txt.length > 3) {
          // Mostrar indicador en sidebar y burbuja flotante
          if (boxTextoSeleccionado && previewSeleccion) {
            boxTextoSeleccionado.style.display = 'block';
            previewSeleccion.textContent = txt.length > 70 ? txt.slice(0, 70) + '...' : txt;
          }
          mostrarBurbujaFlotante(sel);
        } else {
          if (boxTextoSeleccionado) boxTextoSeleccionado.style.display = 'none';
          ocultarBurbujaFlotante();
        }
      }
    };

    hoja.addEventListener('keyup', actualizarRango);
    hoja.addEventListener('mouseup', actualizarRango);
  }

  function mostrarBurbujaFlotante(sel) {
    if (!floatingAiBubble || !sel || !sel.rangeCount) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      ocultarBurbujaFlotante();
      return;
    }
    floatingAiBubble.style.top = `${window.scrollY + rect.top - 40}px`;
    floatingAiBubble.style.left = `${window.scrollX + rect.left + rect.width / 2 - 120}px`;
    floatingAiBubble.classList.add('show');
  }

  function ocultarBurbujaFlotante() {
    if (floatingAiBubble) floatingAiBubble.classList.remove('show');
  }

  // Ocultar burbuja si se hace clic fuera
  document.addEventListener('mousedown', (e) => {
    if (floatingAiBubble && !floatingAiBubble.contains(e.target) && !hoja.contains(e.target)) {
      ocultarBurbujaFlotante();
    }
  });

  // =========================================================================
  // 2. CARGA Y VINCULACIÓN DE EXPEDIENTES DEL CLIENTE
  // =========================================================================
  async function cargarExpedientes() {
    try {
      const res = await apiFetch('/expedientes');
      expedientesCargados = Array.isArray(res) ? res : (res.data || []);

      const opts = '<option value="">— Sin expediente vinculado —</option>' +
        expedientesCargados.map((e) => `<option value="${e._id}">Exp. ${e.caratula.slice(0, 50)}</option>`).join('');

      if (selectExpediente) selectExpediente.innerHTML = opts;
      if (selectGuardarExpediente) selectGuardarExpediente.innerHTML = opts;

      // Parámetro en URL (?expedienteId=...)
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
    const infoCausa = document.getElementById('infoCausaDetalle');

    if (expedienteActivo) {
      badgeExpediente.textContent = `Causa: ${expedienteActivo.caratula.slice(0, 32)}...`;
      badgeExpediente.className = 'badge badge-success';
      tituloDocInput.value = `Escrito - ${expedienteActivo.caratula.slice(0, 35)}`;
      inputNombreEscrito.value = `Escrito_${expedienteActivo.numeroCSJ || expedienteActivo.numero || 'Judicial'}.html`;

      if (infoCausa) {
        const clienteNom = expedienteActivo.cliente?.nombreCompleto || 'Cliente Registrado';
        const clienteCI = expedienteActivo.cliente?.cedula || expedienteActivo.cliente?.ruc || 'S/D';
        infoCausa.innerHTML = `
          <div style="background:var(--bg-hover); padding:10px; border-radius:6px; border:1px solid var(--border-color); font-size:0.8rem; display:flex; flex-direction:column; gap:6px;">
            <div><strong>Carátula:</strong> ${escapeHtml(expedienteActivo.caratula)}</div>
            <div><strong>Juzgado:</strong> ${escapeHtml(expedienteActivo.juzgado || 'Juzgado de 1ra Instancia')}</div>
            <div><strong>Fuero:</strong> ${escapeHtml(expedienteActivo.fuero || 'Civil y Comercial')}</div>
            <div><strong>Cliente:</strong> ${escapeHtml(clienteNom)} (CI: ${escapeHtml(clienteCI)})</div>
            <button class="boton btn-primario btn-sm" id="btnAutocompletarPartes" style="margin-top:8px; justify-content:center; font-size:0.75rem;">
              📥 Autocompletar Comparecencia en la Foja
            </button>
          </div>
        `;

        document.getElementById('btnAutocompletarPartes')?.addEventListener('click', () => {
          autocompletarComparecencia();
        });
      }
    } else {
      badgeExpediente.textContent = 'Sin expediente vinculado';
      badgeExpediente.className = 'badge badge-info';
      if (infoCausa) {
        infoCausa.innerHTML = `
          <p style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 20px 0;">
            Vincula un expediente en el selector superior para ver partes y antecedentes.
          </p>`;
      }
    }
  }

  function autocompletarComparecencia() {
    if (!expedienteActivo) return;
    const clienteNom = expedienteActivo.cliente?.nombreCompleto || '[PARTE ACTORA]';
    const clienteCI = expedienteActivo.cliente?.cedula || expedienteActivo.cliente?.ruc || '[C.I.]';
    const juzgado = expedienteActivo.juzgado || 'PRIMERA INSTANCIA EN LO CIVIL Y COMERCIAL';

    const textoEncabezado = `
      <p style="text-align: right; margin-bottom: 2rem;"><strong>OBJETO: ${escapeHtml(expedienteActivo.caratula.toUpperCase())}.-</strong></p>
      <p><strong>SEÑOR JUEZ DE ${escapeHtml(juzgado.toUpperCase())}:</strong></p>
      <p>&nbsp;</p>
      <p><strong>ABG. [NOMBRE DEL PROFESIONAL]</strong>, con Matrícula CSJ N° [MATRÍCULA], en nombre y representación de <strong>${escapeHtml(clienteNom)}</strong>, con Cédula de Identidad N° ${escapeHtml(clienteCI)}, fijando domicilio procesal en la calle [DIRECCIÓN], a V.S. respetuosamente digo:</p>
      <p>&nbsp;</p>
    `;

    document.execCommand('insertHTML', false, textoEncabezado);
    hoja.focus();
    actualizarMetricas();
  }

  selectExpediente?.addEventListener('change', (e) => vincularExpediente(e.target.value));

  // =========================================================================
  // 3. BARRA DE MENÚS DESPLEGABLES LIBREOFFICE WRITER
  // =========================================================================
  document.querySelectorAll('.lo-menu-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const menuId = 'menu' + btn.dataset.menu.charAt(0).toUpperCase() + btn.dataset.menu.slice(1);
      const menu = document.getElementById(menuId);

      // Cerrar otros menús abiertos
      document.querySelectorAll('.lo-dropdown-menu').forEach((m) => {
        if (m !== menu) m.classList.remove('show');
      });
      document.querySelectorAll('.lo-menu-btn').forEach((b) => {
        if (b !== btn) b.classList.remove('active');
      });

      if (menu) {
        menu.classList.toggle('show');
        btn.classList.toggle('active');
      }
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.lo-dropdown-menu').forEach((m) => m.classList.remove('show'));
    document.querySelectorAll('.lo-menu-btn').forEach((b) => b.classList.remove('active'));
  });

  // Acciones de Menú
  document.getElementById('menuItemNuevo')?.addEventListener('click', () => {
    if (confirm('¿Deseas iniciar un nuevo escrito? Se limpiará el contenido actual.')) {
      hoja.innerHTML = '<p>&nbsp;</p>';
      hoja.focus();
      actualizarMetricas();
    }
  });
  document.getElementById('btnToolbarNuevo')?.addEventListener('click', () => {
    document.getElementById('menuItemNuevo')?.click();
  });

  document.getElementById('menuItemGuardar')?.addEventListener('click', () => {
    abrirModalGuardar();
  });
  document.getElementById('btnToolbarGuardar')?.addEventListener('click', () => {
    abrirModalGuardar();
  });
  btnGuardarEnExpediente?.addEventListener('click', () => {
    abrirModalGuardar();
  });

  document.getElementById('menuItemSaltoPagina')?.addEventListener('click', () => {
    insertarSaltoDePagina();
  });
  document.getElementById('btnInsertarSaltoPagina')?.addEventListener('click', () => {
    insertarSaltoDePagina();
  });

  function insertarSaltoDePagina() {
    const separador = '<div style="page-break-after: always; height: 1px; border-bottom: 2px dashed #94a3b8; margin: 2rem 0; text-align: center; color: #94a3b8; font-size: 10px;" contenteditable="false">— SALTO DE FOJA JUDICIAL —</div><p>&nbsp;</p>';
    document.execCommand('insertHTML', false, separador);
    hoja.focus();
    actualizarMetricas();
  }

  // =========================================================================
  // 4. BARRAS DE HERRAMIENTAS: COMANDOS DE FORMATO EJECUTABLES
  // =========================================================================
  document.querySelectorAll('[data-cmd]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cmd = btn.dataset.cmd;
      document.execCommand(cmd, false, null);
      hoja.focus();
      actualizarMetricas();
    });
  });

  // Estilo de texto (Párrafo, Título 1, etc.)
  document.getElementById('selectEstiloTexto')?.addEventListener('change', (e) => {
    document.execCommand('formatBlock', false, `<${e.target.value}>`);
    hoja.focus();
  });

  // Tipografía
  document.getElementById('selectFuente')?.addEventListener('change', (e) => {
    document.execCommand('fontName', false, e.target.value);
    hoja.focus();
  });

  // Tamaño de Fuente
  document.getElementById('selectTamano')?.addEventListener('change', (e) => {
    document.execCommand('fontSize', false, e.target.value);
    hoja.focus();
  });

  // Interlineado
  document.getElementById('selectInterlineado')?.addEventListener('change', (e) => {
    hoja.style.lineHeight = e.target.value;
  });

  // =========================================================================
  // 5. FÓRMULAS FORENSES CSJ (Inserción Ordenada con Espaciado Judicial)
  // =========================================================================
  const selectFormulasCSJ = document.getElementById('selectFormulasCSJ');
  if (selectFormulasCSJ) {
    selectFormulasCSJ.addEventListener('change', (e) => {
      const valor = e.target.value;
      if (!valor) return;
      insertarFormulaJudicial(valor);
      selectFormulasCSJ.value = '';
    });
  }

  function insertarFormulaJudicial(tipo) {
    let html = '';
    switch (tipo) {
      case 'objeto':
        html = '<p style="text-align: right; margin-bottom: 1.8rem;"><strong>OBJETO: PROMOVER DEMANDA ORDINARIA.-</strong></p><p>&nbsp;</p>';
        break;
      case 'juez':
        html = '<p><strong>SEÑOR JUEZ DE PRIMERA INSTANCIA EN LO CIVIL Y COMERCIAL:</strong></p><p>&nbsp;</p>';
        break;
      case 'abogado':
        html = '<p><strong>ABG. [NOMBRE DEL PROFESIONAL]</strong>, con Matrícula CSJ N° [MATRÍCULA], fijando domicilio procesal en la calle [DIRECCIÓN], a V.S. respetuosamente digo:</p><p>&nbsp;</p>';
        break;
      case 'derecho':
        html = '<p><strong>DERECHO:</strong> Fundo la presente acción en las prescripciones de la Ley Nº 1183/85 (Código Civil) y las reglas de procedimiento de la Ley Nº 1337/88 (Código Procesal Civil).-</p><p>&nbsp;</p>';
        break;
      case 'petitorio':
        html = '<p><strong>PETITORIO:</strong></p><p>1. Tenerme por presentado y por constituido el domicilio procesal indicado.</p><p>2. Tener por promovida la presente demanda en tiempo y forma, corriendo traslado a la parte contraria.</p><p>3. Oportunamente, dictar Sentencia Definitiva haciendo lugar a la pretensión con costas.-</p><p>&nbsp;</p>';
        break;
      case 'justicia':
        html = '<p style="text-align: right; margin-top: 3rem;"><strong>SERÁ JUSTICIA.-</strong></p><p>&nbsp;</p>';
        break;
      case 'otrosi':
        html = '<p><strong>OTROSÍ DIGO:</strong> A los efectos legales pertinentes, manifiesto que dejo expresa reserva de articular las demás defensas y recursos que a mi derecho correspondan.-</p><p>&nbsp;</p>';
        break;
      case 'firma':
        html = '<div style="margin-top: 4rem; text-align: center; width: 260px; margin-left: auto; margin-right: 0;"><div style="border-top: 1px solid #000; padding-top: 4px;"><strong>ABG. [NOMBRE DEL PROFESIONAL]</strong><br>Matrícula CSJ N° [MATRÍCULA]</div></div><p>&nbsp;</p>';
        break;
      case 'fecha':
        const hoy = new Date();
        const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
        const fechaStr = hoy.toLocaleDateString('es-PY', opciones);
        html = `<p style="text-align: right; margin-bottom: 1.5rem;">Asunción, ${fechaStr}.-</p><p>&nbsp;</p>`;
        break;
    }

    if (html) {
      document.execCommand('insertHTML', false, html);
      hoja.focus();
      actualizarMetricas();
    }
  }

  // Atajos de menú para fórmulas
  document.getElementById('menuInsertObjeto')?.addEventListener('click', () => insertarFormulaJudicial('objeto'));
  document.getElementById('menuInsertJuez')?.addEventListener('click', () => insertarFormulaJudicial('juez'));
  document.getElementById('menuInsertDerecho')?.addEventListener('click', () => insertarFormulaJudicial('derecho'));
  document.getElementById('menuInsertPetitorio')?.addEventListener('click', () => insertarFormulaJudicial('petitorio'));
  document.getElementById('menuInsertJusticia')?.addEventListener('click', () => insertarFormulaJudicial('justicia'));
  document.getElementById('menuInsertFirma')?.addEventListener('click', () => insertarFormulaJudicial('firma'));
  document.getElementById('menuInsertFecha')?.addEventListener('click', () => insertarFormulaJudicial('fecha'));

  // =========================================================================
  // 6. MÁRGENES PROCESALES CSJ & GUÍAS VISUALES
  // =========================================================================
  const selectMargenes = document.getElementById('selectMargenes');
  if (selectMargenes) {
    selectMargenes.addEventListener('change', (e) => {
      hoja.classList.remove('margen-estandar', 'margen-estrecho', 'margen-amplio');
      const val = e.target.value;
      if (val === 'estandar') hoja.classList.add('margen-estandar');
      else if (val === 'estrecho') hoja.classList.add('margen-estrecho');
      else if (val === 'amplio') hoja.classList.add('margen-amplio');
      actualizarRuler(val);
    });
  }

  const btnToggleGuias = document.getElementById('btnToggleGuias');
  if (btnToggleGuias) {
    btnToggleGuias.addEventListener('click', () => {
      hoja.classList.toggle('mostrar-guias');
      btnToggleGuias.classList.toggle('active');
    });
  }

  const btnToggleRegla = document.getElementById('btnToggleRegla');
  const rulerContainer = document.getElementById('rulerContainer');
  if (btnToggleRegla && rulerContainer) {
    btnToggleRegla.addEventListener('click', () => {
      const visible = rulerContainer.style.display !== 'none';
      rulerContainer.style.display = visible ? 'none' : 'flex';
      btnToggleRegla.classList.toggle('active', !visible);
    });
  }

  function actualizarRuler(tipoMargen) {
    const ml = document.querySelector('.lo-ruler-margin-left');
    const mr = document.querySelector('.lo-ruler-margin-right');
    if (!ml || !mr) return;

    if (tipoMargen === 'estandar') {
      ml.style.width = '98px';
      ml.textContent = '2.5 cm';
      mr.style.width = '98px';
      mr.textContent = '2.5 cm';
    } else if (tipoMargen === 'estrecho') {
      ml.style.width = '58px';
      ml.textContent = '1.5 cm';
      mr.style.width = '58px';
      mr.textContent = '1.5 cm';
    } else if (tipoMargen === 'amplio') {
      ml.style.width = '175px';
      ml.textContent = '4.5 cm';
      mr.style.width = '98px';
      mr.textContent = '2.5 cm';
    } else {
      // Judicial CSJ oficial
      ml.style.width = '155px';
      ml.textContent = '4.0 cm (Cosido)';
      mr.style.width = '78px';
      mr.textContent = '2.0 cm';
    }
  }

  // =========================================================================
  // 7. ZOOM Y AJUSTE AL ANCHO
  // =========================================================================
  function aplicarZoom(val) {
    if (!docContainer) return;
    if (val === 'auto') {
      const anchoDisp = (canvasScroller ? canvasScroller.clientWidth : window.innerWidth - 400) - 60;
      const factor = Math.min(Math.max(anchoDisp / 816, 0.65), 1.0);
      docContainer.style.transform = `scale(${factor})`;
      if (sliderZoom) sliderZoom.value = Math.round(factor * 100);
      if (labelZoom) labelZoom.textContent = `${Math.round(factor * 100)}%`;
    } else {
      const n = parseFloat(val) || 1;
      docContainer.style.transform = n === 1 ? 'none' : `scale(${n})`;
      if (sliderZoom) sliderZoom.value = Math.round(n * 100);
      if (labelZoom) labelZoom.textContent = `${Math.round(n * 100)}%`;
    }
  }

  document.getElementById('selectZoomHoja')?.addEventListener('change', (e) => aplicarZoom(e.target.value));
  sliderZoom?.addEventListener('input', (e) => aplicarZoom(e.target.value / 100));

  // =========================================================================
  // 8. ASISTENTE IA ULTRARRÁPIDO Y OPTIMIZADO (Bajo Consumo de Tokens)
  // =========================================================================
  // Chips de acción rápida
  document.querySelectorAll('.btn-chip[data-action]').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.btn-chip[data-action]').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      accionIAPendiente = chip.dataset.action;

      if (accionIAPendiente === 'mejorar' || accionIAPendiente === 'polir' || accionIAPendiente === 'fundamentar_csj') {
        if (!ultimaSeleccionTexto) {
          alert('Por favor selecciona primero un texto en la foja de trabajo para realizar esta acción.');
          return;
        }
      }
      ejecutarAsistenteIA(accionIAPendiente);
    });
  });

  // Acciones desde burbuja flotante
  btnBubbleMejorar?.addEventListener('click', () => {
    ocultarBurbujaFlotante();
    abrirSidebarTab('tabCopilot');
    ejecutarAsistenteIA('mejorar');
  });
  btnBubbleFundamentar?.addEventListener('click', () => {
    ocultarBurbujaFlotante();
    abrirSidebarTab('tabCopilot');
    ejecutarAsistenteIA('fundamentar_csj');
  });
  btnBubblePolir?.addEventListener('click', () => {
    ocultarBurbujaFlotante();
    abrirSidebarTab('tabCopilot');
    ejecutarAsistenteIA('polir');
  });

  // Botón Principal de Generación
  btnGenerarCopilot?.addEventListener('click', () => {
    ejecutarAsistenteIA(accionIAPendiente || 'redactar');
  });

  async function ejecutarAsistenteIA(accion) {
    const instrucciones = promptInput ? promptInput.value.trim() : '';
    const expId = expedienteActivo?._id || selectExpediente?.value || null;
    const usarExpediente = checkUsarExpediente ? checkUsarExpediente.checked : true;
    const usarCSJ = checkUsarCSJ ? checkUsarCSJ.checked : true;

    btnGenerarCopilot.disabled = true;
    btnGenerarCopilot.textContent = '⚡ Techapyrã IA redactando...';
    if (resultadoBox) resultadoBox.style.display = 'block';
    if (textoGeneradoDiv) textoGeneradoDiv.textContent = 'Analizando leyes positivas paraguayas, expediente y jurisprudencia CSJ...';

    try {
      const payload = {
        accion,
        textoSeleccionado: ultimaSeleccionTexto,
        instrucciones,
        expedienteId: usarExpediente ? expId : null,
        incluirCSJ: usarCSJ,
      };

      const res = await apiFetch('/lexpy/editor-ai', {
        method: 'POST',
        body: payload,
      });

      const generado = res.data?.textoGenerado || 'No se obtuvo respuesta del motor.';
      if (textoGeneradoDiv) textoGeneradoDiv.textContent = generado;
    } catch (err) {
      if (textoGeneradoDiv) textoGeneradoDiv.textContent = `Error al generar: ${err.message}`;
    } finally {
      btnGenerarCopilot.disabled = false;
      btnGenerarCopilot.textContent = '⚡ Generar con Techapyrã IA';
    }
  }

  // Insertar resultado de IA en la foja
  btnInsertarEnCursor?.addEventListener('click', () => {
    if (!textoGeneradoDiv) return;
    const texto = textoGeneradoDiv.textContent;
    if (!texto) return;

    hoja.focus();
    if (ultimoRange) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(ultimoRange);
    }

    // Convertir saltos de línea en párrafos limpios
    const parrafos = texto
      .split(/\n\s*\n/)
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
      .join('');

    document.execCommand('insertHTML', false, parrafos);
    if (resultadoBox) resultadoBox.style.display = 'none';
    actualizarMetricas();
  });

  btnCopiarBorrador?.addEventListener('click', () => {
    if (!textoGeneradoDiv) return;
    navigator.clipboard.writeText(textoGeneradoDiv.textContent).then(() => {
      btnCopiarBorrador.textContent = '✓ Copiado';
      setTimeout(() => { btnCopiarBorrador.textContent = '📋'; }, 1500);
    });
  });

  btnDescartarBorrador?.addEventListener('click', () => {
    if (resultadoBox) resultadoBox.style.display = 'none';
  });

  // =========================================================================
  // 9. PESTAÑAS DE LA BARRA LATERAL (Expediente, Jurisprudencia, etc.)
  // =========================================================================
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      abrirSidebarTab(btn.dataset.tab);
    });
  });

  function abrirSidebarTab(tabId) {
    if (loSidebar && loSidebar.classList.contains('collapsed')) {
      loSidebar.classList.remove('collapsed');
    }
    tabButtons.forEach((b) => b.classList.toggle('active', b.dataset.tab === tabId));
    tabPanes.forEach((p) => {
      p.style.display = p.id === tabId ? 'block' : 'none';
    });
    if (tabId === 'tabJurisprudencia') cargarJurisprudenciaCSJ();
  }

  btnToggleSidebar?.addEventListener('click', () => {
    loSidebar?.classList.toggle('collapsed');
  });
  btnCloseSidebar?.addEventListener('click', () => {
    loSidebar?.classList.add('collapsed');
  });

  // Búsqueda de Jurisprudencia CSJ en vivo
  async function cargarJurisprudenciaCSJ(termino = '') {
    const lista = document.getElementById('listaJurisprudenciaCSJ');
    if (!lista) return;

    lista.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); text-align:center;">Consultando OtelaxWisdom...</div>';

    try {
      const res = await apiFetch('/obsidian/grafo');
      const data = res?.data || res;
      const nodosCSJ = (data.nodos || []).filter((n) =>
        ['acordada', 'institucion', 'ensenanza', 'codigo'].includes(n.tipo) &&
        (!termino || n.etiqueta.toLowerCase().includes(termino.toLowerCase()) || (n.detalle || '').toLowerCase().includes(termino.toLowerCase()))
      ).slice(0, 10);

      if (!nodosCSJ.length) {
        lista.innerHTML = '<div style="font-size:0.75rem; color:var(--text-muted); text-align:center;">No se encontraron criterios vinculados.</div>';
        return;
      }

      lista.innerHTML = nodosCSJ.map((n) => `
        <div style="background:var(--bg-hover); border:1px solid var(--border-color); border-radius:6px; padding:8px; font-size:0.75rem;">
          <div style="font-weight:700; color:var(--primary); margin-bottom:4px;">${escapeHtml(n.etiqueta)}</div>
          <div style="color:var(--text-secondary); line-height:1.45; margin-bottom:6px;">${escapeHtml((n.detalle || n.contenido || '').slice(0, 220))}...</div>
          <button class="boton btn-secundario btn-sm" onclick="window.insertarJurisprudenciaCSJ('${n.id}')" style="padding:2px 8px; font-size:0.7rem; gap:4px;">
            <span>+</span> Insertar Cita en Foja
          </button>
        </div>
      `).join('');
    } catch (e) {
      lista.innerHTML = `<div style="font-size:0.75rem; color:var(--text-muted);">Error: ${e.message}</div>`;
    }
  }

  window.insertarJurisprudenciaCSJ = async function(id) {
    try {
      const res = await apiFetch('/obsidian/grafo');
      const nodo = (res?.data?.nodos || []).find((n) => n.id === id);
      if (!nodo) return;

      const cita = `
        <blockquote style="margin: 1.2rem 2.5rem; padding-left: 1rem; border-left: 3px solid #3b82f6; font-style: italic; color: #1e293b;">
          "${escapeHtml(nodo.detalle || nodo.contenido || nodo.etiqueta)}"
          <div style="text-align: right; font-style: normal; font-weight: 600; font-size: 0.85em; margin-top: 4px;">
            — Corte Suprema de Justicia del Paraguay (${escapeHtml(nodo.etiqueta)})
          </div>
        </blockquote>
        <p>&nbsp;</p>
      `;

      hoja.focus();
      document.execCommand('insertHTML', false, cita);
      actualizarMetricas();
    } catch (e) {
      alert('Error insertando jurisprudencia: ' + e.message);
    }
  };

  document.getElementById('inputBuscarCSJ')?.addEventListener('input', (e) => {
    cargarJurisprudenciaCSJ(e.target.value.trim());
  });

  // =========================================================================
  // 10. BARRA DE BÚSQUEDA Y REEMPLAZO (Ctrl+F)
  // =========================================================================
  function alternarFindbar() {
    loFindbar?.classList.toggle('show');
    if (loFindbar?.classList.contains('show')) {
      findInput?.focus();
    }
  }

  document.getElementById('menuItemBuscar')?.addEventListener('click', alternarFindbar);
  document.getElementById('btnToolbarBuscar')?.addEventListener('click', alternarFindbar);
  btnCloseFindbar?.addEventListener('click', () => loFindbar?.classList.remove('show'));

  btnFindNext?.addEventListener('click', () => {
    const q = findInput.value.trim();
    if (q) window.find(q, false, false, true, false, false, false);
  });
  btnFindPrev?.addEventListener('click', () => {
    const q = findInput.value.trim();
    if (q) window.find(q, false, true, true, false, false, false);
  });
  btnReplaceOne?.addEventListener('click', () => {
    const q = findInput.value;
    const r = replaceInput.value;
    if (!q) return;
    const sel = window.getSelection();
    if (sel && sel.toString() === q) {
      document.execCommand('insertText', false, r);
    }
    window.find(q, false, false, true, false, false, false);
    actualizarMetricas();
  });
  btnReplaceAll?.addEventListener('click', () => {
    const q = findInput.value;
    const r = replaceInput.value;
    if (!q) return;
    const reg = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    hoja.innerHTML = hoja.innerHTML.replace(reg, escapeHtml(r));
    actualizarMetricas();
  });

  // Atajos de Teclado Globales (Ctrl+S, Ctrl+F, Ctrl+Enter)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      abrirModalGuardar();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      alternarFindbar();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      insertarSaltoDePagina();
    }
  });

  // =========================================================================
  // 11. CONTADOR DE PALABRAS, CARACTERES Y FOJAS
  // =========================================================================
  function actualizarMetricas() {
    if (!hoja) return;
    const texto = hoja.innerText || '';
    const caracteres = texto.length;
    const palabras = texto.trim() ? texto.trim().split(/\s+/).length : 0;
    const fojasAprox = Math.max(1, Math.ceil(palabras / 250));

    if (statusPalabras) {
      statusPalabras.textContent = `${palabras} ${palabras === 1 ? 'palabra' : 'palabras'} · ${caracteres} caracteres`;
    }
    if (statusPaginas) {
      statusPaginas.textContent = `Página 1 de ${fojasAprox} (~${fojasAprox} ${fojasAprox === 1 ? 'foja CSJ' : 'fojas CSJ'})`;
    }
  }

  hoja.addEventListener('input', actualizarMetricas);
  setTimeout(actualizarMetricas, 150);

  // =========================================================================
  // 12. GUARDADO EN EXPEDIENTE Y DESCARGA DOCX
  // =========================================================================
  function abrirModalGuardar() {
    if (!modalGuardarCaso) return;
    modalGuardarCaso.classList.remove('oculto');
    if (expedienteActivo && selectGuardarExpediente) {
      selectGuardarExpediente.value = expedienteActivo._id;
    }
  }

  btnCerrarModalGuardar?.addEventListener('click', () => modalGuardarCaso?.classList.add('oculto'));
  btnCancelarGuardar?.addEventListener('click', () => modalGuardarCaso?.classList.add('oculto'));

  btnConfirmarGuardarCaso?.addEventListener('click', async () => {
    const expId = selectGuardarExpediente?.value;
    const nombre = inputNombreEscrito?.value.trim() || 'Escrito_Judicial.html';

    if (!expId) {
      alert('Por favor selecciona una causa judicial para guardar el escrito.');
      return;
    }

    try {
      btnConfirmarGuardarCaso.disabled = true;
      btnConfirmarGuardarCaso.textContent = 'Guardando...';

      const contenidoHTML = hoja.innerHTML;
      await apiFetch(`/expedientes/${expId}/actuaciones`, {
        method: 'POST',
        body: {
          tipo: 'Escrito Judicial',
          descripcion: `Escrito: ${nombre} redactado en Editor Forense`,
          contenido: contenidoHTML,
        },
      });

      alert('¡Escrito judicial guardado con éxito en el expediente!');
      modalGuardarCaso?.classList.add('oculto');
    } catch (e) {
      alert('Error guardando en el expediente: ' + e.message);
    } finally {
      btnConfirmarGuardarCaso.disabled = false;
      btnConfirmarGuardarCaso.textContent = 'Guardar en Expediente';
    }
  });

  // Exportar .DOCX (Formato HTML descargable como .doc compatible con Microsoft Word y LibreOffice)
  function descargarComoDocx() {
    const titulo = (tituloDocInput?.value.trim() || 'Escrito_Judicial').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const contenidoHTML = hoja.innerHTML;

    const plantillaDoc = `
      <!DOCTYPE html>
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${titulo}</title>
        <style>
          @page {
            size: 21cm 29.7cm;
            margin: 3.5cm 2.0cm 2.5cm 4.0cm; /* Margen Judicial CSJ */
            mso-page-orientation: portrait;
          }
          body {
            font-family: 'Times New Roman', 'Liberation Serif', serif;
            font-size: 12pt;
            line-height: 1.65;
            text-align: justify;
          }
          p { margin-bottom: 0.9em; }
        </style>
      </head>
      <body>
        ${contenidoHTML}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', plantillaDoc], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${titulo}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  btnDescargarDocx?.addEventListener('click', descargarComoDocx);
  document.getElementById('menuItemDocx')?.addEventListener('click', descargarComoDocx);
  document.getElementById('btnToolbarDocx')?.addEventListener('click', descargarComoDocx);

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Inicialización
  await cargarExpedientes();
});
