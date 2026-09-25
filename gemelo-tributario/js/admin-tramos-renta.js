/* ============================================================
   Tramos de Renta — Panel de administración
   Requiere admin-common.js (api, showToast, abrirModal, cerrarModal, esc).
   ============================================================ */

const estado = { items: [], filtroAnio: '' };
const $ = (id) => document.getElementById(id);

const usd = (n) => `$ ${Number(n).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ------------------------------------------------------------
   Cargar y pintar
   ------------------------------------------------------------ */
async function cargarTramos() {
  const resp = await api('/tramos-renta');
  if (!resp.ok) {
    $('tabla-body').innerHTML = '<tr><td colspan="6" class="text-muted" style="padding:20px 18px;">No se pudo conectar con el servidor.</td></tr>';
    return;
  }
  estado.items = Array.isArray(resp.data) ? resp.data : [];
  actualizarSelectAnios();
  pintarTabla();
}

function actualizarSelectAnios() {
  const anios = [...new Set(estado.items.map((i) => i.anioFiscal))].sort((a, b) => b - a);
  const seleccionado = $('filtro-anio').value;
  $('filtro-anio').innerHTML = '<option value="">Todos los años</option>' + anios.map((a) => `<option value="${a}">${a}</option>`).join('');
  if (anios.includes(Number(seleccionado))) $('filtro-anio').value = seleccionado;
}

function itemsFiltrados() {
  if (!estado.filtroAnio) return estado.items;
  return estado.items.filter((i) => String(i.anioFiscal) === estado.filtroAnio);
}

function pintarTabla() {
  const items = itemsFiltrados().slice().sort((a, b) => b.anioFiscal - a.anioFiscal || a.montoDesde - b.montoDesde);
  const tbody = $('tabla-body');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="padding:20px 18px;">${estado.items.length ? 'No hay tramos con ese filtro.' : 'Todavía no hay tramos cargados. Crea el primero con "+ Nuevo tramo".'}</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map((i) => `
    <tr>
      <td>${i.anioFiscal}</td>
      <td>${usd(i.montoDesde)}</td>
      <td>${i.montoHasta != null ? usd(i.montoHasta) : 'En adelante'}</td>
      <td>${Number(i.tarifaPorcentaje).toLocaleString('es-EC', { maximumFractionDigits: 2 })}%</td>
      <td>${esc(i.baseLegal) || '—'}</td>
      <td style="white-space:nowrap;">
        <button type="button" class="btn btn-outline btn-sm" data-editar="${i.idTramo}">Editar</button>
        <button type="button" class="btn btn-outline btn-sm" data-eliminar="${i.idTramo}">Eliminar</button>
      </td>
    </tr>`).join('');
}

/* ------------------------------------------------------------
   Modal: crear / editar
   ------------------------------------------------------------ */
function limpiarFormulario() {
  $('form-tramo').reset();
  $('f-id').value = '';
  $('f-anio').value = new Date().getFullYear();
}

function abrirNuevo() {
  limpiarFormulario();
  $('modal-titulo').textContent = 'Nuevo tramo';
  abrirModal('modal-form');
}

function abrirEditar(id) {
  const i = estado.items.find((x) => String(x.idTramo) === String(id));
  if (!i) return;
  $('f-id').value = i.idTramo;
  $('f-anio').value = i.anioFiscal;
  $('f-desde').value = i.montoDesde;
  $('f-hasta').value = i.montoHasta ?? '';
  $('f-tarifa').value = i.tarifaPorcentaje;
  $('f-baselegal').value = i.baseLegal || '';
  $('modal-titulo').textContent = 'Editar tramo';
  abrirModal('modal-form');
}

async function guardar(e) {
  e.preventDefault();
  const id = $('f-id').value;
  const hastaTxt = $('f-hasta').value.trim();
  const payload = {
    anioFiscal: Number($('f-anio').value),
    montoDesde: Number($('f-desde').value),
    montoHasta: hastaTxt === '' ? null : Number(hastaTxt),
    tarifaPorcentaje: Number($('f-tarifa').value),
    baseLegal: $('f-baselegal').value.trim()
  };

  if (payload.montoHasta != null && payload.montoHasta <= payload.montoDesde) {
    showToast('"Monto hasta" debe ser mayor que "Monto desde".');
    return;
  }

  const boton = e.target.querySelector('button[type="submit"]');
  boton.disabled = true;
  const resp = id
    ? await api(`/tramos-renta/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    : await api('/tramos-renta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  boton.disabled = false;

  if (!resp.ok) {
    showToast('No se pudo guardar el tramo. Revisa los datos ingresados.');
    return;
  }
  cerrarModal('modal-form');
  showToast(id ? 'Tramo actualizado.' : 'Tramo creado.');
  await cargarTramos();
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
  const resp = await api(`/tramos-renta/${idAEliminar}`, { method: 'DELETE' });
  cerrarModal('modal-eliminar');
  if (!resp.ok) { showToast('No se pudo eliminar el tramo.'); return; }
  showToast('Tramo eliminado.');
  idAEliminar = null;
  await cargarTramos();
}

/* ------------------------------------------------------------
   Inicialización
   ------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  cargarTramos();

  $('btn-nuevo').addEventListener('click', abrirNuevo);
  $('btn-cancelar').addEventListener('click', () => cerrarModal('modal-form'));
  $('form-tramo').addEventListener('submit', guardar);

  $('btn-cancelar-eliminar').addEventListener('click', () => cerrarModal('modal-eliminar'));
  $('btn-confirmar-eliminar').addEventListener('click', confirmarEliminar);

  $('filtro-anio').addEventListener('change', (e) => { estado.filtroAnio = e.target.value; pintarTabla(); });

  $('tabla-body').addEventListener('click', (e) => {
    const btnEditar = e.target.closest('[data-editar]');
    if (btnEditar) { abrirEditar(btnEditar.dataset.editar); return; }
    const btnEliminar = e.target.closest('[data-eliminar]');
    if (btnEliminar) { pedirEliminar(btnEliminar.dataset.eliminar); return; }
  });
});