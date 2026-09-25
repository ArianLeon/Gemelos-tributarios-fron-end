const TIPO_LABEL = { VIDEO: 'Video', ARTICULO: 'Artículo', CURSO: 'Curso' };

const estado = { items: [], busqueda: '', filtroTema: '', temas: [] };
const $ = (id) => document.getElementById(id);

/* ------------------------------------------------------------
   Temas — CRUD chiquito para que el admin los cree desde aquí.
   Se usan para llenar el select del formulario, el filtro de
   esta tabla, y (vía /api/temas-guia) el filtro de Aprender.
   ------------------------------------------------------------ */
async function cargarTemas() {
  const resp = await api('/temas-guia');
  estado.temas = resp.ok && Array.isArray(resp.data) ? resp.data : [];
  pintarTemasLista();
  pintarSelectsTema();
}

function pintarTemasLista() {
  const cont = $('temas-lista');
  if (!estado.temas.length) {
    cont.innerHTML = '<span class="text-muted" style="font-size:12.5px;">Todavía no hay temas. Agrega el primero abajo.</span>';
    return;
  }
  cont.innerHTML = estado.temas.map((t) => `
    <span class="chip" style="display:inline-flex;align-items:center;gap:6px;padding:5px 6px 5px 12px;border:1px solid var(--border);border-radius:999px;font-size:12.5px;">
      ${esc(t.nombre)}
      <button type="button" data-eliminar-tema="${t.idTema}" title="Eliminar tema" style="border:none;background:none;cursor:pointer;color:var(--text-500);width:18px;height:18px;line-height:1;">×</button>
    </span>`).join('');
}

function pintarSelectsTema() {
  const opciones = estado.temas.map((t) => `<option value="${esc(t.nombre)}">${esc(t.nombre)}</option>`).join('');

  const fTema = $('f-tema');
  const valorPrevioForm = fTema.value;
  fTema.innerHTML = opciones;
  if (estado.temas.some((t) => t.nombre === valorPrevioForm)) fTema.value = valorPrevioForm;

  const filtro = $('filtro-tema');
  const valorPrevioFiltro = filtro.value;
  filtro.innerHTML = '<option value="">Todos los temas</option>' + opciones;
  filtro.value = valorPrevioFiltro;
}

async function crearTema(nombre) {
  const resp = await api('/temas-guia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre }) });
  if (!resp.ok) {
    showToast(resp.data?.mensaje || 'No se pudo crear el tema.');
    return;
  }
  await cargarTemas();
  showToast('Tema agregado.');
}

async function eliminarTema(id) {
  const resp = await api(`/temas-guia/${id}`, { method: 'DELETE' });
  if (!resp.ok) {
    showToast('No se pudo eliminar el tema.');
    return;
  }
  await cargarTemas();
  showToast('Tema eliminado.');
}

async function cargarGuias() {
  const resp = await api('/guias-aprendizaje');
  if (!resp.ok) {
    $('tabla-body').innerHTML = '<tr><td colspan="7" class="text-muted" style="padding:20px 18px;">No se pudo conectar con el servidor.</td></tr>';
    return;
  }
  estado.items = Array.isArray(resp.data) ? resp.data : [];
  pintarTabla();
}

function itemsFiltrados() {
  const q = estado.busqueda.trim().toLowerCase();
  return estado.items.filter((i) => {
    if (estado.filtroTema && i.tema !== estado.filtroTema) return false;
    if (q && !(i.titulo || '').toLowerCase().includes(q)) return false;
    return true;
  });
}

function pintarTabla() {
  const items = itemsFiltrados();
  const tbody = $('tabla-body');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="padding:20px 18px;">${estado.items.length ? 'No hay guías con ese filtro.' : 'Todavía no hay guías. Crea la primera con "+ Nueva guía".'}</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map((i) => `
    <tr>
      <td>${esc(i.titulo)}</td>
      <td>${esc(i.tema)}</td>
      <td>${esc(TIPO_LABEL[i.tipoContenido] || i.tipoContenido)}</td>
      <td>${i.duracionMinutos ? i.duracionMinutos + ' min' : '—'}</td>
      <td><span class="status-pill ${i.vigente ? 'ok' : 'due'}">${i.vigente ? 'Vigente' : 'Inactiva'}</span></td>
      <td style="white-space:nowrap;">
        <button type="button" class="btn btn-outline btn-sm" data-editar="${i.idGuia}">Editar</button>
        <button type="button" class="btn btn-outline btn-sm" data-eliminar="${i.idGuia}">Eliminar</button>
      </td>
    </tr>`).join('');
}

function limpiarFormulario() {
  $('form-guia').reset();
  $('f-id').value = '';
  $('f-vigente').checked = true;
  $('f-fecha').value = new Date().toISOString().slice(0, 10);
  $('f-archivo-estado').classList.add('hidden');
  $('f-archivo-estado').textContent = '';
}

function abrirNuevo() {
  limpiarFormulario();
  $('modal-titulo').textContent = 'Nueva guía';
  abrirModal('modal-form');
}

function abrirEditar(id) {
  const i = estado.items.find((x) => String(x.idGuia) === String(id));
  if (!i) return;
  $('f-id').value = i.idGuia;
  $('f-titulo').value = i.titulo || '';
  $('f-tema').value = i.tema;
  $('f-tipo').value = i.tipoContenido;
  $('f-duracion').value = i.duracionMinutos || '';
  $('f-url').value = i.contenidoUrl || '';
  $('f-resumen').value = i.resumen || '';
  $('f-fecha').value = i.fechaPublicacion || '';
  $('f-vigente').checked = !!i.vigente;
  $('f-archivo-estado').classList.add('hidden');
  $('f-archivo-estado').textContent = '';
  $('modal-titulo').textContent = 'Editar guía';
  abrirModal('modal-form');
}

/** Sube un archivo (video o documento) al backend y pone su URL en el campo de enlace. */
async function subirArchivoContenido(archivo) {
  const estadoEl = $('f-archivo-estado');
  estadoEl.classList.remove('hidden');
  estadoEl.textContent = 'Subiendo archivo…';

  const formData = new FormData();
  formData.append('archivo', archivo);

  const resp = await api('/guias-aprendizaje/archivo', { method: 'POST', body: formData });
  if (!resp.ok) {
    estadoEl.textContent = 'No se pudo subir el archivo. Intenta de nuevo.';
    return;
  }
  $('f-url').value = resp.data.url;
  estadoEl.textContent = `Archivo listo: ${archivo.name}`;
}

async function guardar(e) {
  e.preventDefault();
  const id = $('f-id').value;
  const payload = {
    titulo: $('f-titulo').value.trim(),
    tema: $('f-tema').value,
    tipoContenido: $('f-tipo').value,
    duracionMinutos: $('f-duracion').value ? Number($('f-duracion').value) : null,
    contenidoUrl: $('f-url').value.trim(),
    resumen: $('f-resumen').value.trim(),
    fechaPublicacion: $('f-fecha').value || null,
    vigente: $('f-vigente').checked
  };
  const boton = e.target.querySelector('button[type="submit"]');
  boton.disabled = true;
  const resp = id
    ? await api(`/guias-aprendizaje/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    : await api('/guias-aprendizaje', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  boton.disabled = false;
  if (!resp.ok) { showToast('No se pudo guardar la guía.'); return; }
  cerrarModal('modal-form');
  showToast(id ? 'Guía actualizada.' : 'Guía creada.');
  await cargarGuias();
}

let idAEliminar = null;
function pedirEliminar(id) { idAEliminar = id; abrirModal('modal-eliminar'); }
async function confirmarEliminar() {
  if (!idAEliminar) return;
  const resp = await api(`/guias-aprendizaje/${idAEliminar}`, { method: 'DELETE' });
  cerrarModal('modal-eliminar');
  if (!resp.ok) { showToast('No se pudo eliminar la guía.'); return; }
  showToast('Guía eliminada.');
  idAEliminar = null;
  await cargarGuias();
}

document.addEventListener('DOMContentLoaded', async () => {
  await cargarTemas();
  cargarGuias();
  $('btn-nuevo').addEventListener('click', abrirNuevo);
  $('form-tema').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('f-tema-nombre');
    const nombre = input.value.trim();
    if (!nombre) return;
    crearTema(nombre);
    input.value = '';
  });
  $('temas-lista').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-eliminar-tema]');
    if (btn) eliminarTema(btn.dataset.eliminarTema);
  });
  $('btn-cancelar').addEventListener('click', () => cerrarModal('modal-form'));
  $('form-guia').addEventListener('submit', guardar);
  $('btn-cancelar-eliminar').addEventListener('click', () => cerrarModal('modal-eliminar'));
  $('btn-confirmar-eliminar').addEventListener('click', confirmarEliminar);
  $('buscar').addEventListener('input', debounce((e) => { estado.busqueda = e.target.value; pintarTabla(); }, 200));
  $('filtro-tema').addEventListener('change', (e) => { estado.filtroTema = e.target.value; pintarTabla(); });
  $('tabla-body').addEventListener('click', (e) => {
    const be = e.target.closest('[data-editar]'); if (be) return abrirEditar(be.dataset.editar);
    const bd = e.target.closest('[data-eliminar]'); if (bd) return pedirEliminar(bd.dataset.eliminar);
  });
  $('f-archivo').addEventListener('change', (e) => {
    const archivo = e.target.files[0];
    if (archivo) subirArchivoContenido(archivo);
  });
});