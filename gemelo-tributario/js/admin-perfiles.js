const REGIMEN_LABEL = { RIMPE_NEGOCIO_POPULAR: 'RIMPE – Negocio Popular', RIMPE_EMPRENDEDOR: 'RIMPE – Emprendedor', GENERAL: 'Régimen General' };
const estado = { items: [], busqueda: '', filtroRegimen: '' };
const $ = (id) => document.getElementById(id);

function nombreCompleto(u) {
  return u ? [u.primerNombre, u.apellidoPaterno].filter(Boolean).join(' ') : '(sin usuario)';
}

async function cargarPerfiles() {
  const resp = await api('/perfiles-tributarios');
  if (!resp.ok) {
    $('tabla-body').innerHTML = '<tr><td colspan="7" class="text-muted" style="padding:20px 18px;">No se pudo conectar con el servidor.</td></tr>';
    return;
  }
  estado.items = Array.isArray(resp.data) ? resp.data : [];
  pintarTabla();
}

function itemsFiltrados() {
  const q = estado.busqueda.trim().toLowerCase();
  return estado.items.filter((p) => {
    if (estado.filtroRegimen && p.regimen !== estado.filtroRegimen) return false;
    if (q && !(nombreCompleto(p.usuario).toLowerCase().includes(q) || (p.usuario?.correo || '').toLowerCase().includes(q) || (p.rucCedula || '').includes(q))) return false;
    return true;
  });
}

function pintarTabla() {
  const items = itemsFiltrados();
  const tbody = $('tabla-body');
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted" style="padding:20px 18px;">${estado.items.length ? 'No hay resultados.' : 'Todavía no hay perfiles tributarios registrados.'}</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map((p) => `
    <tr>
      <td>${esc(nombreCompleto(p.usuario))}<br><span class="text-muted" style="font-size:11.5px;">${esc(p.usuario?.correo || '')}</span></td>
      <td class="mono">${esc(p.rucCedula)}</td>
      <td>${esc(REGIMEN_LABEL[p.regimen] || p.regimen)}</td>
      <td>${p.novenoDigito}</td>
      <td>${p.obligadoContabilidad ? 'Sí' : 'No'}</td>
      <td>${p.agenteRetencion ? 'Sí' : 'No'}</td>
      <td style="white-space:nowrap;"><button type="button" class="btn btn-outline btn-sm" data-editar="${p.idPerfil}">Editar</button></td>
    </tr>`).join('');
}

function abrirEditar(id) {
  const p = estado.items.find((x) => String(x.idPerfil) === String(id));
  if (!p) return;
  $('f-id').value = p.idPerfil;
  $('f-usuario-info').textContent = `${nombreCompleto(p.usuario)} · ${p.usuario?.correo || ''}`;
  $('f-ruc').value = p.rucCedula || '';
  $('f-digito').value = p.novenoDigito;
  $('f-regimen').value = p.regimen;
  $('f-tipo-contribuyente').value = p.tipoContribuyente;
  $('f-nombre-negocio').value = p.nombreNegocio || '';
  $('f-direccion-negocio').value = p.direccionNegocio || '';
  document.getElementById(p.obligadoContabilidad ? 'f-contabilidad-si' : 'f-contabilidad-no').checked = true;
  $('f-agente-retencion').checked = !!p.agenteRetencion;
  $('modal-titulo').textContent = 'Editar perfil tributario';
  abrirModal('modal-form');
}

async function guardar(e) {
  e.preventDefault();
  const id = $('f-id').value;
  const payload = {
    rucCedula: $('f-ruc').value.trim(),
    novenoDigito: Number($('f-digito').value),
    regimen: $('f-regimen').value,
    tipoContribuyente: $('f-tipo-contribuyente').value,
    nombreNegocio: $('f-nombre-negocio').value.trim(),
    direccionNegocio: $('f-direccion-negocio').value.trim(),
    obligadoContabilidad: document.querySelector('input[name="f-contabilidad"]:checked')?.value === 'si',
    agenteRetencion: $('f-agente-retencion').checked
  };
  const boton = e.target.querySelector('button[type="submit"]');
  boton.disabled = true;
  const resp = await api(`/perfiles-tributarios/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  boton.disabled = false;
  if (!resp.ok) { showToast('No se pudo guardar. Revisa que el RUC/cédula no esté en uso por otro perfil.'); return; }
  cerrarModal('modal-form');
  showToast('Perfil actualizado.');
  await cargarPerfiles();
}

document.addEventListener('DOMContentLoaded', () => {
  cargarPerfiles();
  $('btn-cancelar').addEventListener('click', () => cerrarModal('modal-form'));
  $('form-perfil').addEventListener('submit', guardar);
  $('buscar').addEventListener('input', debounce((e) => { estado.busqueda = e.target.value; pintarTabla(); }, 200));
  $('filtro-regimen').addEventListener('change', (e) => { estado.filtroRegimen = e.target.value; pintarTabla(); });
  $('tabla-body').addEventListener('click', (e) => {
    const be = e.target.closest('[data-editar]'); if (be) return abrirEditar(be.dataset.editar);
  });
});