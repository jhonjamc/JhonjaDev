// ⚠️ Mismos valores que en Login/login.js — cuando tengas Supabase,
// pegá acá tu URL y anon key real.
const SUPABASE_URL = 'https://ydpvldprmcllxiifvcmq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkcHZsZHBybWNsbHhpaWZ2Y21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA4OTIsImV4cCI6MjA5OTM4Njg5Mn0.ewRQKowdlHugOSP_ul3C23qHsziLHkZ5_w1J1uBokao';

/* ==========================================================
   ⚠️ Importante: la variable NO se llama "supabase" porque el
   SDK del CDN (<script src=".../supabase-js@2">) ya crea una
   variable global con ese nombre. Si acá también se declara
   "let supabase", el navegador tira:
   "Identifier 'supabase' has already been declared"
   y se rompe TODO el script de la página (por eso nada andaba).
   ========================================================== */
// ⚠️ Mismo email que en Login/login.js y en schema.sql
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

/* ==========================================================
   GUARD DE SESIÓN
   Con Supabase real conectado, sin sesión te manda a Login.
   Si Supabase todavía no está configurado, se muestra el panel
   igual con datos de ejemplo (modo demo) para que puedas ver
   el diseño mientras terminás la conexión.
   ========================================================== */
if (supabaseReady) {
  supabaseClient.auth.getSession().then(({ data }) => {
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
    loadProyecto();
    loadPagos();
  });
} else {
  document.getElementById('whoLabel').textContent = 'Hola 👋 (modo demo)';
  loadProyecto();
  loadPagos();
}
document.getElementById('logoutBtn').addEventListener('click', async function (e) {
  e.preventDefault();
  if (supabaseReady) await supabaseClient.auth.signOut();
  window.location.href = '../Index/index.html';
});

/* ==========================================================
   DATOS DE EJEMPLO — MI PROYECTO
   Con Supabase conectado:

   const { data: proyecto } = await supabaseClient
     .from('proyectos')
     .select('plan, estado, fecha_entrega, progreso, clientes(nombre)')
     .eq('cliente_id', clienteIdDelUsuarioLogueado)
     .single();

   `clienteIdDelUsuarioLogueado` sale de tu tabla `clientes`
   filtrando por user_id = auth.uid() (ver el trigger que dejé
   comentado en Login/login.js).
   ========================================================== */
const ESTADOS_PROYECTO = {
  pendiente:   { label: 'Pendiente',   badge: 'badge-amber'  },
  en_curso:    { label: 'En curso',    badge: 'badge-blue'   },
  en_revision: { label: 'En revisión', badge: 'badge-violet' },
  entregado:   { label: 'Entregado',   badge: 'badge-green'  },
};

function loadProyecto() {
  const proyecto = { plan: 'Plan Plus', estado: 'en_curso', entrega: '25 jul 2026', progreso: 30 };
  const e = ESTADOS_PROYECTO[proyecto.estado];

  document.getElementById('projPlan').textContent = proyecto.plan;
  document.getElementById('projEstado').textContent = e.label;
  document.getElementById('projEstado').className = 'badge ' + e.badge;
  document.getElementById('projProgress').style.width = proyecto.progreso + '%';
  document.getElementById('projEntrega').textContent = proyecto.entrega;
  document.getElementById('projPct').textContent = proyecto.progreso + '%';
}

/* ==========================================================
   DATOS DE EJEMPLO — MIS PAGOS
   Con Supabase conectado:

   const { data: pagos } = await supabaseClient
     .from('pagos')
     .select('concepto, monto, estado, fecha')
     .eq('cliente_id', clienteIdDelUsuarioLogueado)
     .order('fecha', { ascending: false });
   ========================================================== */
const ESTADOS_PAGO = {
  pagado:    { label: 'Pagado',    badge: 'badge-green' },
  pendiente: { label: 'Pendiente', badge: 'badge-amber' },
};

function fmt(n) { return '$' + n.toLocaleString('es-CO'); }

function loadPagos() {
  const pagos = [
    { concepto: 'Plan Plus — 50% inicial', monto: 225000, estado: 'pagado', fecha: '01 jul 2026' },
    { concepto: 'Plan Plus — 50% entrega', monto: 225000, estado: 'pendiente', fecha: '25 jul 2026' },
    { concepto: 'Hosting + dominio anual', monto: 150000, estado: 'pendiente', fecha: '10 jul 2026' },
  ];

  const rows = pagos.map(p => {
    const e = ESTADOS_PAGO[p.estado];
    return `
      <tr>
        <td class="cell-primary">${p.concepto}</td>
        <td>${fmt(p.monto)}</td>
        <td><span class="badge ${e.badge}">${e.label}</span></td>
        <td>${p.fecha}</td>
      </tr>
    `;
  }).join('');
  document.getElementById('pagosBody').innerHTML = rows;
}