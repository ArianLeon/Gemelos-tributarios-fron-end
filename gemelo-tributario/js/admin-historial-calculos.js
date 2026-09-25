const TIPO_LABEL = { IVA: 'IVA', RENTA: 'Renta', RETENCION: 'Retención' };
const estado = { items: [], busqueda: '', filtroTipo: '' };
const $ = (id) => document.getElementById(id);
const usd = (n) => `$ ${Number(n).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function nombreUsuario(u) { return u ? [u.primerNombre, u.apellidoPaterno].filter(Boolean).join(' ') : '(usuario eliminado)'; }

async function cargarHistorial() {
  const resp = await api('/calculo-historial');
  if (!resp.ok) {
    $('tabla-body').innerHTML = '<tr><td colspan="6" class="text-muted" style="padding:20px 18px;">No se pudo conectar con el servidor.</td></tr>';
    return;
  }
  estado.items = Array.isArray(resp.data) ? resp.data : [];
  pintarTabla();
}

function itemsFiltrados() {
  const q = estado.busqueda.trim().toLowerCase();
  return estado.items.filter((c) => {
    if (estado.filtroTipo && c.tipoCalculo !== estado.filtroTipo) return false;
    if (q && !nombreUsuario(c.usuario).toLowerCase().includes(q)) return false;
    return true;
  });
}

function pintarTabla() {
  const items = itemsFiltrados().slice().sort((a, b) => new Date(b.fechaCalculo) - new Date(a.fechaCalculo));
  const tbody = $('tabla-body');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="padding:20px 18px;">${estado.items.length ? 'No hay resultados.' : 'Todavía no hay cálculos guardados.'}</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map((c) => `
    <tr>
      <td>${esc(nombreUsuario(c.usuario))}</td>
      <td>${esc(TIPO_LABEL[c.tipoCalculo] || c.tipoCalculo)}</td>
      <td>${esc(c.etiqueta)}</td>
      <td>${usd(c.monto)}</td>
      <td>${c.fechaCalculo ? esc(c.fechaCalculo.slice(0, 16).replace('T', ' ')) : '—'}</td>
      <td><button type="button" class="btn btn-outline btn-sm" data-eliminar="${c.idCalculo}">Eliminar</button></td>
    </tr>`).join('');
}

let idAEliminar = null;
function pedirEliminar(id) { idAEliminar = id; abrirModal('modal-eliminar'); }
async function confirmarEliminar() {
  if (!idAEliminar) return;
  const resp = await api(`/calculo-historial/${idAEliminar}`, { method: 'DELETE' });
  cerrarModal('modal-eliminar');
  if (!resp.ok) { showToast('No se pudo eliminar el cálculo.'); return; }
  showToast('Cálculo eliminado.');
  idAEliminar = null;
  await cargarHistorial();
}

document.addEventListener('DOMContentLoaded', () => {
  cargarHistorial();
  $('btn-cancelar-eliminar').addEventListener('click', () => cerrarModal('modal-eliminar'));
  $('btn-confirmar-eliminar').addEventListener('click', confirmarEliminar);
  $('buscar').addEventListener('input', debounce((e) => { estado.busqueda = e.target.value; pintarTabla(); }, 200));
  $('filtro-tipo').addEventListener('change', (e) => { estado.filtroTipo = e.target.value; pintarTabla(); });
  $('tabla-body').addEventListener('click', (e) => {
    const bd = e.target.closest('[data-eliminar]'); if (bd) return pedirEliminar(bd.dataset.eliminar);
  });
});