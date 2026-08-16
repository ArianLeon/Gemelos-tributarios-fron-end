/* ============================================================
   GEMELO TRIBUTARIO — utilidades compartidas
   ============================================================ */

/** Formatea un número como moneda USD */
function formatUSD(value) {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Muestra un toast temporal en la parte inferior de la pantalla */
function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
      '<span class="toast-text"></span>';
    document.body.appendChild(toast);
  }
  toast.querySelector('.toast-text').textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

/** Lee un valor guardado en localStorage con espacio de nombres del prototipo */
function gtGet(key, fallback) {
  try {
    const raw = localStorage.getItem('gt_' + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

/** Guarda un valor en localStorage con espacio de nombres del prototipo */
function gtSet(key, value) {
  try {
    localStorage.setItem('gt_' + key, JSON.stringify(value));
  } catch (e) {
    /* almacenamiento no disponible: se ignora en este prototipo */
  }
}

/** Etiquetas legibles para cada valor de régimen guardado */
const GT_REGIMEN_LABELS = {
  rimpe_emprendedor: 'RIMPE – Emprendedor',
  rimpe_negocio_popular: 'RIMPE – Negocio Popular',
  general: 'Régimen General',
  especial: 'Régimen/actividad especial'
};

/** Abre/cierra los paneles desplegables del header (notificaciones, usuario).
 *  No hace nada en páginas que no tengan estos elementos. */
function initHeaderDropdowns() {
  document.querySelectorAll('[data-dropdown-toggle]').forEach((toggle) => {
    const panel = document.getElementById(toggle.getAttribute('data-dropdown-toggle'));
    if (!panel) return;
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !panel.classList.contains('open');
      document.querySelectorAll('.dropdown-panel.open').forEach((p) => p.classList.remove('open'));
      document.querySelectorAll('[data-dropdown-toggle].open').forEach((t) => t.classList.remove('open'));
      if (willOpen) {
        panel.classList.add('open');
        toggle.classList.add('open');
      }
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-panel.open').forEach((p) => p.classList.remove('open'));
    document.querySelectorAll('[data-dropdown-toggle].open').forEach((t) => t.classList.remove('open'));
  });
}

/** Sincroniza el nombre/iniciales del usuario en la barra superior, si existe en la página */
function syncTopbarUser() {
  const nombre = gtGet('perfil_nombre', 'Heidy Landi');
  const iniciales = nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'GT';
  const avatarEl = document.getElementById('topbar-avatar');
  if (avatarEl) avatarEl.textContent = iniciales;
  const nameEl = document.getElementById('topbar-nombre');
  if (nameEl) nameEl.textContent = nombre.split(' ')[0] || nombre;
}

/** Sincroniza el régimen mostrado en la tarjeta de la barra lateral, si existe en la página */
function syncSidebarRegimen() {
  const regimen = gtGet('perfil_regimen', 'rimpe_emprendedor');
  const label = GT_REGIMEN_LABELS[regimen] || GT_REGIMEN_LABELS.rimpe_emprendedor;
  document.querySelectorAll('#sidebar-regimen, #situation-regimen').forEach((el) => {
    el.textContent = label;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initHeaderDropdowns();
  syncTopbarUser();
  syncSidebarRegimen();
});