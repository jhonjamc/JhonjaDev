const SUPABASE_URL = 'https://ydpvldprmcllxiifvcmq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkcHZsZHBybWNsbHhpaWZ2Y21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA4OTIsImV4cCI6MjA5OTM4Njg5Mn0.ewRQKowdlHugOSP_ul3C23qHsziLHkZ5_w1J1uBokao';
const ADMIN_EMAIL = 'jhonjamoguea@icloud.com';

let supabaseClient = null;
try {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
  console.error('No se pudo iniciar Supabase:', err.message);
}

function showLoadingSkeleton() {
  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card skeleton"></div>
    <div class="stat-card skeleton"></div>
    <div class="stat-card skeleton"></div>
  `;
  document.getElementById('serviciosBody').innerHTML = `<tr><td colspan="6">Cargando solicitudes…</td></tr>`;
}

async function checkAdminAccess() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) { window.location.href = '../Login/login.html'; return false; }
  if ((data.session.user.email || '').toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    window.location.href = '../Portal/portal.html';
    return false;
  }
  return true;
}

function fmt(n) { return '$' + Number(n || 0).toLocaleString('es-CO'); }
function today() { return new Date().toISOString().slice(0, 10); }

const ESTADOS = {
  pendiente:   { label: 'Pendiente',   badge: 'badge-amber'  },
  en_revision: { label: 'En revisión', badge: 'badge-violet' },
  aprobada:    { label: 'Aprobada',    badge: 'badge-blue'   },
  completada:  { label: 'Completada',  badge: 'badge-green'  },
};
const ESTADOS_KEYS = Object.keys(ESTADOS);

let solicitudesCache = [];

async function loadSolicitudes() {
  const { data, error } = await supabaseClient
    .from('solicitudes_servicio')
    .select('id, cliente_id, servicio, monto, estado, fecha, clientes(nombre)')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error cargando solicitudes:', error);
    document.getElementById('serviciosBody').innerHTML = `<tr><td colspan="6">No se pudieron cargar las solicitudes.</td></tr>`;
    return;
  }

  solicitudesCache = data || [];
  renderStats();
  renderTable();
}

function renderStats() {
  const pendientes = solicitudesCache.filter(s => s.estado === 'pendiente').length;
  const enCurso = solicitudesCache.filter(s => s.estado === 'en_revision' || s.estado === 'aprobada').length;
  const valorPotencial = solicitudesCache
    .filter(s => s.estado !== 'completada')
    .reduce((sum, s) => sum + Number(s.monto || 0), 0);

  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card"><div class="label">Pendientes de revisar</div><div class="value">${pendientes}</div></div>
    <div class="stat-card"><div class="label">En curso</div><div class="value">${enCurso}</div></div>
    <div class="stat-card"><div class="label">Valor por cobrar</div><div class="value">${fmt(valorPotencial)}</div></div>
  `;
}

function renderTable() {
  if (solicitudesCache.length === 0) {
    document.getElementById('serviciosBody').innerHTML = `<tr><td colspan="6">Todavía no hay solicitudes.</td></tr>`;
    return;
  }
  const rows = solicitudesCache.map(s => {
    const e = ESTADOS[s.estado] || ESTADOS.pendiente;
    return `
      <tr>
        <td class="cell-primary">${s.clientes?.nombre || '(sin nombre)'}</td>
        <td>${s.servicio || '—'}</td>
        <td>${fmt(s.monto)}</td>
        <td><span class="badge ${e.badge}">${e.label}</span></td>
        <td>${s.fecha || '—'}</td>
        <td>
          <button type="button" class="btn-edit-proyecto" data-id="${s.id}" data-estado="${s.estado}">Cambiar estado</button>
          ${s.estado !== 'completada' ? `<button type="button" class="btn-pagar" data-id="${s.id}" data-cliente="${s.cliente_id}" data-servicio="${s.servicio}" data-monto="${s.monto}">Marcar pagado</button>` : ''}
        </td>
      </tr>
    `;
  }).join('');
  document.getElementById('serviciosBody').innerHTML = rows;

  document.querySelectorAll('.btn-edit-proyecto').forEach(btn => {
    btn.addEventListener('click', () => cambiarEstado(btn.dataset.id, btn.dataset.estado));
  });
  document.querySelectorAll('.btn-pagar').forEach(btn => {
    btn.addEventListener('click', () => marcarPagado(btn.dataset.id, btn.dataset.cliente, btn.dataset.servicio, btn.dataset.monto));
  });
}

async function cambiarEstado(id, estadoActual) {
  const nuevo = prompt(`Nuevo estado (${ESTADOS_KEYS.join(' / ')}):`, estadoActual);
  if (nuevo === null) return;
  if (!ESTADOS_KEYS.includes(nuevo)) { alert('Estado inválido.'); return; }

  const { error } = await supabaseClient.from('solicitudes_servicio').update({ estado: nuevo }).eq('id', id);
  if (error) { console.error(error); alert('No se pudo actualizar.'); return; }
  loadSolicitudes();
}

/* ---- marcar como pagado: registra el pago Y completa la solicitud ---- */
async function marcarPagado(solicitudId, clienteId, servicio, monto) {
  if (!confirm(`¿Confirmás que "${servicio}" ($${Number(monto).toLocaleString('es-CO')}) ya fue pagado?`)) return;

  const metodo_pago = prompt('Forma de pago (transferencia / efectivo / wompi / otro):', 'transferencia');
  if (metodo_pago === null) return;

  const { error: pagoError } = await supabaseClient.from('pagos').insert({
    cliente_id: clienteId,
    concepto: servicio,
    monto: Number(monto),
    tipo: 'servicio_adicional',
    metodo_pago: metodo_pago.trim(),
    estado: 'pagado',
    fecha: today(),
  });
  if (pagoError) { console.error(pagoError); alert('No se pudo registrar el pago.'); return; }

  const { error: solError } = await supabaseClient
    .from('solicitudes_servicio')
    .update({ estado: 'completada' })
    .eq('id', solicitudId);
  if (solError) console.error('Se registró el pago pero no se pudo marcar la solicitud como completada:', solError);

  loadSolicitudes();
}

/* ---- init ---- */
(async function init() {
  showLoadingSkeleton();
  const ok = await checkAdminAccess();
  if (!ok) return;
  loadSolicitudes();
})();

document.getElementById('logoutBtn').addEventListener('click', async function (e) {
  e.preventDefault();
  await supabaseClient.auth.signOut();
  window.location.href = '../Index/index.html';
});