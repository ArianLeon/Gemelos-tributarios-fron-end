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
