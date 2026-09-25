const estado = { items: [], perfiles: [], busqueda: '', filtroEstado: '' };
const $ = (id) => document.getElementById(id);

function nombreCompleto(u) {
  return [u.primerNombre, u.apellidoPaterno].filter(Boolean).join(' ');
}

async function cargarUsuarios() {
  const [respUsuarios, respPerfiles] = await Promise.all([api('/usuarios'), api('/perfiles-tributarios')]);
  if (!respUsuarios.ok) {
    $('tabla-body').innerHTML = '<tr><td colspan="6" class="text-muted" style="padding:20px 18px;">No se pudo conectar con el servidor.</td></tr>';
    return;
  }
  estado.items = Array.isArray(respUsuarios.data) ? respUsuarios.data : [];
  estado.perfiles = respPerfiles.ok && Array.isArray(respPerfiles.data) ? respPerfiles.data : [];
  pintarKpis();
  pintarTabla();
}

function tienePerfil(idUsuario) {
  return estado.perfiles.some((p) => String(p.usuario?.idUsuario) === String(idUsuario));
}

function pintarKpis() {
  const activos = estado.items.filter((u) => u.activo).length;
  $('kpi-total').textContent = estado.items.length;
  $('kpi-activos').textContent = activos;
  $('kpi-inactivos').textContent = estado.items.length - activos;
  $('kpi-sin-perfil').textContent = estado.items.filter((u) => !tienePerfil(u.idUsuario)).length;
}

function itemsFiltrados() {
  const q = estado.busqueda.trim().toLowerCase();
  return estado.items.filter((u) => {
    if (estado.filtroEstado === 'activo' && !u.activo) return false;
    if (estado.filtroEstado === 'inactivo' && u.activo) return false;
    if (q && !(nombreCompleto(u).toLowerCase().includes(q) || (u.correo || '').toLowerCase().includes(q))) return false;
    return true;
  });
}

function pintarTabla() {
  const items = itemsFiltrados();
  const tbody = $('tabla-body');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted" style="padding:20px 18px;">${estado.items.length ? 'No hay resultados.' : 'Todavía no hay usuarios registrados.'}</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map((u) => `
    <tr>
      <td>${esc(nombreCompleto(u))}</td>
      <td>${esc(u.correo)}</td>
      <td>${esc(u.telefono) || '—'}</td>
      <td>${u.fechaCreacion ? esc(u.fechaCreacion.slice(0, 10)) : '—'}</td>
      <td><span class="status-pill ${u.activo ? 'ok' : 'due'}">${u.activo ? 'Activo' : 'Inactivo'}</span></td>
      <td style="white-space:nowrap;">
        <button type="button" class="btn btn-outline btn-sm" data-editar="${u.idUsuario}">Editar</button>
        <button type="button" class="btn btn-outline btn-sm" data-eliminar="${u.idUsuario}">Eliminar</button>
      </td>
    </tr>`).join('');
}

function abrirEditar(id) {
  const u = estado.items.find((x) => String(x.idUsuario) === String(id));
  if (!u) return;
  $('f-id').value = u.idUsuario;
  $('f-primer-nombre').value = u.primerNombre || '';
  $('f-segundo-nombre').value = u.segundoNombre || '';
  $('f-apellido-paterno').value = u.apellidoPaterno || '';
  $('f-apellido-materno').value = u.apellidoMaterno || '';
  $('f-correo').value = u.correo || '';
  $('f-telefono').value = u.telefono || '';
  $('f-activo').checked = !!u.activo;
  window._fotoActual = u.fotoUrl || null;  
  $('modal-titulo').textContent = 'Editar usuario';
  abrirModal('modal-form');
}

async function guardar(e) {
  e.preventDefault();
  const id = $('f-id').value;
  const payload = {
    primerNombre: $('f-primer-nombre').value.trim(),
    segundoNombre: $('f-segundo-nombre').value.trim(),
    apellidoPaterno: $('f-apellido-paterno').value.trim(),
    apellidoMaterno: $('f-apellido-materno').value.trim(),
    correo: $('f-correo').value.trim(),
    telefono: $('f-telefono').value.trim(),
    activo: $('f-activo').checked,
    fotoUrl: window._fotoActual || null
  };
  const boton = e.target.querySelector('button[type="submit"]');
  boton.disabled = true;
  const resp = await api(`/usuarios/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  boton.disabled = false;
  if (!resp.ok) { showToast('No se pudo guardar. Revisa que el correo no esté en uso por otra cuenta.'); return; }
  cerrarModal('modal-form');
  showToast('Usuario actualizado.');
  await cargarUsuarios();
}

let idAEliminar = null;
function pedirEliminar(id) { idAEliminar = id; abrirModal('modal-eliminar'); }
async function confirmarEliminar() {
  if (!idAEliminar) return;
  const resp = await api(`/usuarios/${idAEliminar}`, { method: 'DELETE' });
  cerrarModal('modal-eliminar');
  if (!resp.ok) { showToast('No se pudo eliminar. Puede que tenga datos asociados (perfil, obligaciones, etc.).'); return; }
  showToast('Usuario eliminado.');
  idAEliminar = null;
  await cargarUsuarios();
}

document.addEventListener('DOMContentLoaded', () => {
  cargarUsuarios();
  $('btn-cancelar').addEventListener('click', () => cerrarModal('modal-form'));
  $('form-usuario').addEventListener('submit', guardar);
  $('btn-cancelar-eliminar').addEventListener('click', () => cerrarModal('modal-eliminar'));
  $('btn-confirmar-eliminar').addEventListener('click', confirmarEliminar);
  $('buscar').addEventListener('input', debounce((e) => { estado.busqueda = e.target.value; pintarTabla(); }, 200));
  $('filtro-estado').addEventListener('change', (e) => { estado.filtroEstado = e.target.value; pintarTabla(); });
  $('tabla-body').addEventListener('click', (e) => {
    const be = e.target.closest('[data-editar]'); if (be) return abrirEditar(be.dataset.editar);
    const bd = e.target.closest('[data-eliminar]'); if (bd) return pedirEliminar(bd.dataset.eliminar);
  });
});