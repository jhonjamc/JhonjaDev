// ⚠️ Mismos valores que en Login/login.js — cuando tengas Supabase,
// pegá acá tu URL y anon key real.
const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'TU-ANON-KEY';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ==========================================================
   GUARD DE SESIÓN
   Si no hay sesión activa, no se puede ver este panel.
   Con Supabase real conectado, esto va a funcionar solo.
   Por ahora (sin credenciales reales) esta llamada falla y
   redirige a Login — es el comportamiento esperado.
   ========================================================== */
supabase.auth.getSession().then(({ data }) => {
  if (!data.session) {
    window.location.href = '../Login/login.html';
    return;
  }
  document.getElementById('whoLabel').textContent = 'Hola, ' + (data.session.user.user_metadata?.nombre || data.session.user.email) + ' 👋';
  loadProyecto(data.session.user);
  loadPagos(data.session.user);
});

document.getElementById('logoutBtn').addEventListener('click', async function (e) {
  e.preventDefault();
  await supabase.auth.signOut();
  window.location.href = '../Login/login.html';
});

/* ==========================================================
   DATOS DE EJEMPLO — MI PROYECTO
   Con Supabase conectado:

   const { data: proyecto } = await supabase
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

   const { data: pagos } = await supabase
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