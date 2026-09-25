/* ============================================================
   Aprender — Gemelo Tributario (conectado al backend real)
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

/** Convierte el nombre de un tema en el valor usado por data-categoria de los chips. */
function categoriaDeTema(tema) {
  return (tema || '').trim().toLowerCase();
}

let mapaCompletados = {}; // idGuia -> true/false

/* ------------------------------------------------------------
   Utilidades propias (antes vivian en main.js)
   ------------------------------------------------------------ */
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

document.addEventListener('DOMContentLoaded', async () => {
  initHeaderDropdowns();
  cargarUsuario();
  cargarPerfil();
  cargarNotificaciones();
  await cargarTemas();
  cargarContenido();

  document.getElementById('cerrar-sesion').addEventListener('click', () => {
    localStorage.removeItem('gt_id_usuario');
  });

  document.getElementById('learnSearch').addEventListener('input', aplicarFiltros);
});

/** Trae los temas creados por el admin y arma los chips de categoría. */
async function cargarTemas() {
  const fila = document.getElementById('category-row');
  try {
    const res = await fetch(`${API_URL}/temas-guia`);
    if (!res.ok) return;
    const temas = await res.json();
    temas.forEach((t) => {
      const btn = document.createElement('button');
      btn.className = 'category-chip';
      btn.dataset.categoria = categoriaDeTema(t.nombre);
      btn.textContent = t.nombre;
      fila.appendChild(btn);
    });
  } catch (e) {
    /* si falla, se queda solo el chip "Todas" */
  }
}

/* ------------------------------------------------------------
   Usuario / perfil / notificaciones (mismo patron del resto de la app)
   ------------------------------------------------------------ */
async function cargarUsuario() {
  const res = await fetch(`${API_URL}/usuarios/${idUsuario}`);
  if (!res.ok) return;
  const usuario = await res.json();

  document.getElementById('topbar-nombre').textContent = usuario.primerNombre || 'Usuario';
  const avatarEl = document.getElementById('topbar-avatar');
  if (usuario.fotoUrl) {
    avatarEl.innerHTML = `<img src="http://localhost:8080${usuario.fotoUrl}" alt="Foto de perfil" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    const iniciales = (usuario.primerNombre?.[0] || '') + (usuario.apellidoPaterno?.[0] || '');
    avatarEl.textContent = iniciales.toUpperCase() || 'GT';
  }
}

async function cargarPerfil() {
  const res = await fetch(`${API_URL}/perfiles-tributarios/usuario/${idUsuario}`);
  if (!res.ok) return;
  const perfil = await res.json();
  const label = REGIMEN_LABEL[perfil.regimen] || perfil.regimen;
  document.getElementById('sidebar-regimen').textContent = label;
  document.getElementById('recommend-title').textContent = `Contenido para ${label}`;
}

async function cargarNotificaciones() {
  const res = await fetch(`${API_URL}/notificaciones/usuario/${idUsuario}`);
  if (!res.ok) return;
  const notificaciones = await res.json();
  document.getElementById('notif-count').textContent = notificaciones.filter((n) => !n.leida).length;
  const lista = document.getElementById('notif-lista');
  lista.innerHTML = notificaciones.length === 0
    ? '<div class="notif-item"><span>No tienes notificaciones.</span></div>' : '';
  notificaciones.slice(0, 5).forEach((n) => {
    const item = document.createElement('div');
    item.className = 'notif-item';
    item.innerHTML = `<strong>${n.titulo}</strong><span>${n.mensaje}</span>`;
    lista.appendChild(item);
  });
}

/* ------------------------------------------------------------
   Contenido real: guias (videos + materiales) y su progreso.
   Las FAQs y los "casos reales" se quitaron de esta vista.
   ------------------------------------------------------------ */
async function cargarContenido() {
  const [guiasRes, progresoRes] = await Promise.all([
    fetch(`${API_URL}/guias-aprendizaje`),
    fetch(`${API_URL}/progreso-guias/usuario/${idUsuario}`)
  ]);

  let guias = guiasRes.ok ? await guiasRes.json() : [];
  guias = guias.filter((g) => g.vigente);

  if (progresoRes.ok) {
    const progreso = await progresoRes.json();
    progreso.forEach((p) => { mapaCompletados[p.guia.idGuia] = p.completado; });
  }

  const videos = guias.filter((g) => g.tipoContenido === 'VIDEO');
  const materiales = guias.filter((g) => g.tipoContenido === 'ARTICULO' || g.tipoContenido === 'CURSO');

  pintarVideos(videos);
  pintarContinuaRecomendado(videos);
  pintarMateriales(materiales);

  configurarCategorias();
}

function pintarVideos(videos) {
  const contenedor = document.getElementById('videos-lista');
  if (videos.length === 0) {
    contenedor.innerHTML = '<p class="text-muted" style="font-size:12.5px;">Aún no hay videos publicados.</p>';
    return;
  }

  contenedor.innerHTML = '';
  videos.forEach((v) => {
    const categoria = categoriaDeTema(v.tema);
    const completado = !!mapaCompletados[v.idGuia];
    const duracion = v.duracionMinutos ? `${v.duracionMinutos} min` : '';

    const card = document.createElement('div');
    card.className = 'card video-card';
    card.dataset.categoria = categoria;
    card.dataset.titulo = v.titulo.toLowerCase();
    card.innerHTML = `
      <div class="video-thumb">
        <video controls preload="metadata" playsinline>
          <source src="${v.contenidoUrl || ''}" type="video/mp4">
          Tu navegador no soporta la reproducción de video.
        </video>
        <span class="video-cat-tag">${v.tema}</span>
      </div>
      <div class="video-info">
        <span>${v.tema}</span>
        <h4>${v.titulo}</h4>
        <p>${v.resumen || ''}</p>
      </div>
      <div class="video-meta-row">
        ${completado
          ? '<span class="level-badge done"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>Completado</span>'
          : ''}
        <span class="time"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>${duracion}</span>
      </div>
    `;

    const videoEl = card.querySelector('video');
    videoEl.addEventListener('ended', () => marcarVideoCompletado(v.idGuia, card));

    contenedor.appendChild(card);
  });
}

async function marcarVideoCompletado(idGuia, card) {
  if (mapaCompletados[idGuia]) return; // ya estaba completado
  const res = await fetch(`${API_URL}/progreso-guias/usuario/${idUsuario}/guia/${idGuia}?completado=true`, { method: 'PUT' });
  if (!res.ok) return;

  mapaCompletados[idGuia] = true;
  showToast('¡Video completado!');
  const meta = card.querySelector('.level-badge');
  if (meta) {
    meta.outerHTML = '<span class="level-badge done"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>Completado</span>';
  }
  // El "Continua recomendados" depende de esto, asi que se recalcula
  cargarContenido();
}

function pintarContinuaRecomendado(videos) {
  const contenedor = document.getElementById('continua-recomendado-contenedor');
  const siguiente = videos.find((v) => !mapaCompletados[v.idGuia]);

  if (!siguiente) {
    contenedor.innerHTML = `
      <div class="card" style="padding:16px 18px;">
        <p class="text-muted" style="font-size:12.5px;margin:0;">¡Ya viste todos los videos disponibles! Vuelve pronto por más contenido.</p>
      </div>`;
    return;
  }

  contenedor.innerHTML = `
    <div class="card continue-card">
      <div class="continue-thumb">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </div>
      <div class="continue-body">
        <h4>${siguiente.titulo}</h4>
        <div class="continue-meta-row">
          <strong>${siguiente.tema}${siguiente.duracionMinutos ? ' · ' + siguiente.duracionMinutos + ' min' : ''}</strong>
          <span>Aún no lo has visto</span>
        </div>
      </div>
      <a href="#videos-lista" class="btn btn-primary">Ver ahora <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="9 18 15 12 9 6"/></svg></a>
    </div>`;
}

const ICONO_POR_TEMA = {
  IVA: 'icon-purple', RENTA: 'icon-green', RIMPE: 'icon-orange', FACTURACION: 'icon-navy'
};

function pintarMateriales(materiales) {
  const contenedor = document.getElementById('materiales-lista');
  if (materiales.length === 0) {
    contenedor.innerHTML = '<p class="text-muted" style="font-size:12.5px;">Aún no hay materiales descargables publicados.</p>';
    return;
  }

  contenedor.innerHTML = '';
  materiales.forEach((m) => {
    const categoria = categoriaDeTema(m.tema);
    const item = document.createElement('div');
    item.className = 'material-item';
    item.dataset.categoria = categoria;
    item.dataset.titulo = m.titulo.toLowerCase();

    const botonHtml = m.contenidoUrl
      ? `<a href="${m.contenidoUrl}" target="_blank" rel="noopener" download class="btn btn-outline btn-sm">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
           Descargar
         </a>`
      : `<span class="text-muted" style="font-size:11.5px;">Sin archivo</span>`;

    item.innerHTML = `
      <span class="ic ${ICONO_POR_TEMA[m.tema] || 'icon-navy'}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h9l5 5v13a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"/><path d="M9 12h6M9 16h6M9 8h1"/></svg>
      </span>
      <div class="body"><strong>${m.titulo}</strong><span>${m.resumen || m.tema}</span></div>
      ${botonHtml}
    `;
    contenedor.appendChild(item);
  });
}

/* ------------------------------------------------------------
   Filtro por categoria + busqueda de texto, ahora solo sobre
   videos y materiales descargables (las FAQs ya no viven aqui).
   ------------------------------------------------------------ */
function configurarCategorias() {
  document.querySelectorAll('.category-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.category-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      aplicarFiltros();
    });
  });
}

function aplicarFiltros() {
  const categoriaActiva = document.querySelector('.category-chip.active')?.dataset.categoria || 'todas';
  const texto = document.getElementById('learnSearch').value.trim().toLowerCase();

  document.querySelectorAll('.video-card, .material-item').forEach((el) => {
    const coincideCategoria = categoriaActiva === 'todas' || el.dataset.categoria === categoriaActiva;
    const coincideTexto = !texto || (el.dataset.titulo || '').includes(texto);
    el.classList.toggle('hidden', !(coincideCategoria && coincideTexto));
  });
}