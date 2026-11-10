const { usuario } = requerirSesion();
renderBarraLateral('resumen');

// Reloj en tiempo real para el badge "Actualizado HH:MM a.m./p.m."
function actualizarReloj() {
  const elHora = document.getElementById('valHora');
  if (elHora) {
    const ahora = new Date();
    elHora.textContent = ahora.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
  }
}
setInterval(actualizarReloj, 60000);
actualizarReloj();

let todosLosExpedientes = [];
let vistaFinancieraActiva = false;

// Cargar estadísticas y causas
async function inicializarInicio() {
  try {
    const [expedientes, dashData] = await Promise.all([
      apiFetch('/expedientes'),
      apiFetch('/dashboard').catch(() => null),
    ]);

    todosLosExpedientes = expedientes || [];

    // Cantidades de causas
    const totalCausas = todosLosExpedientes.length;
    const elCausas = document.getElementById('cantCausasActivas');
    if (elCausas) elCausas.textContent = totalCausas;
    const elSeg = document.getElementById('cantSeguimiento');
    if (elSeg) elSeg.textContent = totalCausas;

    // Calcular KPIs
    const hoy = new Date().toDateString();
    const novedadesHoy = todosLosExpedientes.filter((e) => new Date(e.updatedAt || e.createdAt).toDateString() === hoy).length;
    const enCaducidad = todosLosExpedientes.filter((e) => {
      const diasInactivo = (Date.now() - new Date(e.updatedAt || e.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      return diasInactivo > 90 && e.estado !== 'archivado' && e.estado !== 'finalizado';
    }).length;
    const paraImpulsar = todosLosExpedientes.filter((e) => e.estado === 'activo' || e.estado === 'en_proceso').length;

    const elKpiNov = document.getElementById('kpiNovedades');
    if (elKpiNov) elKpiNov.textContent = novedadesHoy;
    const elKpiCad = document.getElementById('kpiCaducidad');
    if (elKpiCad) elKpiCad.textContent = enCaducidad;
    const elKpiPlazos = document.getElementById('kpiPlazos');
    if (elKpiPlazos) elKpiPlazos.textContent = dashData?.plazosPorVencer || 0;
    const elKpiImp = document.getElementById('kpiImpulsar');
    if (elKpiImp) elKpiImp.textContent = paraImpulsar;

    // Actualizaciones recientes (Llevan directo a la Agenda/Calendario al pulsar)
    const zonaAct = document.getElementById('zonaUltimasActuaciones');
    const cantUlt = document.getElementById('cantUltActuaciones');
    if (cantUlt) cantUlt.textContent = novedadesHoy;
    if (zonaAct && novedadesHoy > 0) {
      const recientes = todosLosExpedientes.slice(0, 4);
      zonaAct.innerHTML = recientes
        .map(
          (e) => `
          <div onclick="window.location.href='/agenda.html'" style="background:#0f172a; padding:10px 14px; border-radius:8px; margin-bottom:8px; text-align:left; border:1px solid #1e293b; cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='#1e293b'" onmouseout="this.style.background='#0f172a'" title="Haga clic para ver en el Calendario Judicial">
            <div style="font-weight:600; font-size:0.86rem; color:#fff; display:flex; justify-content:space-between; align-items:center;">
              <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:80%;">${e.caratula}</span>
              <span style="font-size:0.75rem; color:#60a5fa; font-weight:600;">📅 Ver &rarr;</span>
            </div>
            <div style="font-size:0.75rem; color:var(--texto-muted); margin-top:3px;">${e.ultimaActuacionTexto || 'Actuación procesal'} &bull; ${formatoFecha(e.updatedAt || e.createdAt)}</div>
          </div>
        `
        )
        .join('');
    }

    // Datos del Centro Financiero (si están disponibles)
    if (dashData) {
      if (document.getElementById('mExpedientes')) document.getElementById('mExpedientes').textContent = dashData.expedientesActivos;
      if (document.getElementById('mSaldo')) document.getElementById('mSaldo').textContent = formatoGs(dashData.saldoPorCobrar);
      if (document.getElementById('mDiario')) document.getElementById('mDiario').textContent = formatoGs(dashData.ingresoDiario);
      if (document.getElementById('mMensual')) document.getElementById('mMensual').textContent = formatoGs(dashData.ingresoMensual);

      if (document.getElementById('tablaMovimientos') && dashData.movimientosRecientes) {
        document.getElementById('tablaMovimientos').innerHTML = dashData.movimientosRecientes.length
          ? dashData.movimientosRecientes
              .map(
                (m) => `<tr>
                  <td>${formatoFecha(m.fecha)}</td>
                  <td>${m.concepto}</td>
                  <td>${m.cliente?.nombreCompleto || '-'}</td>
                  <td>${m.expediente?.caratula || '-'}</td>
                  <td><span class="badge ${m.tipo === 'ingreso' ? 'badge-verde' : 'badge-rojo'}">${m.tipo}</span></td>
                  <td>${formatoGs(m.monto)}</td>
                </tr>`
              )
              .join('')
          : '<tr><td colspan="6">Sin movimientos recientes.</td></tr>';
      }
    }

    // Comprobar estado de credenciales CSJ
    verificarEstadoCSJ();
  } catch (err) {
    console.error('[Inicio] Error al inicializar:', err);
  }
}

// Búsqueda con IA en Expedientes del Sistema y CSJ
function manejarBusquedaAI(valor) {
  const dropdown = document.getElementById('dropdownResultadosAI');
  const q = (valor || '').trim().toLowerCase();
  if (!q) {
    dropdown.style.display = 'none';
    return;
  }

  const matches = todosLosExpedientes.filter((e) =>
    `${e.caratula} ${e.numero} ${e.juzgado} ${e.cliente?.nombreCompleto || ''}`.toLowerCase().includes(q)
  );

  let html = '';
  if (matches.length) {
    html = matches
      .slice(0, 6)
      .map(
        (e) => `
        <div class="search-result-item" onclick="seleccionarExpedienteBusqueda('${e._id}')">
          <div style="font-weight:600; color:#fff;">${e.caratula}</div>
          <div style="font-size:0.75rem; color:#94a3b8;">${e.numero ? `Exp. ${e.numero}/${e.ano || '2026'}` : 'S/N'} &bull; ${e.juzgado || 'Juzgado'} &bull; Cliente: ${e.cliente?.nombreCompleto || '-'}</div>
        </div>
      `
      )
      .join('');
  } else {
    html = `
      <div class="search-result-item" onclick="consultarIAExterna('${encodeURIComponent(q)}')">
        <div style="color:#60a5fa;">✨ Consultar en doctrina CSJ y legislación con Techapyrã IA...</div>
        <div style="font-size:0.75rem; color:#94a3b8;">Buscar "${q}" en el acervo jurisprudencial de la CSJ y BACN</div>
      </div>
    `;
  }

  dropdown.innerHTML = html;
  dropdown.style.display = 'block';
}

function seleccionarExpedienteBusqueda(id) {
  document.getElementById('dropdownResultadosAI').style.display = 'none';
  window.location.href = `/expedientes.html`;
}

function consultarIAExterna(q) {
  window.location.href = `/lexpy.html?consulta=${q}`;
}

// Ocultar dropdown al hacer click afuera
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-container-ai')) {
    const dropdown = document.getElementById('dropdownResultadosAI');
    if (dropdown) dropdown.style.display = 'none';
  }
});

// Pensamiento Jurídico & Motivación Forense para Abogados
const FRASES_MOTIVACIONALES = [
  {
    texto: 'Estudia: el derecho se transforma constantemente. Si no sigues sus pasos, serás cada día un poco menos abogado. Piensa: el derecho se aprende estudiando, pero se ejerce pensando. Lucha: tu deber es luchar por el derecho; pero el día en que encuentres en conflicto el derecho con la justicia, lucha por la justicia.',
    autor: 'Eduardo J. Couture, Los Mandamientos del Abogado',
    tema: 'Ética & Ejercicio Profesional',
  },
  {
    texto: 'El abogado debe ser un sembrador de paz y claridad procesal. Quien defiende con verdad ilumina la balanza de la justicia antes de que caiga la espada del juez.',
    autor: 'Piero Calamandrei, Elogio de los Jueces',
    tema: 'Función Social de la Abogacía',
  },
  {
    texto: 'Iustitia est constans et perpetua voluntas ius suum cuique tribuendi: La justicia es la constante y perpetua voluntad de dar a cada uno su derecho.',
    autor: 'Ulpiano, Digesto Romano',
    tema: 'Fundamento Clásico del Derecho',
  },
  {
    texto: 'En el abogado, la rectitud de la conciencia es mil veces más importante que el tesoro de los conocimientos. Primero ser bueno; luego, ser firme; después, ser prudente; la ilustración viene en cuarto lugar; la pericia, en el último.',
    autor: 'Ángel Ossorio y Gallardo, El Alma de la Toga',
    tema: 'Moral Forense',
  },
  {
    texto: 'Ten fe en el derecho como el mejor instrumento para la convivencia humana; en la justicia, como destino normal del derecho; en la paz, como sustitutivo bondadoso de la justicia; y sobre todo, ten fe en la libertad, sin la cual no hay derecho, ni justicia, ni paz.',
    autor: 'Eduardo J. Couture',
    tema: 'Fe en la Justicia & Libertad',
  },
  {
    texto: 'Para ser verdaderamente libres, debemos ser servidores fieles de la ley.',
    autor: 'Marco Tulio Cicerón, Pro Cluentio',
    tema: 'Estado de Derecho',
  },
  {
    texto: 'Pon la moral por encima de las leyes; la justicia, por encima del éxito; la verdad, por encima de los aplausos.',
    autor: 'Máxima Forense de Deontología Jurídica',
    tema: 'Integridad Profesional',
  },
  {
    texto: 'Tolera la verdad ajena en la misma medida en que quieres que sea tolerada la tuya. Ten paciencia: el tiempo se venga de las cosas que se hacen sin su colaboración.',
    autor: 'Eduardo J. Couture',
    tema: 'Paciencia Procesal & Tolerancia',
  },
];
let fraseActualIndex = Math.floor(Math.random() * FRASES_MOTIVACIONALES.length);

function siguienteFraseMotivacional() {
  fraseActualIndex = (fraseActualIndex + 1) % FRASES_MOTIVACIONALES.length;
  renderFraseMotivacional();
}

function renderFraseMotivacional() {
  const f = FRASES_MOTIVACIONALES[fraseActualIndex];
  const elTexto = document.getElementById('citaTexto');
  const elAutor = document.getElementById('citaAutor');
  const elTema = document.getElementById('citaTema');
  if (elTexto) elTexto.textContent = `"${f.texto}"`;
  if (elAutor) elAutor.textContent = `— ${f.autor}`;
  if (elTema) elTema.textContent = f.tema;
}

// Inicializar la primera frase al cargar
setTimeout(renderFraseMotivacional, 100);

// Acción de click en prioridades para enfocar en el prompt
function enfocarPromptEnAccion(tema) {
  const input = document.getElementById('inputPromptInicio');
  if (input) {
    input.value = `${tema}: `;
    input.focus();
  }
}

// Envío desde la barra de consulta inferior persistente
async function enviarConsultaPromptInicio() {
  const input = document.getElementById('inputPromptInicio');
  const pregunta = input?.value.trim();
  if (!pregunta) return;

  // Redirigir a Techapyrã IA con la consulta preparada
  window.location.href = `/lexpy.html?consulta=${encodeURIComponent(pregunta)}`;
}

// Alternar entre Asistente Jurídico y Centro Financiero
function alternarVistaFinanciera() {
  vistaFinancieraActiva = !vistaFinancieraActiva;
  const vAsistente = document.getElementById('vistaAsistenteJuridico');
  const vFinanzas = document.getElementById('vistaCentroFinanciero');

  if (vistaFinancieraActiva) {
    vAsistente.classList.add('oculto');
    vFinanzas.classList.remove('oculto');
  } else {
    vAsistente.classList.remove('oculto');
    vFinanzas.classList.add('oculto');
  }
}

function alternarMenuHerramientas() {
  const opcion = prompt('Herramientas Rápidas:\n1. Editor Judicial (Google Docs)\n2. Red de Conocimiento (Obsidian Graph)\n3. Liquidación Laboral MTESS\n4. Cartera de Créditos\n5. Ver Centro Financiero\n\nIngresá el número de opción:');
  if (opcion === '1') window.location.href = '/editor.html';
  else if (opcion === '2') window.location.href = '/grafo.html';
  else if (opcion === '3') window.location.href = '/liquidacion.html';
  else if (opcion === '4') window.location.href = '/creditos.html';
  else if (opcion === '5') alternarVistaFinanciera();
}

// CSJ Modal
function abrirModalCSJ() {
  document.getElementById('modalCSJ').classList.remove('oculto');
}
function cerrarModalCSJ() {
  document.getElementById('modalCSJ').classList.add('oculto');
}

async function sincronizarCSJInicio() {
  const u = document.getElementById('csjUsuario').value.trim();
  const p = document.getElementById('csjPassword').value;
  if (!u || !p) return alert('Por favor ingresá tu usuario y contraseña del Portal CSJ.');

  try {
    alert('Conectando de forma segura con el Portal de Gestión Jurisdiccional CSJ...\nIniciando sincronización.');
    await apiFetch('/expedientes/csj/credenciales', {
      method: 'POST',
      body: { usuarioCSJ: u, passwordCSJ: p },
    });
    const resSync = await apiFetch('/expedientes/csj/sincronizar', { method: 'POST' });
    alert(`Sincronización completada exitosamente. Causas actualizadas: ${resSync.totalExpedientesSincronizados || 0}`);
    cerrarModalCSJ();
    inicializarInicio();
  } catch (err) {
    alert('Error al sincronizar con CSJ: ' + err.message);
  }
}

async function verificarEstadoCSJ() {
  try {
    const res = await apiFetch('/expedientes/csj/credenciales');
    if (res.tieneCredenciales) {
      const banner = document.getElementById('bannerCSJ');
      if (banner) {
        banner.style.background = 'linear-gradient(90deg, #065f46 0%, #047857 100%)';
        banner.innerHTML = `
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:1.5rem;">✅</span>
            <div>
              <div style="font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; color:#a7f3d0; font-weight:700;">PORTAL CSJ VINCULADO</div>
              <div style="font-size:0.95rem; font-weight:600; color:#fff;">Sincronización automática de causas y notificaciones activa</div>
            </div>
          </div>
          <button onclick="abrirModalCSJ()" style="background:#059669; border:none; padding:8px 16px; border-radius:6px; color:#fff; font-weight:600; cursor:pointer;">
            ↻ Actualizar CSJ
          </button>
        `;
      }
    }
  } catch {
    // Si no hay credenciales, se mantiene el banner por defecto
  }
}

// Modal Nuevo Expediente desde Inicio (Image 4)
function abrirModalNuevoExpediente() {
  document.getElementById('modalExpediente').classList.remove('oculto');
  if (document.getElementById('eCaratula')) document.getElementById('eCaratula').value = '';
  if (document.getElementById('eNumero')) document.getElementById('eNumero').value = '';
  if (document.getElementById('eAno')) document.getElementById('eAno').value = '2026';
  if (document.getElementById('eJuzgado')) document.getElementById('eJuzgado').value = '';
  if (document.getElementById('eCircunscripcion')) document.getElementById('eCircunscripcion').value = 'Capital';
  if (document.getElementById('eTipoProceso')) document.getElementById('eTipoProceso').value = '';
  if (document.getElementById('eFase')) document.getElementById('eFase').value = 'Inicio';
  if (document.getElementById('eMontoCuantia')) document.getElementById('eMontoCuantia').value = '';
}

function cerrarModalNuevoExpediente() {
  document.getElementById('modalExpediente').classList.add('oculto');
}

async function guardarExpedienteDesdeInicio() {
  const caratula = document.getElementById('eCaratula')?.value.trim();
  if (!caratula) return alert('Por favor, ingresá la Carátula del Expediente.');

  const monto = Number(document.getElementById('eMontoCuantia')?.value) || 0;
  const datos = {
    caratula,
    numero: document.getElementById('eNumero')?.value.trim() || '',
    ano: Number(document.getElementById('eAno')?.value) || 2026,
    juzgado: document.getElementById('eJuzgado')?.value.trim() || '',
    circunscripcion: document.getElementById('eCircunscripcion')?.value.trim() || 'Capital',
    materia: document.getElementById('eMateria')?.value || 'Civil y Comercial',
    tipoProceso: document.getElementById('eTipoProceso')?.value.trim() || '',
    fase: document.getElementById('eFase')?.value.trim() || 'Inicio',
    montoCuantia: monto,
    honorariosTotales: monto,
    creditoAutomatico: document.getElementById('eCreditoAutomatico')?.checked !== false,
    cantidadCuotas: 3,
    frecuenciaCuotas: 'mensual',
    entregaInicial: 0,
  };

  try {
    await apiFetch('/expedientes', { method: 'POST', body: datos });
    alert('Expediente y crédito creados exitosamente.');
    cerrarModalNuevoExpediente();
    inicializarInicio();
  } catch (err) {
    alert('Error al crear expediente: ' + err.message);
  }
}

// Modal Movimiento Financiero
function abrirModalIngreso() {
  document.getElementById('modalIngreso').classList.remove('oculto');
}
function cerrarModalIngreso() {
  document.getElementById('modalIngreso').classList.add('oculto');
}
async function guardarMovimiento() {
  const concepto = document.getElementById('movConcepto')?.value.trim();
  const monto = Number(document.getElementById('movMonto')?.value) || 0;
  if (!concepto || monto <= 0) return alert('Ingresá concepto y monto válido.');

  try {
    await apiFetch('/movimientos', {
      method: 'POST',
      body: {
        tipo: 'ingreso',
        concepto,
        monto,
        metodoPago: 'efectivo',
      },
    });
    cerrarModalIngreso();
    inicializarInicio();
  } catch (err) {
    alert(err.message);
  }
}

inicializarInicio();
