const SUPABASE_URL = 'https://ydpvldprmcllxiifvcmq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkcHZsZHBybWNsbHhpaWZ2Y21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA4OTIsImV4cCI6MjA5OTM4Njg5Mn0.ewRQKowdlHugOSP_ul3C23qHsziLHkZ5_w1J1uBokao';
const ADMIN_EMAIL = 'jhonjamoguea@icloud.com';

let supabaseClient = null;
try {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
  console.error('No se pudo iniciar Supabase:', err.message);
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

/* ---- registrar un pago nuevo (manual) ---- */
async function registrarPago() {
  const { data: clientes, error } = await supabaseClient.from('clientes').select('id, nombre').order('nombre');
  if (error || !clientes || clientes.length === 0) { alert('No hay clientes cargados todavía.'); return; }

  const listado = clientes.map((c, i) => `${i + 1}. ${c.nombre || '(sin nombre)'}`).join('\n');
  const seleccion = prompt(`¿A qué cliente le registrás el pago? Escribí el número:\n\n${listado}`);
  if (seleccion === null) return;
  const cliente = clientes[parseInt(seleccion, 10) - 1];
  if (!cliente) { alert('Número inválido.'); return; }

  const concepto = prompt('Concepto (ej: "Plan Pro — 50% inicial", "Hosting anual", "Integración WhatsApp"):');
  if (concepto === null || !concepto.trim()) return;

  const montoRaw = prompt('Monto (solo números):');
  if (montoRaw === null) return;
  const monto = parseInt(montoRaw.replace(/\D/g, ''), 10);
  if (!monto) { alert('Monto inválido.'); return; }

  const tipo = prompt('Tipo (proyecto / hosting / mensualidad / servicio_adicional):', 'proyecto');
  if (tipo === null) return;

  const metodo_pago = prompt('Forma de pago (transferencia / efectivo / wompi / otro):', 'transferencia');
  if (metodo_pago === null) return;

  const estado = prompt('Estado (pagado / pendiente / vencido):', 'pagado');
  if (estado === null) return;

  const { error: insertError } = await supabaseClient.from('pagos').insert({
    cliente_id: cliente.id,
    concepto: concepto.trim(),
    monto,
    tipo: tipo.trim(),
    metodo_pago: metodo_pago.trim(),
    estado: estado.trim(),
    fecha: today(),
  });

  if (insertError) { console.error(insertError); alert('No se pudo registrar el pago.'); return; }
  loadPagos();
  loadCartera();
}

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

async function registrarGasto() {
  const concepto = prompt('Concepto del gasto (ej: "Dominio jhonja.dev", "Suscripción a herramienta X"):');
  if (concepto === null || !concepto.trim()) return;

  const montoRaw = prompt('Monto (solo números):');
  if (montoRaw === null) return;
  const monto = parseInt(montoRaw.replace(/\D/g, ''), 10);
  if (!monto) { alert('Monto inválido.'); return; }

  const categoria = prompt('Categoría (herramientas / hosting / marketing / otro):', 'otro');
  if (categoria === null) return;

  const { error } = await supabaseClient.from('gastos').insert({
    concepto: concepto.trim(),
    monto,
    categoria: categoria.trim(),
    fecha: today(),
  });

  if (error) { console.error(error); alert('No se pudo registrar el gasto.'); return; }
  loadGastos();
}

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
  const ok = await checkAdminAccess();
  if (!ok) return;
  await loadGastos();
  await loadPagos();
  await loadCartera();
})();

document.getElementById('btnRegistrarPago').addEventListener('click', registrarPago);
document.getElementById('btnRegistrarGasto').addEventListener('click', registrarGasto);

document.getElementById('logoutBtn').addEventListener('click', async function (e) {
  e.preventDefault();
  await supabaseClient.auth.signOut();
  window.location.href = '../Index/index.html';
});