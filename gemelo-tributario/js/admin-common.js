/* ============================================================
   Funciones compartidas por todas las páginas del panel de
   administración (Resumen y los 12 módulos). Cárgalo en TODAS
   las páginas admin-*.html, antes del script propio de cada una.
   ============================================================ */

const API_URL = 'http://localhost:8080/api';

/* Barrera de conveniencia: si no hay sesión de administrador, saca de aquí.
   No es seguridad real (el backend no verifica el rol de nada) — solo evita
   que un usuario normal entre por accidente a estas pantallas. */
if (localStorage.getItem('gt_rol') !== 'ADMIN') {
  window.location.href = 'Login.html';
}

/** Llama al backend. Devuelve { ok, status, data } y nunca lanza. */
async function api(path, options) {
  try {
    const res = await fetch(`${API_URL}${path}`, options);
    if (!res.ok) {
      let data = null;
      try { data = await res.json(); } catch (e) { /* sin cuerpo o no es JSON */ }
      return { ok: false, status: res.status, data };
    }
    let data = null;
    if (res.status !== 204) {
      try { data = await res.json(); } catch (e) { data = null; }
    }
    return { ok: true, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: null };
  }
}

/** Abre/cierra los paneles desplegables del header (usuario, avisos). */
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

/** Muestra un toast temporal en la parte inferior de la pantalla. */
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

/** Abre/cierra un modal: el HTML ya está en la página, solo le movemos la clase "show". */
function abrirModal(id) { document.getElementById(id)?.classList.add('show'); }
function cerrarModal(id) { document.getElementById(id)?.classList.remove('show'); }

/** Cierra el modal si el clic fue sobre el fondo oscuro (fuera de la tarjeta blanca). */
function initCierreModalesPorFondo() {
  document.querySelectorAll('.modal-overlay').forEach((overlay) => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('show');
    });
  });
}

/** Cierra la sesión de administrador (borra lo mismo que guarda el login). */
function initCerrarSesion() {
  document.getElementById('cerrar-sesion')?.addEventListener('click', () => {
    localStorage.removeItem('gt_id_usuario');
    localStorage.removeItem('gt_rol');
  });
}

/** Espera a que el usuario deje de escribir antes de filtrar (evita buscar en cada tecla). */
function debounce(fn, ms = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Escapa texto antes de insertarlo como HTML (todas las páginas admin lo van a necesitar). */
function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

document.addEventListener('DOMContentLoaded', () => {
  initHeaderDropdowns();
  initCierreModalesPorFondo();
  initCerrarSesion();
});