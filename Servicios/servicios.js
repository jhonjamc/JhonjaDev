/* ==========================================================
   DATOS DE EJEMPLO
   Con Supabase conectado, esto se reemplaza por:

   const { data: solicitudes } = await supabase
     .from('solicitudes_servicio')
     .select('id, servicio, monto, estado, fecha, clientes(nombre)')
     .order('fecha', { ascending: false });

   Tip: cada addon de tu sección "Servicios adicionales" en la
   landing (Index) puede mapear 1 a 1 con el campo `servicio` acá.
   ========================================================== */
const solicitudes = [
  { cliente: 'Panadería La Espiga', servicio: 'Integración WhatsApp', monto: 30000, estado: 'pendiente', fecha: '09 jul 2026' },
  { cliente: 'Ferretería El Tornillo', servicio: 'Nueva sección — catálogo', monto: 50000, estado: 'en_revision', fecha: '08 jul 2026' },
  { cliente: 'Gimnasio PowerFit', servicio: 'Rediseño parcial', monto: 100000, estado: 'aprobada', fecha: '05 jul 2026' },
  { cliente: 'Clínica Dental Sonrisa', servicio: 'Formulario con Supabase', monto: 80000, estado: 'pendiente', fecha: '11 jul 2026' },
  { cliente: 'Café Andina', servicio: 'Actualización de contenido', monto: 40000, estado: 'completada', fecha: '30 jun 2026' },
];

const ESTADOS = {
  pendiente:   { label: 'Pendiente',   badge: 'badge-amber'  },
  en_revision: { label: 'En revisión', badge: 'badge-violet' },
  aprobada:    { label: 'Aprobada',    badge: 'badge-blue'   },
  completada:  { label: 'Completada',  badge: 'badge-green'  },
};

function fmt(n) {
  return '$' + n.toLocaleString('es-CO');
}

function renderStats() {
  const pendientes = solicitudes.filter(s => s.estado === 'pendiente').length;
  const enCurso = solicitudes.filter(s => s.estado === 'en_revision' || s.estado === 'aprobada').length;
  const valorPotencial = solicitudes
    .filter(s => s.estado !== 'completada')
    .reduce((sum, s) => sum + s.monto, 0);

  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card"><div class="label">Pendientes de revisar</div><div class="value">${pendientes}</div></div>
    <div class="stat-card"><div class="label">En curso</div><div class="value">${enCurso}</div></div>
    <div class="stat-card"><div class="label">Valor por cobrar</div><div class="value">${fmt(valorPotencial)}</div></div>
  `;
}

function renderTable() {
  const rows = solicitudes.map(s => {
    const e = ESTADOS[s.estado];
    return `
      <tr>
        <td class="cell-primary">${s.cliente}</td>
        <td>${s.servicio}</td>
        <td>${fmt(s.monto)}</td>
        <td><span class="badge ${e.badge}">${e.label}</span></td>
        <td>${s.fecha}</td>
      </tr>
    `;
  }).join('');
  document.getElementById('serviciosBody').innerHTML = rows;
}

renderStats();
renderTable();

document.getElementById('logoutBtn').addEventListener('click', function (e) {
  // placeholder — sin sesión real todavía
});