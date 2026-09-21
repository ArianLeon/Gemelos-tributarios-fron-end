/* ============================================================
   Dashboard — Gemelo Tributario (conectado al backend real)
   ============================================================ */

const API_URL = 'http://localhost:8080/api';

const idUsuario = localStorage.getItem('gt_id_usuario');
if (!idUsuario) {
  window.location.href = 'Login.html';
}

const REGIMEN_LABEL = {
  RIMPE_NEGOCIO_POPULAR: 'RIMPE – Negocio Popular',
  RIMPE_EMPRENDEDOR: 'RIMPE – Emprendedor',
  GENERAL: 'Régimen General'
};

/* ------------------------------------------------------------
   Utilidad propia de dropdowns (para notificaciones y menú de usuario)
   ------------------------------------------------------------ */
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

document.addEventListener('DOMContentLoaded', () => {
  initHeaderDropdowns();
  cargarUsuario();
  cargarSituacionYResumen();
  cargarNotificaciones();

  document.getElementById('cerrar-sesion').addEventListener('click', () => {
    localStorage.removeItem('gt_id_usuario');
  });
});

/* ------------------------------------------------------------
   Usuario: saludo, avatar/foto en la barra superior
   ------------------------------------------------------------ */
async function cargarUsuario() {
  const res = await fetch(`${API_URL}/usuarios/${idUsuario}`);
  if (!res.ok) return;
  const usuario = await res.json();

  document.getElementById('saludo-usuario').textContent = `¡Hola, ${usuario.primerNombre}! 👋`;
  document.getElementById('topbar-nombre').textContent = usuario.primerNombre;

  const avatarEl = document.getElementById('topbar-avatar');
  if (usuario.fotoUrl) {
    avatarEl.innerHTML = `<img src="http://localhost:8080${usuario.fotoUrl}" alt="Foto de perfil" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    const iniciales = (usuario.primerNombre?.[0] || '') + (usuario.apellidoPaterno?.[0] || '');
    avatarEl.textContent = iniciales.toUpperCase() || 'GT';
  }
}

/* ------------------------------------------------------------
   Situacion tributaria + resumen de obligaciones
   ------------------------------------------------------------ */
async function cargarSituacionYResumen() {
  const [perfilRes, obligacionesRes, consultasRes, guiasRes] = await Promise.all([
    fetch(`${API_URL}/perfiles-tributarios/usuario/${idUsuario}`),
    fetch(`${API_URL}/obligaciones-usuario/usuario/${idUsuario}`),
    fetch(`${API_URL}/consultas-chat/usuario/${idUsuario}`),
    fetch(`${API_URL}/progreso-guias/usuario/${idUsuario}`)
  ]);

  // --- Régimen (sidebar + tarjeta de situacion) ---
  if (perfilRes.ok) {
    const perfil = await perfilRes.json();
    const label = REGIMEN_LABEL[perfil.regimen] || perfil.regimen;
    document.getElementById('sidebar-regimen').textContent = label;
    document.getElementById('situation-regimen').textContent = label;
  }

  // --- Obligaciones: proximas, vencidas, la mas cercana ---
  let obligaciones = [];
  if (obligacionesRes.ok) obligaciones = await obligacionesRes.json();

  const proximas = obligaciones.filter((o) => o.estado === 'PROXIMA');
  const vencidas = obligaciones.filter((o) => o.estado === 'VENCIDA');
  const pendientesOProximas = obligaciones
    .filter((o) => o.estado === 'PENDIENTE' || o.estado === 'PROXIMA')
    .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));

  document.getElementById('stat-proximas').textContent = proximas.length;
  document.getElementById('stat-vencidas').textContent = vencidas.length;

  const estadoTxt = document.getElementById('situation-estado');
  const checkIcon = document.getElementById('situation-check');
  if (vencidas.length > 0) {
    estadoTxt.textContent = `${vencidas.length} obligación(es) vencida(s)`;
    estadoTxt.style.color = 'var(--red-600)';
    checkIcon.style.background = 'var(--red-600)';
  } else {
    estadoTxt.textContent = 'Sin obligaciones vencidas';
    estadoTxt.style.color = 'var(--green-600)';
    checkIcon.style.background = 'var(--green-600)';
  }

  if (pendientesOProximas.length > 0) {
    const siguiente = pendientesOProximas[0];
    document.getElementById('proxima-obligacion-titulo').textContent = siguiente.nombreObligacion || 'Obligación pendiente';

    const hoy = new Date();
    const vence = new Date(siguiente.fechaVencimiento);
    const dias = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
    document.getElementById('proxima-obligacion-dias').textContent =
      dias >= 0 ? `Vence en ${dias} día(s)` : `Venció hace ${Math.abs(dias)} día(s)`;
  } else {
    document.getElementById('proxima-obligacion-titulo').textContent = 'No tienes obligaciones pendientes';
    document.getElementById('proxima-obligacion-dias').textContent = '';
  }

  // --- Consultas al chat (total historico, ya no hay limite de plan) ---
  if (consultasRes.ok) {
    const consultas = await consultasRes.json();
    document.getElementById('stat-consultas').textContent = consultas.length;
  }

  // --- Guias guardadas ---
  if (guiasRes.ok) {
    const progreso = await guiasRes.json();
    document.getElementById('stat-guias').textContent = progreso.filter((p) => p.guardado).length;
  }

  // --- Recomendacion dinamica segun si hay obligaciones proximas ---
  const recomendacion = document.getElementById('recomendacion-texto');
  if (vencidas.length > 0) {
    recomendacion.textContent = 'Tienes obligaciones vencidas — revísalas antes de que generen multas.';
  } else if (pendientesOProximas.length > 0) {
    recomendacion.textContent = `Tu próxima obligación es "${pendientesOProximas[0].nombreObligacion}". Revisa tus compras y ventas antes de declarar.`;
  } else {
    recomendacion.textContent = 'Estás al día. Aprovecha para revisar guías nuevas en la sección Aprender.';
  }
}

/* ------------------------------------------------------------
   Notificaciones
   ------------------------------------------------------------ */
async function cargarNotificaciones() {
  const res = await fetch(`${API_URL}/notificaciones/usuario/${idUsuario}`);
  if (!res.ok) return;
  const notificaciones = await res.json();

  document.getElementById('notif-count').textContent = notificaciones.filter((n) => !n.leida).length;

  const lista = document.getElementById('notif-lista');
  lista.innerHTML = '';
  if (notificaciones.length === 0) {
    lista.innerHTML = '<div class="notif-item"><span>No tienes notificaciones por ahora.</span></div>';
    return;
  }
  notificaciones.slice(0, 5).forEach((n) => {
    const item = document.createElement('div');
    item.className = 'notif-item';
    item.innerHTML = `<strong>${n.titulo}</strong><span>${n.mensaje}</span>`;
    lista.appendChild(item);
  });
}