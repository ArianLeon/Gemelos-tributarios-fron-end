const REGIMEN_LABEL = { RIMPE_NEGOCIO_POPULAR: 'RIMPE – Negocio Popular', RIMPE_EMPRENDEDOR: 'RIMPE – Emprendedor' };
const estado = { items: [], filtroRegimen: '', filtroAnio: '' };
const $ = (id) => document.getElementById(id);
const usd = (n) => `$ ${Number(n).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function cargarTarifas() {
  const resp = await api('/tarifas-rimpe');
  if (!resp.ok) {
    $('tabla-body').innerHTML = '<tr><td colspan="7" class="text-muted" style="padding:20px 18px;">No se pudo conectar con el servidor.</td></tr>';
    return;
  }
  estado.items = Array.isArray(resp.data) ? resp.data : [];
  actualizarSelectAnios();
  pintarTabla();
}

function actualizarSelectAnios() {
  const anios = [...new Set(estado.items.map((i) => i.anioFiscal))].sort((a, b) => b - a);
  const sel = $('filtro-anio').value;
  $('filtro-anio').innerHTML = '<option value="">Todos los años</option>' + anios.map((a) => `<option value="${a}">${a}</option>`).join('');
  if (anios.includes(Number(sel))) $('filtro-anio').value = sel;
}

function itemsFiltrados() {
  return estado.items.filter((i) => {
    if (estado.filtroRegimen && i.regimen !== estado.filtroRegimen) return false;
    if (estado.filtroAnio && String(i.anioFiscal) !== estado.filtroAnio) return false;
    return true;
  });
}

function pintarTabla() {
  const items = itemsFiltrados().slice().sort((a, b) => b.anioFiscal - a.anioFiscal || a.regimen.localeCompare(b.regimen) || a.ingresoDesde - b.ingresoDesde);
  const tbody = $('tabla-body');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="padding:20px 18px;">${estado.items.length ? 'No hay tramos con ese filtro.' : 'Todavía no hay tarifas cargadas.'}</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map((i) => `
    <tr>
      <td>${i.anioFiscal}</td>
      <td>${esc(REGIMEN_LABEL[i.regimen] || i.regimen)}</td>
      <td>${usd(i.ingresoDesde)}</td>
      <td>${i.ingresoHasta != null ? usd(i.ingresoHasta) : 'Sin tope'}</td>
      <td>${usd(i.cuotaFija)}</td>
      <td>${Number(i.porcentajeExcedente).toLocaleString('es-EC', { maximumFractionDigits: 2 })}%</td>
      <td style="white-space:nowrap;">
        <button type="button" class="btn btn-outline btn-sm" data-editar="${i.idTarifa}">Editar</button>
        <button type="button" class="btn btn-outline btn-sm" data-eliminar="${i.idTarifa}">Eliminar</button>
      </td>
    </tr>`).join('');
}

function limpiarFormulario() {
  $('form-tarifa').reset();
  $('f-id').value = '';
  $('f-anio').value = new Date().getFullYear();
}

function abrirNuevo() {
  limpiarFormulario();
  $('modal-titulo').textContent = 'Nuevo tramo RIMPE';
  abrirModal('modal-form');
}

function abrirEditar(id) {
  const i = estado.items.find((x) => String(x.idTarifa) === String(id));
  if (!i) return;
  $('f-id').value = i.idTarifa;
  $('f-anio').value = i.anioFiscal;
  $('f-regimen').value = i.regimen;
  $('f-desde').value = i.ingresoDesde;
  $('f-hasta').value = i.ingresoHasta ?? '';
  $('f-cuota').value = i.cuotaFija;
  $('f-pct').value = i.porcentajeExcedente;
  $('f-baselegal').value = i.baseLegal || '';
  $('modal-titulo').textContent = 'Editar tramo RIMPE';
  abrirModal('modal-form');
}

async function guardar(e) {
  e.preventDefault();
  const id = $('f-id').value;
  const hastaTxt = $('f-hasta').value.trim();
  const payload = {
    anioFiscal: Number($('f-anio').value),
    regimen: $('f-regimen').value,
    ingresoDesde: Number($('f-desde').value),
    ingresoHasta: hastaTxt === '' ? null : Number(hastaTxt),
    cuotaFija: Number($('f-cuota').value),
    porcentajeExcedente: Number($('f-pct').value),
    baseLegal: $('f-baselegal').value.trim()
  };
  const boton = e.target.querySelector('button[type="submit"]');
  boton.disabled = true;
  const resp = id
    ? await api(`/tarifas-rimpe/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    : await api('/tarifas-rimpe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  boton.disabled = false;
  if (!resp.ok) { showToast('No se pudo guardar el tramo.'); return; }
  cerrarModal('modal-form');
  showToast(id ? 'Tramo actualizado.' : 'Tramo creado.');
  await cargarTarifas();
}

let idAEliminar = null;
function pedirEliminar(id) { idAEliminar = id; abrirModal('modal-eliminar'); }
async function confirmarEliminar() {
  if (!idAEliminar) return;
  const resp = await api(`/tarifas-rimpe/${idAEliminar}`, { method: 'DELETE' });
  cerrarModal('modal-eliminar');
  if (!resp.ok) { showToast('No se pudo eliminar el tramo.'); return; }
  showToast('Tramo eliminado.');
  idAEliminar = null;
  await cargarTarifas();
}

document.addEventListener('DOMContentLoaded', () => {
  cargarTarifas();
  $('btn-nuevo').addEventListener('click', abrirNuevo);
  $('btn-cancelar').addEventListener('click', () => cerrarModal('modal-form'));
  $('form-tarifa').addEventListener('submit', guardar);
  $('btn-cancelar-eliminar').addEventListener('click', () => cerrarModal('modal-eliminar'));
  $('btn-confirmar-eliminar').addEventListener('click', confirmarEliminar);
  $('filtro-regimen').addEventListener('change', (e) => { estado.filtroRegimen = e.target.value; pintarTabla(); });
  $('filtro-anio').addEventListener('change', (e) => { estado.filtroAnio = e.target.value; pintarTabla(); });
  $('tabla-body').addEventListener('click', (e) => {
    const be = e.target.closest('[data-editar]'); if (be) return abrirEditar(be.dataset.editar);
    const bd = e.target.closest('[data-eliminar]'); if (bd) return pedirEliminar(bd.dataset.eliminar);
  });
});