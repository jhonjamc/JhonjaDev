/* ==========================================================
   DATOS DE EJEMPLO
   Cuando tengas Supabase conectado, reemplazá este array por:

   const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
   const { data: proyectos } = await supabase
     .from('proyectos')
     .select('id, plan, estado, fecha_entrega, progreso, clientes(nombre)')
     .order('fecha_entrega', { ascending: true });
   ========================================================== */
const proyectos = [
  { cliente: 'Panadería La Espiga', plan: 'Plan Pro', estado: 'en_curso', entrega: '18 jul 2026', progreso: 65 },
  { cliente: 'Clínica Dental Sonrisa', plan: 'Plan Plus', estado: 'en_curso', entrega: '25 jul 2026', progreso: 30 },
  { cliente: 'Estudio Jurídico Reyes', plan: 'Plan Premium', estado: 'pendiente', entrega: '14 ago 2026', progreso: 0 },
  { cliente: 'Ferretería El Tornillo', plan: 'Plan Pro', estado: 'entregado', entrega: '02 jul 2026', progreso: 100 },
  { cliente: 'Gimnasio PowerFit', plan: 'Plan Plus', estado: 'entregado', entrega: '28 jun 2026', progreso: 100 },
  { cliente: 'Café Andina', plan: 'Plan Pro', estado: 'en_revision', entrega: '15 jul 2026', progreso: 90 },
];

const ESTADOS = {
  pendiente:   { label: 'Pendiente',   badge: 'badge-amber'  },
  en_curso:    { label: 'En curso',    badge: 'badge-blue'   },
  en_revision: { label: 'En revisión', badge: 'badge-violet' },
  entregado:   { label: 'Entregado',   badge: 'badge-green'  },
};

function renderStats() {
  const total = proyectos.length;
  const enCurso = proyectos.filter(p => p.estado === 'en_curso' || p.estado === 'en_revision').length;
  const entregados = proyectos.filter(p => p.estado === 'entregado').length;

  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card"><div class="label">Total proyectos</div><div class="value">${total}</div></div>
    <div class="stat-card"><div class="label">En curso</div><div class="value">${enCurso}</div></div>
    <div class="stat-card"><div class="label">Entregados</div><div class="value">${entregados}</div></div>
  `;
}

function renderTable() {
  const rows = proyectos.map(p => {
    const e = ESTADOS[p.estado];
    return `
      <tr>
        <td class="cell-primary">${p.cliente}</td>
        <td>${p.plan}</td>
        <td><span class="badge ${e.badge}">${e.label}</span></td>
        <td>${p.entrega}</td>
        <td>
          <div class="progress-track"><div class="progress-fill" style="width:${p.progreso}%"></div></div>
        </td>
      </tr>
    `;
  }).join('');
  document.getElementById('proyectosBody').innerHTML = rows;
}

renderStats();
renderTable();

// Logout: cuando conectes Supabase real, reemplazá este handler por
// supabase.auth.signOut() antes de redirigir a Login.
document.getElementById('logoutBtn').addEventListener('click', function (e) {
  // placeholder — sin sesión real todavía
});