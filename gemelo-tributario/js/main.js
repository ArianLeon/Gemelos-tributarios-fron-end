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


/* ============================================================
   LANDING — efecto de escritura en el titular
   ============================================================ */

/**
 * Escribe texto letra por letra dentro de un contenedor.
 * `segments` es un arreglo de { text, em } donde `em` marca el
 * tramo que debe ir resaltado (envuelto en <em>).
 */
function typeWriter(containerEl, segments, speed) {
  if (!containerEl) return;
  containerEl.textContent = '';

  // Si el usuario prefiere menos movimiento, mostramos el texto completo de una vez.
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    segments.forEach((seg) => {
      const node = seg.em ? document.createElement('em') : document.createTextNode('');
      if (seg.em) {
        node.textContent = seg.text;
        containerEl.appendChild(node);
      } else {
        containerEl.appendChild(document.createTextNode(seg.text));
      }
    });
    return;
  }

  // Aplanamos los segmentos en una lista de caracteres + si van resaltados o no.
  const chars = [];
  segments.forEach((seg) => {
    seg.text.split('').forEach((ch) => chars.push({ ch, em: !!seg.em }));
  });

  let i = 0;
  let currentEm = null;

  function typeNext() {
    if (i >= chars.length) return;
    const { ch, em } = chars[i];

    if (em) {
      if (!currentEm) {
        currentEm = document.createElement('em');
        containerEl.appendChild(currentEm);
      }
      currentEm.textContent += ch;
    } else {
      currentEm = null;
      containerEl.appendChild(document.createTextNode(ch));
    }

    i++;
    // Pausa un poco más larga después de signos de puntuación, para un ritmo más natural.
    const extra = /[.,]/.test(ch) ? 160 : 0;
    setTimeout(typeNext, speed + extra);
  }

  typeNext();
}

function initHeroTypewriter() {
  const target = document.getElementById('hero-typewriter');
  if (!target) return;
  typeWriter(target, [
    { text: 'La ley tributaria, ' },
    { text: 'traducida', em: true },
    { text: ' a decisiones simples.' }
  ], 38);
}


/* ============================================================
   LANDING — animaciones al hacer scroll (reveal + contadores)
   ============================================================ */

function initScrollReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  items.forEach((el) => observer.observe(el));
}

function initCountUp() {
  const items = document.querySelectorAll('[data-countup]');
  if (!items.length) return;

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const animate = (el) => {
    const target = parseInt(el.getAttribute('data-countup'), 10) || 0;
    if (reduceMotion) {
      el.textContent = target;
      return;
    }
    const duration = 900;
    const start = performance.now();
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(progress * target);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  };

  if (!('IntersectionObserver' in window)) {
    items.forEach(animate);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animate(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.4 });

  items.forEach((el) => observer.observe(el));
}


/* ============================================================
   LANDING — pie de página: enlaces de ejemplo (no navegan)
   ============================================================ */

function initFooterPlaceholderLinks() {
  document.querySelectorAll('.footer-col a[href="#"], .footer-bottom-links a[href="#"], .social-btn[href="#"]')
    .forEach((a) => {
      a.addEventListener('click', (e) => e.preventDefault());
    });

  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
}


/* ============================================================
   LANDING — formulario de satisfacción (estrellas + comentario)
   ============================================================ */

function renderFeedbackList(list) {
  const wrap = document.getElementById('feedback-recent');
  if (!wrap) return;
  wrap.innerHTML = '';

  list.slice(0, 6).forEach((item) => {
    const row = document.createElement('div');
    row.className = 'feedback-item';
    row.innerHTML =
      '<span class="stars-mini">' + '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating) + '</span>' +
      '<p><strong>' + (item.name || 'Usuario de la demo') + ':</strong> ' + item.comment + '</p>';
    wrap.appendChild(row);
  });
}

function initFeedbackForm() {
  const form = document.getElementById('feedback-form');
  const starsRow = document.getElementById('stars-row');
  if (!form || !starsRow) return;

  let selectedRating = 0;
  const starButtons = Array.from(starsRow.querySelectorAll('.star-btn'));

  function paintStars(value) {
    starButtons.forEach((btn) => {
      const v = parseInt(btn.getAttribute('data-value'), 10);
      btn.classList.toggle('active', v <= value);
    });
  }

  starButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedRating = parseInt(btn.getAttribute('data-value'), 10);
      paintStars(selectedRating);
    });
    btn.addEventListener('mouseenter', () => paintStars(parseInt(btn.getAttribute('data-value'), 10)));
  });
  starsRow.addEventListener('mouseleave', () => paintStars(selectedRating));

  
  const stored = gtGet('feedback_demo', null);
  const list = stored && stored.length ? stored : seed;
  renderFeedbackList(list);

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (selectedRating === 0) {
      showToast('Elige una calificación antes de enviar');
      return;
    }

    const nameEl = document.getElementById('feedback-name');
    const commentEl = document.getElementById('feedback-comment');
    const comment = commentEl.value.trim();

    if (!comment) {
      showToast('Cuéntanos algo en el comentario');
      commentEl.focus();
      return;
    }

    const entry = {
      name: nameEl.value.trim(),
      rating: selectedRating,
      comment
    };

    const current = gtGet('feedback_demo', list);
    const updated = [entry, ...current];
    gtSet('feedback_demo', updated);
    renderFeedbackList(updated);

    form.reset();
    selectedRating = 0;
    paintStars(0);
    showToast('¡Gracias por tu opinión!');
  });
}


/* ============================================================
   LOGIN — mostrar/ocultar contraseña, validación y envío
   ============================================================ */

const EYE_OPEN_PATH = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
const EYE_OFF_PATH = '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-3.22 4.4M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/>';

function initPasswordToggle() {
  const toggle = document.getElementById('password-toggle');
  const passwordInput = document.getElementById('login-password');
  const icon = document.getElementById('eye-icon');
  if (!toggle || !passwordInput || !icon) return;

  toggle.addEventListener('click', () => {
    const showing = passwordInput.type === 'text';
    passwordInput.type = showing ? 'password' : 'text';
    icon.innerHTML = showing ? EYE_OPEN_PATH : EYE_OFF_PATH;
    toggle.setAttribute('aria-pressed', String(!showing));
    toggle.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
  });
}

function setFieldError(inputEl, errorEl, message) {
  if (!inputEl || !errorEl) return;
  errorEl.textContent = message || '';
  inputEl.classList.toggle('invalid', !!message);
}




/* ============================================================
   Inicialización
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initHeaderDropdowns();
  syncTopbarUser();
  syncSidebarRegimen();

  // Estas funciones solo actúan si sus elementos existen en la página (landing).
  initHeroTypewriter();
  initScrollReveal();
  initCountUp();
  initFooterPlaceholderLinks();
  initFeedbackForm();

  // Estas solo actúan en la página de inicio de sesión.
  initPasswordToggle();
  initLoginForm();
});