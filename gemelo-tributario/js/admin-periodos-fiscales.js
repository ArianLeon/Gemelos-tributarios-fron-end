const estado = { items: [], busqueda: '' };
const $ = (id) => document.getElementById(id);
const usd = (n) => `$ ${Number(n).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function nombreUsuario(u) { return u ? [u.primerNombre, u.apellidoPaterno].filter(Boolean).join(' ') : '(usuario eliminado)'; }

async function cargarPeriodos() {
  const resp = await api('/periodos-fiscales');
  if (!resp.ok) {
    $('tabla-body').innerHTML = '<tr><td colspan="7" class="text-muted" style="padding:20px 18px;">No se pudo conectar con el servidor.</td></tr>';
    return;
  }
  estado.items = Array.isArray(resp.data) ? resp.data : [];
  pintarTabla();
}

function itemsFiltrados() {
  const q = estado.busqueda.trim().toLowerCase();
  if (!q) return estado.items;
  return estado.items.filter((p) => nombreUsuario(p.usuario).toLowerCase().includes(q));
}

function pintarTabla() {
  const items = itemsFiltrados();
  const tbody = $('tabla-body');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="padding:20px 18px;">${estado.items.length ? 'No hay resultados.' : 'Todavía no hay períodos registrados.'}</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map((p) => `
    <tr>
      <td>${esc(nombreUsuario(p.usuario))}</td>
      <td>${esc(p.periodoFiscal)}</td>
      <td>${usd(p.totalVentas)}</td>
      <td>${usd(p.totalCompras)}</td>
      <td>${usd(p.ivaGenerado)}</td>
      <td>${usd(p.creditoTributario)}</td>
      <td><button type="button" class="btn btn-outline btn-sm" data-eliminar="${p.idPeriodoDatos}">Eliminar</button></td>
    </tr>`).join('');
}

let idAEliminar = null;
function pedirEliminar(id) { idAEliminar = id; abrirModal('modal-eliminar'); }
async function confirmarEliminar() {
  if (!idAEliminar) return;
  const resp = await api(`/periodos-fiscales/${idAEliminar}`, { method: 'DELETE' });
  cerrarModal('modal-eliminar');
  if (!resp.ok) { showToast('No se pudo eliminar el registro.'); return; }
  showToast('Registro eliminado.');
  idAEliminar = null;
  await cargarPeriodos();
}

document.addEventListener('DOMContentLoaded', () => {
  cargarPeriodos();
  $('btn-cancelar-eliminar').addEventListener('click', () => cerrarModal('modal-eliminar'));
  $('btn-confirmar-eliminar').addEventListener('click', confirmarEliminar);
  $('buscar').addEventListener('input', debounce((e) => { estado.busqueda = e.target.value; pintarTabla(); }, 200));
  $('tabla-body').addEventListener('click', (e) => {
    const bd = e.target.closest('[data-eliminar]'); if (bd) return pedirEliminar(bd.dataset.eliminar);
  });
});