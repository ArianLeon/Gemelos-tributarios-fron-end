/* ============================================================
   Perfil — Gemelo Tributario
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  cargarPerfil();
  document.getElementById('form-perfil').addEventListener('submit', guardarPerfil);
  document.querySelectorAll('.switch input').forEach((sw) => {
    sw.checked = gtGet('pref_' + sw.dataset.pref, sw.checked);
    sw.addEventListener('change', () => {
      gtSet('pref_' + sw.dataset.pref, sw.checked);
      showToast(sw.checked ? 'Preferencia activada' : 'Preferencia desactivada');
    });
  });
});

function cargarPerfil() {
  const nombre = gtGet('perfil_nombre', 'Heidy Landi');
  const negocio = gtGet('perfil_negocio', 'Emprendimientos HL');
  const regimen = gtGet('perfil_regimen', 'rimpe_emprendedor');

  document.getElementById('perfil-nombre').value = nombre;
  document.getElementById('perfil-negocio').value = negocio;
  document.getElementById('perfil-regimen').value = regimen;
  actualizarCabecera(nombre, regimen);
}

function guardarPerfil(e) {
  e.preventDefault();
  const nombre = document.getElementById('perfil-nombre').value.trim() || 'Sin nombre';
  const negocio = document.getElementById('perfil-negocio').value.trim();
  const regimen = document.getElementById('perfil-regimen').value;

  gtSet('perfil_nombre', nombre);
  gtSet('perfil_negocio', negocio);
  gtSet('perfil_regimen', regimen);

  actualizarCabecera(nombre, regimen);
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

  const regimenLabels = {
    rimpe_emprendedor: 'RIMPE Emprendedor',
    rimpe_negocio_popular: 'RIMPE Negocio Popular',
    general: 'Régimen General'
  };
  const regimenEl = document.getElementById('perfil-regimen-display');
  if (regimenEl) regimenEl.textContent = regimenLabels[regimen] || regimen;
}
