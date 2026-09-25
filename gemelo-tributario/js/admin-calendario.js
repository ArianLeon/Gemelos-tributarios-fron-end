/* ============================================================
   Calendario por noveno dígito — Panel de administración
   Requiere admin-common.js (api, showToast, abrirModal, cerrarModal, esc).
   ============================================================ */

const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const estado = { items: [], catalogo: [], filtroObligacion: '', filtroAnio: '' };
const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------
   Catálogo (para los selects de obligación)
   ------------------------------------------------------------ */
async function cargarCatalogo() {
  const resp = await api('/obligaciones-catalogo');
  if (!resp.ok) {
    showToast('No se pudo cargar el catálogo de obligaciones. Ve primero a esa sección.');
    return;
  }
  estado.catalogo = Array.isArray(resp.data) ? resp.data : [];
  const opciones = estado.catalogo
    .map((o) => `<option value="${o.idObligacionCatalogo}">${esc(o.nombre)}</option>`)
    .join('');
  $('f-obligacion').innerHTML = '<option value="">Selecciona una obligación…</option>' + opciones;
  $('filtro-obligacion').innerHTML = '<option value="">Todas las obligaciones</option>' + opciones;
}

function nombreObligacion(idObligacionCatalogo) {
  const o = estado.catalogo.find((x) => String(x.idObligacionCatalogo) === String(idObligacionCatalogo));
  return o ? o.nombre : `#${idObligacionCatalogo}`;
}

/* ------------------------------------------------------------
   Calendario: cargar, filtrar, pintar
   ------------------------------------------------------------ */
async function cargarCalendario() {
  const resp = await api('/calendario');
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
  return estado.items.filter((i) => {
    if (estado.filtroObligacion && String(i.obligacionCatalogo?.idObligacionCatalogo) !== estado.filtroObligacion) return false;
    if (estado.filtroAnio && String(i.anioFiscal) !== estado.filtroAnio) return false;
    return true;
  });
}

function pintarTabla() {
  const items = itemsFiltrados()
    .slice()
    .sort((a, b) => b.anioFiscal - a.anioFiscal || a.novenoDigito - b.novenoDigito);
  const tbody = $('tabla-body');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="padding:20px 18px;">${estado.items.length ? 'No hay filas con ese filtro.' : 'Todavía no hay calendario cargado. Crea la primera fila con "+ Nueva fila".'}</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map((i) => `
    <tr>
      <td>${i.anioFiscal}</td>
      <td>${esc(i.obligacionCatalogo?.nombre || nombreObligacion(i.obligacionCatalogo?.idObligacionCatalogo))}</td>
      <td>${i.novenoDigito}</td>
      <td>${esc(MESES_LARGOS[i.mesVencimiento - 1] || i.mesVencimiento)}</td>
      <td>${i.diaVencimiento}</td>
      <td style="white-space:nowrap;">
        <button type="button" class="btn btn-outline btn-sm" data-editar="${i.idCalendario}">Editar</button>
        <button type="button" class="btn btn-outline btn-sm" data-eliminar="${i.idCalendario}">Eliminar</button>
      </td>
    </tr>`).join('');
}

/* ------------------------------------------------------------
   Modal: crear / editar
   ------------------------------------------------------------ */
function limpiarFormulario() {
  $('form-calendario').reset();
  $('f-id').value = '';
  $('f-anio').value = new Date().getFullYear();
}

function abrirNuevo() {
  if (!estado.catalogo.length) { showToast('Primero crea al menos una obligación en el Catálogo.'); return; }
  limpiarFormulario();
  $('modal-titulo').textContent = 'Nueva fila de calendario';
  abrirModal('modal-form');
}

function abrirEditar(id) {
  const i = estado.items.find((x) => String(x.idCalendario) === String(id));
  if (!i) return;
  $('f-id').value = i.idCalendario;
  $('f-obligacion').value = i.obligacionCatalogo?.idObligacionCatalogo || '';
  $('f-anio').value = i.anioFiscal;
  $('f-digito').value = i.novenoDigito;
  $('f-mes').value = i.mesVencimiento;
  $('f-dia').value = i.diaVencimiento;
  $('modal-titulo').textContent = 'Editar fila de calendario';
  abrirModal('modal-form');
}

async function guardar(e) {
  e.preventDefault();
  const id = $('f-id').value;
  const payload = {
    anioFiscal: Number($('f-anio').value),
    obligacionCatalogo: { idObligacionCatalogo: Number($('f-obligacion').value) },
    novenoDigito: Number($('f-digito').value),
    mesVencimiento: Number($('f-mes').value),
    diaVencimiento: Number($('f-dia').value)
  };

  const boton = e.target.querySelector('button[type="submit"]');
  boton.disabled = true;
  const resp = id
    ? await api(`/calendario/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    : await api('/calendario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  boton.disabled = false;

  if (!resp.ok) {
    showToast('No se pudo guardar. Verifica que no exista ya una fila para esa obligación, año y noveno dígito.');
    return;
  }
  cerrarModal('modal-form');
  showToast(id ? 'Fila actualizada.' : 'Fila creada.');
  await cargarCalendario();
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
  const resp = await api(`/calendario/${idAEliminar}`, { method: 'DELETE' });
  cerrarModal('modal-eliminar');
  if (!resp.ok) { showToast('No se pudo eliminar la fila.'); return; }
  showToast('Fila eliminada.');
  idAEliminar = null;
  await cargarCalendario();
}

/* ------------------------------------------------------------
   Inicialización
   ------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', async () => {
  await cargarCatalogo();
  await cargarCalendario();

  $('btn-nuevo').addEventListener('click', abrirNuevo);
  $('btn-cancelar').addEventListener('click', () => cerrarModal('modal-form'));
  $('form-calendario').addEventListener('submit', guardar);

  $('btn-cancelar-eliminar').addEventListener('click', () => cerrarModal('modal-eliminar'));
  $('btn-confirmar-eliminar').addEventListener('click', confirmarEliminar);

  $('filtro-obligacion').addEventListener('change', (e) => { estado.filtroObligacion = e.target.value; pintarTabla(); });
  $('filtro-anio').addEventListener('change', (e) => { estado.filtroAnio = e.target.value; pintarTabla(); });

  $('tabla-body').addEventListener('click', (e) => {
    const btnEditar = e.target.closest('[data-editar]');
    if (btnEditar) { abrirEditar(btnEditar.dataset.editar); return; }
    const btnEliminar = e.target.closest('[data-eliminar]');
    if (btnEliminar) { pedirEliminar(btnEliminar.dataset.eliminar); return; }
  });
});