/* ============================================================
   Catálogo de obligaciones — Panel de administración
   Requiere admin-common.js (api, showToast, abrirModal, cerrarModal, debounce, esc).
   ============================================================ */

const REGIMEN_LABEL = {
  TODOS: 'Todos los regímenes',
  RIMPE_NEGOCIO_POPULAR: 'RIMPE – Negocio Popular',
  RIMPE_EMPRENDEDOR: 'RIMPE – Emprendedor',
  GENERAL: 'Régimen General'
};
const PERIODICIDAD_LABEL = { MENSUAL: 'Mensual', SEMESTRAL: 'Semestral', ANUAL: 'Anual' };

const estado = { items: [], busqueda: '' };
const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------
   Cargar y pintar la tabla
   ------------------------------------------------------------ */
async function cargarCatalogo() {
  const resp = await api('/obligaciones-catalogo');
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
  return estado.items.filter((o) =>
    (o.nombre || '').toLowerCase().includes(q) || (o.codigo || '').toLowerCase().includes(q));
}

function pintarTabla() {
  const items = itemsFiltrados();
  const tbody = $('tabla-body');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="padding:20px 18px;">${estado.items.length ? 'No hay resultados para esa búsqueda.' : 'Todavía no hay obligaciones en el catálogo. Crea la primera con "+ Nueva obligación".'}</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map((o) => `
    <tr>
      <td class="mono">${esc(o.codigo)}</td>
      <td>${esc(o.nombre)}</td>
      <td>${esc(REGIMEN_LABEL[o.regimenAplicable] || o.regimenAplicable)}</td>
      <td>${esc(PERIODICIDAD_LABEL[o.periodicidad] || o.periodicidad)}</td>
      <td>${esc(o.formulario) || '—'}</td>
      <td><span class="status-pill ${o.vigente ? 'ok' : 'due'}">${o.vigente ? 'Vigente' : 'Inactiva'}</span></td>
      <td style="white-space:nowrap;">
        <button type="button" class="btn btn-outline btn-sm" data-editar="${o.idObligacionCatalogo}">Editar</button>
        <button type="button" class="btn btn-outline btn-sm" data-eliminar="${o.idObligacionCatalogo}">Eliminar</button>
      </td>
    </tr>`).join('');
}

/* ------------------------------------------------------------
   Modal: crear / editar
   ------------------------------------------------------------ */
function limpiarFormulario() {
  $('form-obligacion').reset();
  $('f-id').value = '';
  $('f-vigente').checked = true;
}

function abrirNuevo() {
  limpiarFormulario();
  $('modal-titulo').textContent = 'Nueva obligación';
  abrirModal('modal-form');
}

function abrirEditar(id) {
  const o = estado.items.find((x) => String(x.idObligacionCatalogo) === String(id));
  if (!o) return;
  $('f-id').value = o.idObligacionCatalogo;
  $('f-codigo').value = o.codigo || '';
  $('f-nombre').value = o.nombre || '';
  $('f-descripcion').value = o.descripcion || '';
  $('f-regimen').value = o.regimenAplicable || 'TODOS';
  $('f-periodicidad').value = o.periodicidad || 'MENSUAL';
  $('f-formulario').value = o.formulario || '';
  $('f-baselegal').value = o.baseLegal || '';
  $('f-vigente').checked = !!o.vigente;
  $('modal-titulo').textContent = 'Editar obligación';
  abrirModal('modal-form');
}

async function guardar(e) {
  e.preventDefault();
  const id = $('f-id').value;
  const payload = {
    codigo: $('f-codigo').value.trim(),
    nombre: $('f-nombre').value.trim(),
    descripcion: $('f-descripcion').value.trim(),
    regimenAplicable: $('f-regimen').value,
    periodicidad: $('f-periodicidad').value,
    formulario: $('f-formulario').value.trim(),
    baseLegal: $('f-baselegal').value.trim(),
    vigente: $('f-vigente').checked
  };

  const boton = e.target.querySelector('button[type="submit"]');
  boton.disabled = true;
  const resp = id
    ? await api(`/obligaciones-catalogo/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    : await api('/obligaciones-catalogo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  boton.disabled = false;

  if (!resp.ok) {
    showToast('No se pudo guardar. Revisa que el código no esté repetido y que todos los campos obligatorios estén completos.');
    return;
  }
  cerrarModal('modal-form');
  showToast(id ? 'Obligación actualizada.' : 'Obligación creada.');
  await cargarCatalogo();
}

/* ------------------------------------------------------------
   Modal: eliminar
   ------------------------------------------------------------ */
let idAEliminar = null;

function pedirEliminar(id) {
  idAEliminar = id;
  abrirModal('modal-eliminar');
}

async function confirmarEliminar() {
  if (!idAEliminar) return;
  const resp = await api(`/obligaciones-catalogo/${idAEliminar}`, { method: 'DELETE' });
  cerrarModal('modal-eliminar');
  if (!resp.ok) { showToast('No se pudo eliminar la obligación.'); return; }
  showToast('Obligación eliminada.');
  idAEliminar = null;
  await cargarCatalogo();
}

/* ------------------------------------------------------------
   Inicialización
   ------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  cargarCatalogo();

  $('btn-nuevo').addEventListener('click', abrirNuevo);
  $('btn-cancelar').addEventListener('click', () => cerrarModal('modal-form'));
  $('form-obligacion').addEventListener('submit', guardar);

  $('btn-cancelar-eliminar').addEventListener('click', () => cerrarModal('modal-eliminar'));
  $('btn-confirmar-eliminar').addEventListener('click', confirmarEliminar);

  $('buscar').addEventListener('input', debounce((e) => {
    estado.busqueda = e.target.value;
    pintarTabla();
  }, 200));

  $('tabla-body').addEventListener('click', (e) => {
    const btnEditar = e.target.closest('[data-editar]');
    if (btnEditar) { abrirEditar(btnEditar.dataset.editar); return; }
    const btnEliminar = e.target.closest('[data-eliminar]');
    if (btnEliminar) { pedirEliminar(btnEliminar.dataset.eliminar); return; }
  });
});