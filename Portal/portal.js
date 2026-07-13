const SUPABASE_URL = 'https://ydpvldprmcllxiifvcmq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkcHZsZHBybWNsbHhpaWZ2Y21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA4OTIsImV4cCI6MjA5OTM4Njg5Mn0.ewRQKowdlHugOSP_ul3C23qHsziLHkZ5_w1J1uBokao';
const ADMIN_EMAIL = 'jhonjamoguea@icloud.com';

let supabaseClient = null;
let supabaseReady = false;
try {
  if (!window.supabase) throw new Error('SDK de Supabase no cargó.');
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  supabaseReady = true;
} catch (err) {
  console.warn('Supabase no está listo:', err.message);
}

const ESTADOS_PROYECTO = {
  pendiente:   { label: 'Pendiente',   badge: 'badge-amber'  },
  en_curso:    { label: 'En curso',    badge: 'badge-blue'   },
  en_revision: { label: 'En revisión', badge: 'badge-violet' },
  entregado:   { label: 'Entregado',   badge: 'badge-green'  },
};
const ESTADOS_PAGO = {
  pagado:    { label: 'Pagado',    badge: 'badge-green' },
  pendiente: { label: 'Pendiente', badge: 'badge-amber' },
  vencido:   { label: 'Vencido',   badge: 'badge-red'   },
};

function fmt(n) { return '$' + Number(n || 0).toLocaleString('es-CO'); }

let miClienteId = null;

/* ---- guard de sesión + saber quién sos ---- */
if (!supabaseReady) {
  window.location.href = '../Login/login.html';
} else {
  init();
}

async function init() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = '../Login/login.html';
    return;
  }
  if ((data.session.user.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    window.location.href = '../Proyectos/proyectos.html';
    return;
  }

  document.getElementById('whoLabel').textContent =
    'Hola, ' + (data.session.user.user_metadata?.nombre || data.session.user.email) + ' 👋';

  const { data: cliente, error: clienteError } = await supabaseClient
    .from('clientes')
    .select('id')
    .eq('user_id', data.session.user.id)
    .single();

  if (clienteError || !cliente) {
    console.error('No se encontró la fila de cliente:', clienteError);
    return;
  }
  miClienteId = cliente.id;

  loadProyecto();
  loadPagos();
}

document.getElementById('logoutBtn').addEventListener('click', async function (e) {
  e.preventDefault();
  if (supabaseReady) await supabaseClient.auth.signOut();
  window.location.href = '../Index/index.html';
});

/* ---- mi proyecto (real) ---- */
async function loadProyecto() {
  const { data: proyecto, error } = await supabaseClient
    .from('proyectos')
    .select('plan, estado, fecha_entrega, progreso')
    .eq('cliente_id', miClienteId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const card = document.querySelector('.project-card');

  if (error) {
    console.error('Error cargando el proyecto:', error);
    card.innerHTML = '<p>No se pudo cargar tu proyecto. Probá de nuevo más tarde.</p>';
    return;
  }

  if (!proyecto) {
    card.innerHTML = `
      <p style="color:var(--text-2); font-size:14px; line-height:1.6;">
        Todavía no tenés un proyecto asignado. Si ya nos contactaste, estamos por confirmarte los detalles —
        si no, podés <a href="../Index/index.html#contacto" style="color:var(--blue);">escribirnos acá</a>.
      </p>
    `;
    return;
  }

  const e = ESTADOS_PROYECTO[proyecto.estado] || ESTADOS_PROYECTO.pendiente;
  const entrega = proyecto.fecha_entrega
    ? new Date(proyecto.fecha_entrega + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'A confirmar';

  document.getElementById('projPlan').textContent = proyecto.plan || '—';
  document.getElementById('projEstado').textContent = e.label;
  document.getElementById('projEstado').className = 'badge ' + e.badge;
  document.getElementById('projProgress').style.width = (proyecto.progreso || 0) + '%';
  document.getElementById('projEntrega').textContent = entrega;
  document.getElementById('projPct').textContent = (proyecto.progreso || 0) + '%';
}

/* ---- mis pagos (real) ---- */
async function loadPagos() {
  const { data: pagos, error } = await supabaseClient
    .from('pagos')
    .select('concepto, monto, estado, fecha')
    .eq('cliente_id', miClienteId)
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error cargando pagos:', error);
    document.getElementById('pagosBody').innerHTML = `<tr><td colspan="4">No se pudieron cargar tus pagos.</td></tr>`;
    return;
  }

  renderResumenPendiente(pagos || []);

  if (!pagos || pagos.length === 0) {
    document.getElementById('pagosBody').innerHTML = `<tr><td colspan="4">Todavía no tenés pagos registrados.</td></tr>`;
    return;
  }

  const rows = pagos.map(p => {
    const e = ESTADOS_PAGO[p.estado] || ESTADOS_PAGO.pendiente;
    return `
      <tr>
        <td class="cell-primary">${p.concepto || '—'}</td>
        <td>${fmt(p.monto)}</td>
        <td><span class="badge ${e.badge}">${e.label}</span></td>
        <td>${p.fecha || '—'}</td>
      </tr>
    `;
  }).join('');
  document.getElementById('pagosBody').innerHTML = rows;
}

function renderResumenPendiente(pagos) {
  const pendientes = pagos.filter(p => p.estado !== 'pagado');
  const totalPendiente = pendientes.reduce((s, p) => s + Number(p.monto || 0), 0);
  const proximo = pendientes
    .filter(p => p.fecha)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))[0];

  const resumen = document.getElementById('pagosResumen');

  if (pendientes.length === 0) {
    resumen.innerHTML = `
      <div class="resumen-card">
        <div class="label">Pendiente por pagar</div>
        <div class="value" style="color:var(--green)">$0 <small>Estás al día</small></div>
      </div>
    `;
    return;
  }

  const fechaProxima = proximo?.fecha
    ? new Date(proximo.fecha + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  resumen.innerHTML = `
    <div class="resumen-card alerta">
      <div class="label">Pendiente por pagar</div>
      <div class="value">${fmt(totalPendiente)} <small>${pendientes.length} pago(s)</small></div>
    </div>
    <div class="resumen-card">
      <div class="label">Próximo pago</div>
      <div class="value">${proximo ? fmt(proximo.monto) : '—'} <small>${proximo ? proximo.concepto + ' · ' + fechaProxima : 'Sin fecha definida'}</small></div>
    </div>
  `;
}

/* ---- modal: solicitar servicio adicional ---- */
const servicioOverlay = document.getElementById('servicioOverlay');
const servicioForm = document.getElementById('servicioForm');
const servicioError = document.getElementById('servicioError');
const servicioSuccess = document.getElementById('servicioSuccess');
const servicioSubmitBtn = document.getElementById('servicioSubmitBtn');

document.getElementById('btnSolicitarServicio').addEventListener('click', () => {
  servicioForm.style.display = 'block';
  servicioForm.reset();
  servicioError.classList.remove('show');
  servicioSuccess.style.display = 'none';
  servicioOverlay.classList.add('show');
});
document.getElementById('servicioClose').addEventListener('click', () => servicioOverlay.classList.remove('show'));
servicioOverlay.addEventListener('click', (e) => { if (e.target === servicioOverlay) servicioOverlay.classList.remove('show'); });

servicioForm.addEventListener('submit', async function (e) {
  e.preventDefault();
  servicioError.classList.remove('show');

  if (!supabaseReady || !miClienteId) {
    servicioError.textContent = 'No se pudo conectar. Probá de nuevo en un momento.';
    servicioError.classList.add('show');
    return;
  }

  servicioSubmitBtn.disabled = true;
  servicioSubmitBtn.textContent = 'Enviando…';

  const tipo = document.getElementById('servicioTipo').value;
  const detalle = document.getElementById('servicioDetalle').value.trim();

  try {
    const { error: insertError } = await supabaseClient.from('solicitudes_servicio').insert({
      cliente_id: miClienteId,
      servicio: tipo,
      detalle: detalle,
      estado: 'pendiente',
    });
    if (insertError) throw insertError;

    servicioForm.style.display = 'none';
    servicioSuccess.style.display = 'block';
  } catch (err) {
    console.error('Error enviando la solicitud:', err);
    servicioError.textContent = 'No se pudo enviar la solicitud. Probá de nuevo.';
    servicioError.classList.add('show');
  } finally {
    servicioSubmitBtn.disabled = false;
    servicioSubmitBtn.textContent = 'Enviar solicitud';
  }
});