const ESTADO_LABEL = { PENDIENTE: 'Pendiente', PROXIMA: 'Próxima', VENCIDA: 'Vencida', CUMPLIDA: 'Cumplida' };
const ESTADO_PILL = { PENDIENTE: 'info', PROXIMA: 'warn', VENCIDA: 'due', CUMPLIDA: 'ok' };
const estado = { items: [], busqueda: '', filtroEstado: '' };
const $ = (id) => document.getElementById(id);

function nombreUsuario(u) {
  return u ? [u.primerNombre, u.apellidoPaterno].filter(Boolean).join(' ') : '(usuario eliminado)';
}

async function cargarObligaciones() {
  const resp = await api('/obligaciones-usuario');
  if (!resp.ok) {
    $('tabla-body').innerHTML = '<tr><td colspan="7" class="text-muted" style="padding:20px 18px;">No se pudo conectar con el servidor.</td></tr>';
    return;
  }
  estado.items = Array.isArray(resp.data) ? resp.data : [];
  pintarKpis();
  pintarTabla();
}

function pintarKpis() {
  $('kpi-total').textContent = estado.items.length;
  $('kpi-proximas').textContent = estado.items.filter((o) => o.estado === 'PROXIMA').length;
  $('kpi-vencidas').textContent = estado.items.filter((o) => o.estado === 'VENCIDA').length;
  $('kpi-cumplidas').textContent = estado.items.filter((o) => o.estado === 'CUMPLIDA').length;
}

function itemsFiltrados() {
  const q = estado.busqueda.trim().toLowerCase();
  return estado.items.filter((o) => {
    if (estado.filtroEstado && o.estado !== estado.filtroEstado) return false;
    if (q && !nombreUsuario(o.usuario).toLowerCase().includes(q)) return false;
    return true;
  });
}

function pintarTabla() {
  const items = itemsFiltrados().slice().sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));
  const tbody = $('tabla-body');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="padding:20px 18px;">${estado.items.length ? 'No hay resultados con ese filtro.' : 'Todavía no se ha generado ninguna obligación.'}</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map((o) => `
    <tr>
      <td>${esc(nombreUsuario(o.usuario))}</td>
      <td>${esc(o.obligacionCatalogo?.nombre)}</td>
      <td>${esc(o.periodoFiscal)}</td>
      <td>${esc(o.fechaVencimiento)}</td>
      <td><span class="status-pill ${ESTADO_PILL[o.estado] || 'info'}">${ESTADO_LABEL[o.estado] || o.estado}</span></td>
      <td>${o.enMiCalendario ? 'Sí' : 'No'}</td>
      <td style="white-space:nowrap;">
        ${o.estado !== 'CUMPLIDA' ? `<button type="button" class="btn btn-outline btn-sm" data-cumplir="${o.idObligacionUsuario}">Marcar cumplida</button>` : ''}
        <button type="button" class="btn btn-outline btn-sm" data-eliminar="${o.idObligacionUsuario}">Eliminar</button>
      </td>
    </tr>`).join('');
}

async function marcarCumplida(id) {
  if (!window.confirm('¿Marcar esta obligación como cumplida?')) return;
  const resp = await api(`/obligaciones-usuario/${id}/cumplir`, { method: 'PATCH' });
  if (!resp.ok) { showToast('No se pudo actualizar la obligación.'); return; }
  showToast('Obligación marcada como cumplida.');
  await cargarObligaciones();
}

let idAEliminar = null;
function pedirEliminar(id) { idAEliminar = id; abrirModal('modal-eliminar'); }
async function confirmarEliminar() {
  if (!idAEliminar) return;
  const resp = await api(`/obligaciones-usuario/${idAEliminar}`, { method: 'DELETE' });
  cerrarModal('modal-eliminar');
  if (!resp.ok) { showToast('No se pudo eliminar.'); return; }
  showToast('Obligación eliminada.');
  idAEliminar = null;
  await cargarObligaciones();
}

document.addEventListener('DOMContentLoaded', () => {
  cargarObligaciones();
  $('btn-cancelar-eliminar').addEventListener('click', () => cerrarModal('modal-eliminar'));
  $('btn-confirmar-eliminar').addEventListener('click', confirmarEliminar);
  $('buscar').addEventListener('input', debounce((e) => { estado.busqueda = e.target.value; pintarTabla(); }, 200));
  $('filtro-estado').addEventListener('change', (e) => { estado.filtroEstado = e.target.value; pintarTabla(); });
  $('tabla-body').addEventListener('click', (e) => {
    const bc = e.target.closest('[data-cumplir]'); if (bc) return marcarCumplida(bc.dataset.cumplir);
    const bd = e.target.closest('[data-eliminar]'); if (bd) return pedirEliminar(bd.dataset.eliminar);
  });
});