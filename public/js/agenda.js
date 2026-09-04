requerirSesion();
renderBarraLateral('agenda');

let fechaActual = new Date();
let eventosDelMes = [];

async function cargarMes() {
  const anio = fechaActual.getFullYear();
  const mes = fechaActual.getMonth();
  const desde = new Date(anio, mes, 1);
  const hasta = new Date(anio, mes + 1, 0, 23, 59, 59);

  document.getElementById('tituloMes').textContent = fechaActual.toLocaleDateString('es-PY', {
    month: 'long',
    year: 'numeric',
  });

  eventosDelMes = await apiFetch(`/agenda?desde=${desde.toISOString()}&hasta=${hasta.toISOString()}`);
  pintarCalendario(anio, mes);
}

function pintarCalendario(anio, mes) {
  const contenedor = document.getElementById('calendario');
  const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const primerDiaSemana = new Date(anio, mes, 1).getDay();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();

  let html = nombresDias.map((d) => `<div class="cabecera-cal">${d}</div>`).join('');
  for (let i = 0; i < primerDiaSemana; i += 1) html += '<div></div>';

  for (let dia = 1; dia <= diasEnMes; dia += 1) {
    const eventosDelDia = eventosDelMes.filter((e) => new Date(e.fechaInicio).getDate() === dia);
    html += `<div class="dia-cal">
      <div class="numero">${dia}</div>
      ${eventosDelDia
        .map(
          (e) =>
            `<div class="evento" title="${e.titulo}" onclick='verEvento(${JSON.stringify(e)})'>${new Date(e.fechaInicio).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })} ${e.titulo}</div>`
        )
        .join('')}
    </div>`;
  }

  contenedor.innerHTML = html;
}

function verEvento(evento) {
  alert(`${evento.titulo}\nTipo: ${evento.tipo}\nLugar: ${evento.lugar || 'N/D'}\n${evento.descripcion || ''}`);
}

function cambiarMes(delta) {
  fechaActual.setMonth(fechaActual.getMonth() + delta);
  cargarMes();
}

function abrirModalEvento() {
  document.getElementById('modalEvento').classList.remove('oculto');
}
function cerrarModalEvento() {
  document.getElementById('modalEvento').classList.add('oculto');
}

async function guardarEvento() {
  try {
    await apiFetch('/agenda', {
      method: 'POST',
      body: {
        titulo: document.getElementById('evTitulo').value,
        tipo: document.getElementById('evTipo').value,
        fechaInicio: document.getElementById('evFechaInicio').value,
        lugar: document.getElementById('evLugar').value,
        descripcion: document.getElementById('evDescripcion').value,
      },
    });
    cerrarModalEvento();
    cargarMes();
  } catch (err) {
    alert(err.message);
  }
}

cargarMes().catch((err) => alert(err.message));
