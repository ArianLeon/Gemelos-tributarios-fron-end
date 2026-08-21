/* ============================================================
   Perfil — Gemelo Tributario
   ============================================================ */

const GT_REGIMEN_INFO = {
  rimpe_negocio_popular: 'Ingresos brutos anuales de hasta USD 20.000. Cuota fija mensual y facturación simplificada.',
  rimpe_emprendedor: 'Ingresos brutos superiores a USD 20.000 y hasta USD 300.000 anuales.',
  general: 'Sin límite de ingresos. Declaración de IVA y Renta según el calendario general del SRI.',
  especial: 'Aplica a actividades o sectores con un tratamiento tributario particular.',
  estudiante: 'Estudiantes de contabilidad, tributación y otras ramas que estén relacionados'
};

document.addEventListener('DOMContentLoaded', () => {
  cargarPerfil();
  document.getElementById('form-perfil').addEventListener('submit', guardarPerfil);

  const selectRegimen = document.getElementById('perfil-regimen');
  if (selectRegimen) {
    selectRegimen.addEventListener('change', () => actualizarInfoRegimen(selectRegimen.value));
  }

  document.querySelectorAll('.switch input').forEach((sw) => {
    sw.checked = gtGet('pref_' + sw.dataset.pref, sw.checked);
    sw.addEventListener('change', () => {
      gtSet('pref_' + sw.dataset.pref, sw.checked);
      showToast(sw.checked ? 'Preferencia activada' : 'Preferencia desactivada');
    });
  });

  const updatedEl = document.getElementById('regime-updated');
  if (updatedEl) {
    const ahora = new Date();
    const hora = ahora.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    updatedEl.textContent = 'Actualizado: hoy, ' + hora;
  }
});

function cargarPerfil() {
  const nombre = gtGet('perfil_nombre', 'Heidy Landi');
  const negocio = gtGet('perfil_negocio', 'Emprendimientos HL');
  const regimen = gtGet('perfil_regimen', 'rimpe_emprendedor');
  const tipoContribuyente = gtGet('perfil_tipo_contribuyente', '');
  const actividad = gtGet('perfil_actividad', 'servicios');

  document.getElementById('perfil-nombre').value = nombre;
  document.getElementById('perfil-negocio').value = negocio;
  document.getElementById('perfil-regimen').value = regimen;
  document.getElementById('perfil-tipo-contribuyente').value = tipoContribuyente;
  const actividadEl = document.getElementById('perfil-actividad');
  if (actividadEl) actividadEl.value = actividad;

  actualizarCabecera(nombre, regimen);
  actualizarInfoRegimen(regimen);
}

function guardarPerfil(e) {
  e.preventDefault();
  const nombre = document.getElementById('perfil-nombre').value.trim() || 'Sin nombre';
  const negocio = document.getElementById('perfil-negocio').value.trim();
  const regimen = document.getElementById('perfil-regimen').value;
  const tipoContribuyente = document.getElementById('perfil-tipo-contribuyente').value;
  const actividadEl = document.getElementById('perfil-actividad');
  const actividad = actividadEl ? actividadEl.value : '';

  gtSet('perfil_nombre', nombre);
  gtSet('perfil_negocio', negocio);
  gtSet('perfil_regimen', regimen);
  gtSet('perfil_tipo_contribuyente', tipoContribuyente);
  gtSet('perfil_actividad', actividad);

  actualizarCabecera(nombre, regimen);
  actualizarInfoRegimen(regimen);
  if (typeof syncTopbarUser === 'function') syncTopbarUser();
  if (typeof syncSidebarRegimen === 'function') syncSidebarRegimen();
  showToast('Perfil guardado correctamente');
}

function actualizarCabecera(nombre, regimen) {
  const iniciales = nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
  const avatar = document.getElementById('avatar-iniciales');
  if (avatar) avatar.textContent = iniciales || 'GT';

  const nombreEl = document.getElementById('perfil-nombre-display');
  if (nombreEl) nombreEl.textContent = nombre;

  const labels = (typeof GT_REGIMEN_LABELS !== 'undefined') ? GT_REGIMEN_LABELS : {
    rimpe_emprendedor: 'RIMPE – Emprendedor',
    rimpe_negocio_popular: 'RIMPE – Negocio Popular',
    general: 'Régimen General',
    especial: 'Régimen/actividad especial'
  };
  const regimenEl = document.getElementById('perfil-regimen-display');
  if (regimenEl) regimenEl.textContent = labels[regimen] || regimen;
}

function actualizarInfoRegimen(regimen) {
  const textEl = document.getElementById('regimen-info-text');
  if (textEl) textEl.textContent = GT_REGIMEN_INFO[regimen] || GT_REGIMEN_INFO.rimpe_emprendedor;
}