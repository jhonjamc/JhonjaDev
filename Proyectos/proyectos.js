const SUPABASE_URL = 'https://ydpvldprmcllxiifvcmq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkcHZsZHBybWNsbHhpaWZ2Y21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MTA4OTIsImV4cCI6MjA5OTM4Njg5Mn0.ewRQKowdlHugOSP_ul3C23qHsziLHkZ5_w1J1uBokao';
const ADMIN_EMAIL = 'jhonjamoguea@icloud.com';

let supabaseClient = null;
try {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
  console.error('No se pudo iniciar Supabase:', err.message);
}

const ESTADOS = {
  pendiente:   { label: 'Pendiente',   badge: 'badge-amber'  },
  en_curso:    { label: 'En curso',    badge: 'badge-blue'   },
  en_revision: { label: 'En revisión', badge: 'badge-violet' },
  entregado:   { label: 'Entregado',   badge: 'badge-green'  },
};
const ESTADOS_KEYS = Object.keys(ESTADOS);

/* ---- guard: solo el admin puede ver este panel ---- */
function showLoadingSkeleton() {
  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card skeleton"></div>
    <div class="stat-card skeleton"></div>
    <div class="stat-card skeleton"></div>
  `;
  document.getElementById('proyectosBody').innerHTML = `<tr><td colspan="6">Cargando proyectos…</td></tr>`;
}

async function checkAdminAccess() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = '../Login/login.html';
    return false;
  }
  if ((data.session.user.email || '').toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    window.location.href = '../Portal/portal.html';
    return false;
  }
  return true;
}

/* ---- proyectos: cargar, mostrar, editar progreso/estado ---- */
async function loadProyectos() {
  const { data: proyectos, error } = await supabaseClient
    .from('proyectos')
    .select('id, plan, estado, fecha_entrega, progreso, clientes(nombre)')
    .order('fecha_entrega', { ascending: true });

  if (error) {
    console.error('Error cargando proyectos:', error);
    document.getElementById('proyectosBody').innerHTML =
      `<tr><td colspan="6">No se pudieron cargar los proyectos.</td></tr>`;
    return;
  }

  renderStats(proyectos || []);
  renderProyectos(proyectos || []);
}

function renderStats(proyectos) {
  const total = proyectos.length;
  const enCurso = proyectos.filter(p => p.estado === 'en_curso' || p.estado === 'en_revision').length;
  const entregados = proyectos.filter(p => p.estado === 'entregado').length;

  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card"><div class="label">Total proyectos</div><div class="value">${total}</div></div>
    <div class="stat-card"><div class="label">En curso</div><div class="value">${enCurso}</div></div>
    <div class="stat-card"><div class="label">Entregados</div><div class="value">${entregados}</div></div>
  `;
}

function renderProyectos(proyectos) {
  if (proyectos.length === 0) {
    document.getElementById('proyectosBody').innerHTML =
      `<tr><td colspan="6">Todavía no hay proyectos cargados.</td></tr>`;
    return;
  }

  const rows = proyectos.map(p => {
    const e = ESTADOS[p.estado] || ESTADOS.pendiente;
    const clienteNombre = p.clientes?.nombre || '(sin nombre)';
    const entrega = p.fecha_entrega
      ? new Date(p.fecha_entrega + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';
    return `
      <tr data-id="${p.id}">
        <td class="cell-primary">${clienteNombre}</td>
        <td>${p.plan || '—'}</td>
        <td><span class="badge ${e.badge}">${e.label}</span></td>
        <td>${entrega}</td>
        <td>
          <div class="progress-track"><div class="progress-fill" style="width:${p.progreso || 0}%"></div></div>
        </td>
        <td>
          <button type="button" class="btn-ver-detalle" data-id="${p.id}">Ver detalles</button>
          <button type="button" class="btn-edit-proyecto" data-id="${p.id}" data-progreso="${p.progreso || 0}" data-estado="${p.estado}">Editar</button>
        </td>
      </tr>
    `;
  }).join('');
  document.getElementById('proyectosBody').innerHTML = rows;

  document.querySelectorAll('.btn-edit-proyecto').forEach(btn => {
    btn.addEventListener('click', () => editProyecto(btn.dataset.id, btn.dataset.progreso, btn.dataset.estado));
  });
  document.querySelectorAll('.btn-ver-detalle').forEach(btn => {
    btn.addEventListener('click', () => verDetalleProyecto(btn.dataset.id));
  });
}

async function editProyecto(id, progresoActual, estadoActual) {
  const nuevoEstado = prompt(
    `Estado del proyecto (opciones: ${ESTADOS_KEYS.join(', ')})`,
    estadoActual
  );
  if (nuevoEstado === null) return; // canceló
  if (!ESTADOS_KEYS.includes(nuevoEstado)) {
    alert('Estado inválido. Tiene que ser exactamente uno de: ' + ESTADOS_KEYS.join(', '));
    return;
  }

  const nuevoProgresoRaw = prompt('Progreso (0 a 100):', progresoActual);
  if (nuevoProgresoRaw === null) return;
  const nuevoProgreso = Math.max(0, Math.min(100, parseInt(nuevoProgresoRaw, 10) || 0));

  const { error } = await supabaseClient
    .from('proyectos')
    .update({ estado: nuevoEstado, progreso: nuevoProgreso })
    .eq('id', id);

  if (error) {
    console.error('Error actualizando proyecto:', error);
    alert('No se pudo guardar el cambio. Probá de nuevo.');
    return;
  }

  loadProyectos();
}

/* ---- contactos nuevos: convertir a proyecto ---- */
async function loadContactos() {
  const { data: contactos, error } = await supabaseClient
    .from('contactos')
    .select('id, cliente_id, nombre, email, plan_interes, mensaje, estado, created_at')
    .eq('estado', 'nuevo')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error cargando contactos:', error);
    return;
  }

  const panel = document.getElementById('contactosPanel');
  const count = document.getElementById('contactosCount');
  count.textContent = (contactos || []).length;

  if (!contactos || contactos.length === 0) {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = 'block';

  const rows = contactos.map(c => {
    const fecha = new Date(c.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    return `
      <tr>
        <td class="cell-primary">${c.nombre || '—'}</td>
        <td>${c.email || '—'}</td>
        <td>${c.plan_interes || '—'}</td>
        <td>${c.mensaje || '—'}</td>
        <td>${fecha}</td>
        <td>
          <button type="button" class="btn-convertir" data-id="${c.id}" data-cliente="${c.cliente_id}" data-plan="${c.plan_interes || ''}">Convertir a proyecto</button>
          <button type="button" class="btn-descartar" data-id="${c.id}">Descartar</button>
        </td>
      </tr>
    `;
  }).join('');
  document.getElementById('contactosBody').innerHTML = rows;

  document.querySelectorAll('.btn-convertir').forEach(btn => {
    btn.addEventListener('click', () => convertirContacto(btn.dataset.id, btn.dataset.cliente, btn.dataset.plan));
  });
  document.querySelectorAll('.btn-descartar').forEach(btn => {
    btn.addEventListener('click', () => descartarContacto(btn.dataset.id));
  });
}

async function convertirContacto(contactoId, clienteId, planSugerido) {
  if (!clienteId || clienteId === 'null') {
    alert('Este contacto no tiene un cliente vinculado todavía (falta que se registre).');
    return;
  }

  const plan = prompt('Plan (Plan Pro / Plan Plus / Plan Premium):', planSugerido || 'Plan Pro');
  if (plan === null) return;

  const entrega = prompt('Fecha estimada de entrega (AAAA-MM-DD):', '');
  if (entrega === null) return;

  const { error: insertError } = await supabaseClient
    .from('proyectos')
    .insert({
      cliente_id: clienteId,
      plan: plan,
      estado: 'pendiente',
      fecha_entrega: entrega || null,
      progreso: 0
    });

  if (insertError) {
    console.error('Error creando proyecto:', insertError);
    alert('No se pudo crear el proyecto. Probá de nuevo.');
    return;
  }

  const { error: updateError } = await supabaseClient
    .from('contactos')
    .update({ estado: 'convertido' })
    .eq('id', contactoId);

  if (updateError) console.error('Error marcando el contacto como convertido:', updateError);

  loadContactos();
  loadProyectos();
}

async function descartarContacto(contactoId) {
  if (!confirm('¿Descartar este contacto? No se va a crear ningún proyecto.')) return;
  const { error } = await supabaseClient
    .from('contactos')
    .update({ estado: 'descartado' })
    .eq('id', contactoId);
  if (error) console.error('Error descartando contacto:', error);
  loadContactos();
}

/* ---- detalle del proyecto: cliente + pagos + solicitudes ---- */
const detailOverlay = document.getElementById('detailOverlay');
const detailContent = document.getElementById('detailContent');
document.getElementById('detailClose').addEventListener('click', () => detailOverlay.classList.remove('show'));
detailOverlay.addEventListener('click', (e) => { if (e.target === detailOverlay) detailOverlay.classList.remove('show'); });

async function verDetalleProyecto(proyectoId) {
  detailContent.innerHTML = 'Cargando…';
  detailOverlay.classList.add('show');

  const { data: proyecto, error } = await supabaseClient
    .from('proyectos')
    .select('id, plan, estado, fecha_entrega, progreso, cliente_id, clientes(nombre, email, telefono, documento)')
    .eq('id', proyectoId)
    .single();

  if (error || !proyecto) {
    detailContent.innerHTML = '<p>No se pudo cargar el detalle.</p>';
    return;
  }

  const [{ data: pagos }, { data: solicitudes }] = await Promise.all([
    supabaseClient.from('pagos').select('concepto, monto, estado, metodo_pago, fecha').eq('cliente_id', proyecto.cliente_id).order('fecha', { ascending: false }),
    supabaseClient.from('solicitudes_servicio').select('servicio, monto, estado, fecha').eq('cliente_id', proyecto.cliente_id).order('fecha', { ascending: false }),
  ]);

  const c = proyecto.clientes || {};
  const e = ESTADOS[proyecto.estado] || ESTADOS.pendiente;
  const entrega = proyecto.fecha_entrega
    ? new Date(proyecto.fecha_entrega + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  const pagosHtml = (pagos && pagos.length)
    ? pagos.map(p => `<li>${p.concepto} — $${Number(p.monto).toLocaleString('es-CO')} <span class="badge ${p.estado === 'pagado' ? 'badge-green' : 'badge-amber'}">${p.estado}</span></li>`).join('')
    : '<li class="muted">Sin pagos registrados todavía.</li>';

  const solicitudesHtml = (solicitudes && solicitudes.length)
    ? solicitudes.map(s => `<li>${s.servicio} — $${Number(s.monto).toLocaleString('es-CO')} <span class="badge badge-violet">${s.estado}</span></li>`).join('')
    : '<li class="muted">Sin solicitudes de servicio adicional.</li>';

  detailContent.innerHTML = `
    <h2>${c.nombre || '(sin nombre)'}</h2>
    <div class="detail-grid">
      <div><span class="mono">Email</span><strong>${c.email || '—'}</strong></div>
      <div><span class="mono">Documento</span><strong>${c.documento || '—'}</strong></div>
      <div><span class="mono">Celular</span><strong>${c.telefono || '—'}</strong></div>
    </div>
    <hr>
    <div class="detail-grid">
      <div><span class="mono">Plan</span><strong>${proyecto.plan || '—'}</strong></div>
      <div><span class="mono">Estado</span><span class="badge ${e.badge}">${e.label}</span></div>
      <div><span class="mono">Entrega</span><strong>${entrega}</strong></div>
      <div><span class="mono">Progreso</span><strong>${proyecto.progreso || 0}%</strong></div>
    </div>
    <hr>
    <h3>Pagos de este cliente</h3>
    <ul class="detail-list">${pagosHtml}</ul>
    <h3>Servicios adicionales solicitados</h3>
    <ul class="detail-list">${solicitudesHtml}</ul>
  `;
}

/* ---- init ---- */
(async function init() {
  showLoadingSkeleton();
  const ok = await checkAdminAccess();
  if (!ok) return;
  loadContactos();
  loadProyectos();
})();

document.getElementById('logoutBtn').addEventListener('click', async function (e) {
  e.preventDefault();
  await supabaseClient.auth.signOut();
  window.location.href = '../Index/index.html';
});