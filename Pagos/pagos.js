/* ==========================================================
   Supabase — se necesita acá solo para poder cerrar sesión
   de verdad con supabaseClient.auth.signOut().
   ========================================================== */
const SUPABASE_URL = 'https://ydpvldprmcllxiifvcmq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkcHZsZHBybWNsbHhpaWZ2Y21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA4OTIsImV4cCI6MjA5OTM4Njg5Mn0.ewRQKowdlHugOSP_ul3C23qHsziLHkZ5_w1J1uBokao';

let supabaseClient = null;
let supabaseReady = false;
try {
  if (window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    supabaseReady = true;
  }
} catch (err) {
  console.warn('Supabase no está listo:', err.message);
}

/* ==========================================================
   DATOS DE EJEMPLO
   Con Supabase + Wompi conectados, esto se reemplaza por:

   const { data: pagos } = await supabaseClient
     .from('pagos')
     .select('id, monto, tipo, estado, referencia_wompi, fecha, clientes(nombre)')
     .order('fecha', { ascending: false });
   ========================================================== */
const pagos = [
  { cliente: 'Panadería La Espiga', concepto: 'Plan Pro — 50% inicial', tipo: 'proyecto', monto: 125000, estado: 'pagado',   fecha: '01 jul 2026' },
  { cliente: 'Panadería La Espiga', concepto: 'Plan Pro — 50% entrega', tipo: 'proyecto', monto: 125000, estado: 'pendiente', fecha: '18 jul 2026' },
  { cliente: 'Clínica Dental Sonrisa', concepto: 'Hosting + dominio anual', tipo: 'hosting', monto: 150000, estado: 'pendiente', fecha: '10 jul 2026' },
  { cliente: 'Ferretería El Tornillo', concepto: 'Plan Pro — pago completo', tipo: 'proyecto', monto: 250000, estado: 'pagado', fecha: '02 jul 2026' },
  { cliente: 'Ferretería El Tornillo', concepto: 'Mantenimiento mensual', tipo: 'mensualidad', monto: 50000, estado: 'pagado', fecha: '08 jul 2026' },
  { cliente: 'Gimnasio PowerFit', concepto: 'Plan Plus — pago completo', tipo: 'proyecto', monto: 450000, estado: 'pagado', fecha: '28 jun 2026' },
  { cliente: 'Gimnasio PowerFit', concepto: 'Hosting + dominio anual', tipo: 'hosting', monto: 150000, estado: 'vencido', fecha: '05 jul 2026' },
  { cliente: 'Café Andina', concepto: 'Plan Pro — 50% inicial', tipo: 'proyecto', monto: 125000, estado: 'pagado', fecha: '01 jul 2026' },
];

const ESTADOS = {
  pagado:    { label: 'Pagado',    badge: 'badge-green' },
  pendiente: { label: 'Pendiente', badge: 'badge-amber' },
  vencido:   { label: 'Vencido',   badge: 'badge-red'   },
};
const TIPOS = {
  proyecto:     { label: 'Proyecto',     badge: 'badge-blue'   },
  hosting:      { label: 'Hosting',      badge: 'badge-violet' },
  mensualidad:  { label: 'Mensualidad',  badge: 'badge-amber'  },
};

function fmt(n) {
  return '$' + n.toLocaleString('es-CO');
}

function renderStats() {
  const pagado = pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + p.monto, 0);
  const pendiente = pagos.filter(p => p.estado === 'pendiente').reduce((s, p) => s + p.monto, 0);
  const hostingVencido = pagos.filter(p => p.tipo === 'hosting' && p.estado !== 'pagado').length;

  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card"><div class="label">Ganado (pagado)</div><div class="value">${fmt(pagado)}</div></div>
    <div class="stat-card"><div class="label">Pendiente de cobro</div><div class="value">${fmt(pendiente)}</div></div>
    <div class="stat-card"><div class="label">Hosting sin pagar</div><div class="value">${hostingVencido} <small>cliente(s)</small></div></div>
  `;
}

function renderTable() {
  const rows = pagos.map(p => {
    const e = ESTADOS[p.estado];
    const t = TIPOS[p.tipo];
    return `
      <tr>
        <td class="cell-primary">${p.cliente}</td>
        <td>${p.concepto}</td>
        <td><span class="badge ${t.badge}">${t.label}</span></td>
        <td class="cell-primary">${fmt(p.monto)}</td>
        <td><span class="badge ${e.badge}">${e.label}</span></td>
        <td>${p.fecha}</td>
      </tr>
    `;
  }).join('');
  document.getElementById('pagosBody').innerHTML = rows;
}

renderStats();
renderTable();

/* ---- logout real: cierra la sesión de Supabase y va a Index ---- */
document.getElementById('logoutBtn').addEventListener('click', async function (e) {
  e.preventDefault();
  if (supabaseReady) await supabaseClient.auth.signOut();
  window.location.href = '../Index/index.html';
});