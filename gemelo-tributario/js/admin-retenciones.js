const estado = { items: [], busqueda: '' };
const $ = (id) => document.getElementById(id);

async function cargarRetenciones() {
  const resp = await api('/retenciones');
  if (!resp.ok) {
    $('tabla-body').innerHTML = '<tr><td colspan="6" class="text-muted" style="padding:20px 18px;">No se pudo conectar con el servidor.</td></tr>';
    return;
  }
  estado.items = Array.isArray(resp.data) ? resp.data : [];
  pintarTabla();
}

function itemsFiltrados() {
  const q = estado.busqueda.trim().toLowerCase();
  if (!q) return estado.items;
  return estado.items.filter((i) => (i.codigo || '').toLowerCase().includes(q) || (i.descripcion || '').toLowerCase().includes(q));
}

function pintarTabla() {
  const items = itemsFiltrados();
  const tbody = $('tabla-body');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="padding:20px 18px;">${estado.items.length ? 'No hay resultados.' : 'Todavía no hay retenciones cargadas.'}</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map((i) => `
    <tr>
      <td class="mono">${esc(i.codigo)}</td>
      <td>${esc(i.descripcion)}</td>
      <td>${Number(i.porcentaje).toLocaleString('es-EC', { maximumFractionDigits: 2 })}%</td>
      <td>${esc(i.baseLegal) || '—'}</td>
      <td><span class="status-pill ${i.vigente ? 'ok' : 'due'}">${i.vigente ? 'Vigente' : 'Inactiva'}</span></td>
      <td style="white-space:nowrap;">
        <button type="button" class="btn btn-outline btn-sm" data-editar="${i.idRetencion}">Editar</button>
        <button type="button" class="btn btn-outline btn-sm" data-eliminar="${i.idRetencion}">Eliminar</button>
      </td>
    </tr>`).join('');
}

function limpiarFormulario() {
  $('form-retencion').reset();
  $('f-id').value = '';
  $('f-vigente').checked = true;
}

function abrirNuevo() {
  limpiarFormulario();
  $('modal-titulo').textContent = 'Nueva retención';
  abrirModal('modal-form');
}

function abrirEditar(id) {
  const i = estado.items.find((x) => String(x.idRetencion) === String(id));
  if (!i) return;
  $('f-id').value = i.idRetencion;
  $('f-codigo').value = i.codigo || '';
  $('f-descripcion').value = i.descripcion || '';
  $('f-porcentaje').value = i.porcentaje;
  $('f-baselegal').value = i.baseLegal || '';
  $('f-vigente').checked = !!i.vigente;
  $('modal-titulo').textContent = 'Editar retención';
  abrirModal('modal-form');
}

async function guardar(e) {
  e.preventDefault();
  const id = $('f-id').value;
  const payload = {
    codigo: $('f-codigo').value.trim(),
    descripcion: $('f-descripcion').value.trim(),
    porcentaje: Number($('f-porcentaje').value),
    baseLegal: $('f-baselegal').value.trim(),
    vigente: $('f-vigente').checked
  };
  const boton = e.target.querySelector('button[type="submit"]');
  boton.disabled = true;
  const resp = id
    ? await api(`/retenciones/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    : await api('/retenciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  boton.disabled = false;
  if (!resp.ok) { showToast('No se pudo guardar. Revisa que el código no esté repetido.'); return; }
  cerrarModal('modal-form');
  showToast(id ? 'Retención actualizada.' : 'Retención creada.');
  await cargarRetenciones();
}

let idAEliminar = null;
function pedirEliminar(id) { idAEliminar = id; abrirModal('modal-eliminar'); }
async function confirmarEliminar() {
  if (!idAEliminar) return;
  const resp = await api(`/retenciones/${idAEliminar}`, { method: 'DELETE' });
  cerrarModal('modal-eliminar');
  if (!resp.ok) { showToast('No se pudo eliminar la retención.'); return; }
  showToast('Retención eliminada.');
  idAEliminar = null;
  await cargarRetenciones();
}

document.addEventListener('DOMContentLoaded', () => {
  cargarRetenciones();
  $('btn-nuevo').addEventListener('click', abrirNuevo);
  $('btn-cancelar').addEventListener('click', () => cerrarModal('modal-form'));
  $('form-retencion').addEventListener('submit', guardar);
  $('btn-cancelar-eliminar').addEventListener('click', () => cerrarModal('modal-eliminar'));
  $('btn-confirmar-eliminar').addEventListener('click', confirmarEliminar);
  $('buscar').addEventListener('input', debounce((e) => { estado.busqueda = e.target.value; pintarTabla(); }, 200));
  $('tabla-body').addEventListener('click', (e) => {
    const be = e.target.closest('[data-editar]'); if (be) return abrirEditar(be.dataset.editar);
    const bd = e.target.closest('[data-eliminar]'); if (bd) return pedirEliminar(bd.dataset.eliminar);
  });
});