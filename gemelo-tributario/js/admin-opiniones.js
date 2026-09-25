const estado = { items: [], filtroCalificacion: '' };
const $ = (id) => document.getElementById(id);
function nombreUsuario(u) { return u ? [u.primerNombre, u.apellidoPaterno].filter(Boolean).join(' ') : null; }
function estrellas(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }

async function cargarOpiniones() {
  const resp = await api('/opiniones');
  if (!resp.ok) {
    $('tabla-body').innerHTML = '<tr><td colspan="5" class="text-muted" style="padding:20px 18px;">No se pudo conectar con el servidor.</td></tr>';
    return;
  }
  estado.items = Array.isArray(resp.data) ? resp.data : [];
  pintarKpis();
  pintarTabla();
}

function pintarKpis() {
  const n = estado.items.length;
  $('kpi-total').textContent = n;
  $('kpi-promedio').textContent = n ? (estado.items.reduce((s, o) => s + o.calificacion, 0) / n).toFixed(1) : '—';
  $('kpi-bajas').textContent = estado.items.filter((o) => o.calificacion <= 2).length;
  $('kpi-altas').textContent = estado.items.filter((o) => o.calificacion === 5).length;
}

function itemsFiltrados() {
  if (!estado.filtroCalificacion) return estado.items;
  return estado.items.filter((o) => String(o.calificacion) === estado.filtroCalificacion);
}

function pintarTabla() {
  const items = itemsFiltrados().slice().sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
  const tbody = $('tabla-body');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted" style="padding:20px 18px;">${estado.items.length ? 'No hay opiniones con esa calificación.' : 'Todavía no hay opiniones registradas.'}</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map((o) => `
    <tr>
      <td>${esc(nombreUsuario(o.usuario) || o.nombreMostrado || 'Anónimo')}</td>
      <td title="${o.calificacion}/5">${estrellas(o.calificacion)}</td>
      <td>${esc(o.comentario)}</td>
      <td>${o.fechaCreacion ? esc(o.fechaCreacion.slice(0, 10)) : '—'}</td>
      <td><button type="button" class="btn btn-outline btn-sm" data-eliminar="${o.idComentario}">Eliminar</button></td>
    </tr>`).join('');
}

let idAEliminar = null;
function pedirEliminar(id) { idAEliminar = id; abrirModal('modal-eliminar'); }
async function confirmarEliminar() {
  if (!idAEliminar) return;
  const resp = await api(`/opiniones/${idAEliminar}`, { method: 'DELETE' });
  cerrarModal('modal-eliminar');
  if (!resp.ok) { showToast('No se pudo eliminar la opinión.'); return; }
  showToast('Opinión eliminada.');
  idAEliminar = null;
  await cargarOpiniones();
}

document.addEventListener('DOMContentLoaded', () => {
  cargarOpiniones();
  $('btn-cancelar-eliminar').addEventListener('click', () => cerrarModal('modal-eliminar'));
  $('btn-confirmar-eliminar').addEventListener('click', confirmarEliminar);
  $('filtro-calificacion').addEventListener('change', (e) => { estado.filtroCalificacion = e.target.value; pintarTabla(); });
  $('tabla-body').addEventListener('click', (e) => {
    const bd = e.target.closest('[data-eliminar]'); if (bd) return pedirEliminar(bd.dataset.eliminar);
  });
});