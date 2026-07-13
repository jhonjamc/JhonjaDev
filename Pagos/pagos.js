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
    <div class="stat-card skeleton"></div>
  `;
  document.getElementById('pagosBody').innerHTML = `<tr><td colspan="7">Cargando movimientos…</td></tr>`;
  document.getElementById('gastosBody').innerHTML = `<tr><td colspan="4">Cargando…</td></tr>`;
  document.getElementById('carteraBody').innerHTML = `<tr><td colspan="4">Cargando…</td></tr>`;
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

const ESTADOS_PAGO = {
  pagado:    { label: 'Pagado',    badge: 'badge-green' },
  pendiente: { label: 'Pendiente', badge: 'badge-amber' },
  vencido:   { label: 'Vencido',   badge: 'badge-red'   },
};
const TIPOS = {
  proyecto:          { label: 'Proyecto',          badge: 'badge-blue'   },
  hosting:           { label: 'Hosting',           badge: 'badge-violet' },
  mensualidad:       { label: 'Mensualidad',       badge: 'badge-amber'  },
  servicio_adicional:{ label: 'Servicio adicional',badge: 'badge-violet' },
};

let pagosCache = [];

/* ---- movimientos (pagos) ---- */
async function loadPagos() {
  const { data: pagos, error } = await supabaseClient
    .from('pagos')
    .select('id, concepto, monto, tipo, estado, metodo_pago, fecha, clientes(nombre)')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error cargando pagos:', error);
    document.getElementById('pagosBody').innerHTML = `<tr><td colspan="7">No se pudieron cargar los pagos.</td></tr>`;
    return;
  }

  pagosCache = pagos || [];
  renderResumenFinanciero();
  renderPagos();
}

function renderResumenFinanciero() {
  const ganado = pagosCache.filter(p => p.estado === 'pagado').reduce((s, p) => s + Number(p.monto || 0), 0);
  const porCobrar = pagosCache.filter(p => p.estado !== 'pagado').reduce((s, p) => s + Number(p.monto || 0), 0);
  const gastos = gastosCache.reduce((s, g) => s + Number(g.monto || 0), 0);
  const balance = ganado - gastos;

  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card"><div class="label">Ganancias (pagado)</div><div class="value">${fmt(ganado)}</div></div>
    <div class="stat-card"><div class="label">Por cobrar</div><div class="value">${fmt(porCobrar)}</div></div>
    <div class="stat-card"><div class="label">Gastos / inversión</div><div class="value">${fmt(gastos)}</div></div>
    <div class="stat-card"><div class="label">Balance</div><div class="value" style="color:${balance >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt(balance)}</div></div>
  `;
}

function renderPagos() {
  if (pagosCache.length === 0) {
    document.getElementById('pagosBody').innerHTML = `<tr><td colspan="7">Todavía no hay pagos registrados.</td></tr>`;
    return;
  }
  const rows = pagosCache.map(p => {
    const e = ESTADOS_PAGO[p.estado] || ESTADOS_PAGO.pendiente;
    const t = TIPOS[p.tipo] || { label: p.tipo || '—', badge: 'badge-blue' };
    return `
      <tr>
        <td class="cell-primary">${p.clientes?.nombre || '(sin nombre)'}</td>
        <td>${p.concepto || '—'}${p.metodo_pago ? `<span class="cell-sub">${p.metodo_pago}</span>` : ''}</td>
        <td><span class="badge ${t.badge}">${t.label}</span></td>
        <td class="cell-primary">${fmt(p.monto)}</td>
        <td><span class="badge ${e.badge}">${e.label}</span></td>
        <td>${p.fecha || '—'}</td>
        <td><button type="button" class="btn-edit-proyecto" data-id="${p.id}" data-estado="${p.estado}">Cambiar estado</button></td>
      </tr>
    `;
  }).join('');
  document.getElementById('pagosBody').innerHTML = rows;

  document.querySelectorAll('#pagosBody .btn-edit-proyecto').forEach(btn => {
    btn.addEventListener('click', () => cambiarEstadoPago(btn.dataset.id, btn.dataset.estado));
  });
}

async function cambiarEstadoPago(id, estadoActual) {
  const opciones = Object.keys(ESTADOS_PAGO);
  const nuevo = prompt(`Nuevo estado (${opciones.join(' / ')}):`, estadoActual);
  if (nuevo === null) return;
  if (!opciones.includes(nuevo)) { alert('Estado inválido.'); return; }

  const { error } = await supabaseClient.from('pagos').update({ estado: nuevo }).eq('id', id);
  if (error) { console.error(error); alert('No se pudo actualizar.'); return; }
  loadPagos();
}

/* ---- modal: registrar pago ---- */
const pagoOverlay = document.getElementById('pagoOverlay');
const pagoForm = document.getElementById('pagoForm');
const pagoError = document.getElementById('pagoError');
const pagoSubmitBtn = document.getElementById('pagoSubmitBtn');
const pagoClienteSelect = document.getElementById('pagoCliente');

async function abrirModalPago() {
  const { data: clientes, error } = await supabaseClient.from('clientes').select('id, nombre').order('nombre');
  if (error || !clientes || clientes.length === 0) {
    alert('No hay clientes cargados todavía. Convertí un contacto en proyecto primero, desde el panel de Proyectos.');
    return;
  }
  pagoClienteSelect.innerHTML = clientes.map(c => `<option value="${c.id}">${c.nombre || '(sin nombre)'}</option>`).join('');
  pagoForm.reset();
  pagoError.classList.remove('show');
  pagoOverlay.classList.add('show');
}

document.getElementById('btnRegistrarPago').addEventListener('click', abrirModalPago);
document.getElementById('pagoClose').addEventListener('click', () => pagoOverlay.classList.remove('show'));
pagoOverlay.addEventListener('click', (e) => { if (e.target === pagoOverlay) pagoOverlay.classList.remove('show'); });

pagoForm.addEventListener('submit', async function (e) {
  e.preventDefault();
  pagoError.classList.remove('show');
  pagoSubmitBtn.disabled = true;
  pagoSubmitBtn.textContent = 'Registrando…';

  const { error } = await supabaseClient.from('pagos').insert({
    cliente_id: pagoClienteSelect.value,
    concepto: document.getElementById('pagoConcepto').value.trim(),
    monto: parseInt(document.getElementById('pagoMonto').value, 10),
    tipo: document.getElementById('pagoTipo').value,
    metodo_pago: document.getElementById('pagoMetodo').value,
    estado: document.getElementById('pagoEstado').value,
    fecha: today(),
  });

  pagoSubmitBtn.disabled = false;
  pagoSubmitBtn.textContent = 'Registrar pago';

  if (error) {
    console.error(error);
    pagoError.textContent = 'No se pudo registrar el pago. Probá de nuevo.';
    pagoError.classList.add('show');
    return;
  }

  pagoOverlay.classList.remove('show');
  loadPagos();
  loadCartera();
});

/* ---- gastos / inversión ---- */
let gastosCache = [];

async function loadGastos() {
  const { data: gastos, error } = await supabaseClient
    .from('gastos')
    .select('id, concepto, monto, categoria, fecha')
    .order('fecha', { ascending: false });

  if (error) {
    console.error('Error cargando gastos:', error);
    return;
  }
  gastosCache = gastos || [];
  renderGastos();
  renderResumenFinanciero();
}

function renderGastos() {
  const body = document.getElementById('gastosBody');
  if (gastosCache.length === 0) {
    body.innerHTML = `<tr><td colspan="4">Todavía no hay gastos registrados.</td></tr>`;
    return;
  }
  body.innerHTML = gastosCache.map(g => `
    <tr>
      <td class="cell-primary">${g.concepto || '—'}</td>
      <td><span class="badge badge-violet">${g.categoria || 'otro'}</span></td>
      <td>${fmt(g.monto)}</td>
      <td>${g.fecha || '—'}</td>
    </tr>
  `).join('');
}

/* ---- modal: registrar gasto ---- */
const gastoOverlay = document.getElementById('gastoOverlay');
const gastoForm = document.getElementById('gastoForm');
const gastoError = document.getElementById('gastoError');
const gastoSubmitBtn = document.getElementById('gastoSubmitBtn');
const gastoConceptoSelect = document.getElementById('gastoConcepto');
const gastoOtroGroup = document.getElementById('gastoOtroGroup');
const gastoOtroTexto = document.getElementById('gastoOtroTexto');

document.getElementById('btnRegistrarGasto').addEventListener('click', () => {
  gastoForm.reset();
  gastoOtroGroup.style.display = 'none';
  gastoError.classList.remove('show');
  gastoOverlay.classList.add('show');
});
document.getElementById('gastoClose').addEventListener('click', () => gastoOverlay.classList.remove('show'));
gastoOverlay.addEventListener('click', (e) => { if (e.target === gastoOverlay) gastoOverlay.classList.remove('show'); });

gastoConceptoSelect.addEventListener('change', () => {
  const esOtro = gastoConceptoSelect.value === 'otro';
  gastoOtroGroup.style.display = esOtro ? 'block' : 'none';
  gastoOtroTexto.required = esOtro;
});

gastoForm.addEventListener('submit', async function (e) {
  e.preventDefault();
  gastoError.classList.remove('show');

  const opcionSeleccionada = gastoConceptoSelect.options[gastoConceptoSelect.selectedIndex];
  const esOtro = gastoConceptoSelect.value === 'otro';
  const concepto = esOtro ? gastoOtroTexto.value.trim() : gastoConceptoSelect.value;
  const categoria = opcionSeleccionada.dataset.categoria;

  if (esOtro && !concepto) {
    gastoError.textContent = 'Describí de qué gasto se trata.';
    gastoError.classList.add('show');
    return;
  }

  gastoSubmitBtn.disabled = true;
  gastoSubmitBtn.textContent = 'Registrando…';

  const { error } = await supabaseClient.from('gastos').insert({
    concepto,
    monto: parseInt(document.getElementById('gastoMonto').value, 10),
    categoria,
    fecha: today(),
  });

  gastoSubmitBtn.disabled = false;
  gastoSubmitBtn.textContent = 'Registrar gasto';

  if (error) {
    console.error(error);
    gastoError.textContent = 'No se pudo registrar el gasto. Probá de nuevo.';
    gastoError.classList.add('show');
    return;
  }

  gastoOverlay.classList.remove('show');
  loadGastos();
});

/* ---- cartera: total contratado/cobrado por cliente ---- */
async function loadCartera() {
  const { data: pagos, error } = await supabaseClient
    .from('pagos')
    .select('cliente_id, monto, estado, clientes(nombre)');

  if (error) { console.error('Error cargando cartera:', error); return; }

  const porCliente = {};
  (pagos || []).forEach(p => {
    const key = p.cliente_id;
    if (!porCliente[key]) porCliente[key] = { nombre: p.clientes?.nombre || '(sin nombre)', total: 0, pagado: 0, pendiente: 0 };
    const monto = Number(p.monto || 0);
    porCliente[key].total += monto;
    if (p.estado === 'pagado') porCliente[key].pagado += monto;
    else porCliente[key].pendiente += monto;
  });

  const filas = Object.values(porCliente).sort((a, b) => b.total - a.total);
  const body = document.getElementById('carteraBody');
  if (filas.length === 0) {
    body.innerHTML = `<tr><td colspan="4">Todavía no hay pagos para armar la cartera.</td></tr>`;
    return;
  }
  body.innerHTML = filas.map(f => `
    <tr>
      <td class="cell-primary">${f.nombre}</td>
      <td>${fmt(f.total)}</td>
      <td>${fmt(f.pagado)}</td>
      <td>${fmt(f.pendiente)}</td>
    </tr>
  `).join('');
}

/* ---- init ---- */
(async function init() {
  showLoadingSkeleton();
  const ok = await checkAdminAccess();
  if (!ok) return;
  await loadGastos();
  await loadPagos();
  await loadCartera();
})();

document.getElementById('logoutBtn').addEventListener('click', async function (e) {
  e.preventDefault();
  await supabaseClient.auth.signOut();
  window.location.href = '../Index/index.html';
});