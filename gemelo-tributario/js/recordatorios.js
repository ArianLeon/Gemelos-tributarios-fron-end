/* ============================================================
   Recordatorios — Gemelo Tributario (conectado al backend real)
   Requiere main.js (showToast, gtGet/gtSet, initHeaderDropdowns).
   ============================================================ */

const API_URL = 'http://localhost:8080/api';
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

const idUsuario = localStorage.getItem('gt_id_usuario');
if (!idUsuario) {
  window.location.href = 'Login.html';
}

const REGIMEN_LABEL = {
  RIMPE_NEGOCIO_POPULAR: 'RIMPE – Negocio Popular',
  RIMPE_EMPRENDEDOR: 'RIMPE – Emprendedor',
  GENERAL: 'Régimen General'
};

/** Cómo se ve cada estado del backend en esta pantalla (clases CSS y texto). */
const ESTADO_INFO = {
  PENDIENTE: { filtro: 'pendiente', tag: 'st-pendiente', borde: 'b-pendiente', label: 'Pendiente', icono: 'icon-purple' },
  PROXIMA: { filtro: 'proxima', tag: 'st-proxima', borde: 'b-proxima', label: 'Próxima', icono: 'icon-orange' },
  VENCIDA: { filtro: 'vencida', tag: 'st-vencida', borde: 'b-vencida', label: 'Vencida', icono: 'icon-orange' }
};
/** Prioridad para decidir qué color mostrar en el mini-calendario si un día tuviera más de una obligación. */
const PRIORIDAD_ESTADO = { VENCIDA: 0, PROXIMA: 1, PENDIENTE: 2, CUMPLIDA: 3 };

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const estado = {
  obligaciones: [],
  notificaciones: [],
  filtro: 'all',
  mesCalendario: null // {anio, mes(1-12)}, se inicializa al cargar
};

/* ------------------------------------------------------------
   Utilidades
   ------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/** "2026-09-24" -> Date local a medianoche (evita el desfase de horario de `new Date(str)`). */
function parseFechaLocal(v) {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}


/** Abre/cierra los paneles desplegables del header (notificaciones, usuario). */
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
function diasEntre(desde, hasta) {
  const a = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  const b = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
  return Math.round((b - a) / 86400000);
}

function fechaCorta(d) {
  return `${d.getDate()} ${MESES_CORTOS[d.getMonth()]}. ${d.getFullYear()}`;
}

function textoDias(dias) {
  if (dias === 0) return 'Vence hoy';
  return dias > 0 ? `Vence en ${dias} día${dias === 1 ? '' : 's'}` : `Venció hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`;
}

function categoria(nombreObligacion) {
  const t = (nombreObligacion || '').toUpperCase();
  if (/RETEN/.test(t)) return 'icon-orange';
  if (/IVA/.test(t)) return 'icon-purple';
  if (/RENTA|RIMPE/.test(t)) return 'icon-green';
  return 'icon-navy';
}

/** Llama al backend. Devuelve { ok, status, data } y nunca lanza. */
async function api(path, options) {
  try {
    const res = await fetch(`${API_URL}${path}`, options);
    if (!res.ok) return { ok: false, status: res.status, data: null };
    let data = null;
    if (res.status !== 204) {
      try { data = await res.json(); } catch (e) { data = null; }
    }
    return { ok: true, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: null };
  }
}

function mostrarAviso(mensaje) {
  const el = $('error-conexion');
  el.textContent = mensaje;
  el.classList.remove('hidden');
}
function ocultarAviso() {
  $('error-conexion').classList.add('hidden');
}

/* ============================================================
   ENCABEZADO: usuario, régimen, notificaciones, cerrar sesión
   ============================================================ */
async function cargarUsuario() {
  const resp = await api(`/usuarios/${idUsuario}`);
  if (!resp.ok) {
    if (resp.status === 400 || resp.status === 404) {
      localStorage.removeItem('gt_id_usuario');
      window.location.href = 'Login.html';
    }
    return;
  }
  const usuario = resp.data;
  $('topbar-nombre').textContent = usuario.primerNombre || '';
  const avatarEl = $('topbar-avatar');
  if (usuario.fotoUrl) {
    avatarEl.innerHTML = `<img src="${esc(API_ORIGIN + usuario.fotoUrl)}" alt="Foto de perfil" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    const iniciales = ((usuario.primerNombre || '')[0] || '') + ((usuario.apellidoPaterno || '')[0] || '');
    avatarEl.textContent = iniciales.toUpperCase() || 'GT';
  }
}

async function cargarPerfil() {
  const resp = await api(`/perfiles-tributarios/usuario/${idUsuario}`);
  if (!resp.ok) {
    mostrarAviso('Todavía no has completado tu perfil tributario. Complétalo en "Mi perfil" para que podamos calcular tus obligaciones.');
    return false;
  }
  $('sidebar-regimen').textContent = REGIMEN_LABEL[resp.data.regimen] || resp.data.regimen || '—';
  return true;
}

function pintarNotificaciones() {
  const noLeidas = estado.notificaciones.filter((n) => !n.leida);
  const badge = $('notif-count');
  badge.textContent = noLeidas.length > 9 ? '9+' : String(noLeidas.length);

  const lista = $('notif-lista');
  lista.innerHTML = estado.notificaciones.length
    ? estado.notificaciones.slice(0, 6).map((n) => `
        <div class="notif-item"><strong>${esc(n.titulo)}</strong><span>${esc(n.mensaje)}</span></div>`).join('')
    : '<div class="notif-item"><span>No tienes notificaciones por ahora.</span></div>';
}

async function cargarNotificaciones() {
  // Nota: este endpoint todavía no existe en el backend; se deja listo para cuando se agregue.
  const resp = await api(`/notificaciones/usuario/${idUsuario}`);
  estado.notificaciones = resp.ok && Array.isArray(resp.data) ? resp.data : [];
  pintarNotificaciones();
}

/* ============================================================
   GENERAR + CARGAR OBLIGACIONES
   ============================================================ */
async function generarObligaciones() {
  const resp = await api(`/obligaciones-usuario/usuario/${idUsuario}/generar`, { method: 'POST' });
  if (!resp.ok) return; // si falla (p. ej. falta el perfil), seguimos con lo que ya exista
  const r = resp.data;
  if (r && r.advertencias && r.advertencias.length) {
    console.warn('Gemelo Tributario — avisos del generador:', r.advertencias);
  }
}

async function cargarObligaciones() {
  const resp = await api(`/obligaciones-usuario/usuario/${idUsuario}`);
  if (!resp.ok) {
    mostrarAviso('No se pudo conectar con el servidor. Revisa que el backend esté encendido e inténtalo de nuevo.');
    estado.obligaciones = [];
    return;
  }
  estado.obligaciones = Array.isArray(resp.data) ? resp.data : [];
}

/* ============================================================
   RENDER: próxima obligación, resumen y banner de estado
   ============================================================ */
function abiertas() {
  return estado.obligaciones
    .filter((o) => o.estado !== 'CUMPLIDA')
    .slice() // ya vienen ordenadas por fecha desde el backend, pero por si acaso:
    .sort((a, b) => parseFechaLocal(a.fechaVencimiento) - parseFechaLocal(b.fechaVencimiento));
}

function renderProximaObligacion() {
  const hoy = new Date();
  const [siguiente] = abiertas();
  if (!siguiente) {
    $('prox-obligacion-nombre').textContent = 'No tienes obligaciones pendientes';
    $('prox-obligacion-meta').textContent = '';
    $('btn-ver-proxima').classList.add('hidden');
    return;
  }
  $('btn-ver-proxima').classList.remove('hidden');
  $('prox-obligacion-nombre').textContent = siguiente.obligacionCatalogo?.nombre || 'Obligación tributaria';
  const f = parseFechaLocal(siguiente.fechaVencimiento);
  $('prox-obligacion-meta').textContent = `${textoDias(diasEntre(hoy, f))} · ${fechaCorta(f)}`;
  $('btn-ver-proxima').dataset.id = siguiente.idObligacionUsuario;
}

function renderResumen() {
  $('resumen-proximas').textContent = estado.obligaciones.filter((o) => o.estado === 'PROXIMA').length;
  $('resumen-vencidas').textContent = estado.obligaciones.filter((o) => o.estado === 'VENCIDA').length;
}

function renderBannerEstado() {
  const vencidas = estado.obligaciones.filter((o) => o.estado === 'VENCIDA').length;
  const icono = $('banner-estado-icono');
  const box = $('banner-estado-general');
  const titulo = $('banner-estado-titulo');
  const texto = $('banner-estado-texto');

  box.classList.remove('warn');
  if (vencidas > 0) {
    box.style.background = 'var(--red-100)';
    box.style.borderColor = '#F3C6C6';
    icono.style.background = 'var(--red-600)';
    titulo.textContent = `Tienes ${vencidas} obligación${vencidas === 1 ? '' : 'es'} vencida${vencidas === 1 ? '' : 's'}`;
    texto.textContent = 'Revísalas cuanto antes para evitar multas e intereses.';
  } else {
    box.style.background = '';
    box.style.borderColor = '';
    icono.style.background = '';
    titulo.textContent = '¡Todo al día!';
    texto.textContent = 'No tienes obligaciones vencidas por el momento.';
  }
}

function renderRecomendacion() {
  const hoy = new Date();
  const [siguiente] = abiertas();
  const el = $('recomendacion-texto');
  if (!siguiente) {
    el.textContent = 'Estás al día. Aprovecha para revisar guías nuevas en la sección Aprender.';
    return;
  }
  const dias = diasEntre(hoy, parseFechaLocal(siguiente.fechaVencimiento));
  el.textContent = dias < 0
    ? `Tienes "${siguiente.obligacionCatalogo?.nombre}" vencida — revísala antes de que genere multas.`
    : `Tu próxima obligación es "${siguiente.obligacionCatalogo?.nombre}". Revisa tus compras y ventas antes de declarar.`;
}

/* ============================================================
   RENDER: listas de obligaciones (Próximas / Historial)
   ============================================================ */
function crearTarjeta(o) {
  const cumplida = o.estado === 'CUMPLIDA';
  const tpl = $(cumplida ? 'tpl-obligacion-cumplida' : 'tpl-obligacion');
  const nodo = tpl.content.firstElementChild.cloneNode(true);
  const info = ESTADO_INFO[o.estado];
  const f = parseFechaLocal(o.fechaVencimiento);

  nodo.dataset.id = o.idObligacionUsuario;
  nodo.dataset.status = info ? info.filtro : '';
  if (info) nodo.classList.add(info.borde);

  nodo.querySelector('[data-field="mes"]').textContent = MESES_CORTOS[f.getMonth()];
  nodo.querySelector('[data-field="dia"]').textContent = f.getDate();
  nodo.querySelector('[data-field="nombre"]').textContent = o.obligacionCatalogo?.nombre || 'Obligación tributaria';
  nodo.querySelector('[data-field="descripcion"]').textContent =
    o.obligacionCatalogo?.formulario ? `Formulario ${o.obligacionCatalogo.formulario} · Fecha límite ${fechaCorta(f)}` : `Fecha límite ${fechaCorta(f)}`;

  const iconoWrap = nodo.querySelector('[data-field="icono-wrap"]');
  if (!cumplida) {
    iconoWrap.classList.remove('icon-purple');
    iconoWrap.classList.add(categoria(o.obligacionCatalogo?.nombre));
  }

  const detalle = nodo.querySelector('[data-field="detalle"]');
  detalle.textContent = `${o.obligacionCatalogo?.descripcion || ''} Base legal: ${o.obligacionCatalogo?.baseLegal || 'no especificada'}.`;

  if (!cumplida) {
    nodo.querySelector('[data-field="status-tag"]').textContent = info ? info.label : o.estado;
    nodo.querySelector('[data-field="status-tag"]').classList.add(info ? info.tag : '');
    nodo.querySelector('[data-field="dias-restantes"]').textContent = textoDias(diasEntre(new Date(), f));

    const btnCalendario = nodo.querySelector('.btn-agregar-calendario');
    btnCalendario.dataset.id = o.idObligacionUsuario;
    pintarBotonCalendario(btnCalendario, o.enMiCalendario);

    const btnCumplir = nodo.querySelector('.btn-marcar-cumplida');
    if (btnCumplir) btnCumplir.dataset.id = o.idObligacionUsuario;
  } else {
    const fc = parseFechaLocal(o.fechaCumplimiento);
    nodo.querySelector('[data-field="fecha-cumplimiento"]').textContent = fc ? `Cumplida el ${fechaCorta(fc)}` : 'Cumplida';
  }

  return nodo;
}

function pintarBotonCalendario(btn, enCalendario) {
  btn.classList.toggle('btn-outline', !enCalendario);
  btn.classList.toggle('btn-success', !!enCalendario);
  btn.innerHTML = enCalendario
    ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> En mi calendario'
    : 'Agregar a mi calendario';
}

function renderListas() {
  const proximasCont = $('tabProximas');
  const historialCont = $('tabHistorial');

  const abiertasList = abiertas().filter((o) => estado.filtro === 'all' || ESTADO_INFO[o.estado]?.filtro === estado.filtro);
  const cumplidasList = estado.obligaciones
    .filter((o) => o.estado === 'CUMPLIDA')
    .sort((a, b) => parseFechaLocal(b.fechaCumplimiento || b.fechaVencimiento) - parseFechaLocal(a.fechaCumplimiento || a.fechaVencimiento));

  proximasCont.innerHTML = '';
  if (!abiertasList.length) {
    proximasCont.innerHTML = estado.filtro === 'all'
      ? '<p class="text-muted" style="padding:20px 0;">No tienes obligaciones pendientes registradas.</p>'
      : '<p class="text-muted" style="padding:20px 0;">No hay obligaciones con ese estado.</p>';
  } else {
    abiertasList.forEach((o) => proximasCont.appendChild(crearTarjeta(o)));
  }

  historialCont.innerHTML = '';
  if (!cumplidasList.length) {
    historialCont.innerHTML = '<p class="text-muted" style="padding:20px 0;">Aún no has marcado ninguna obligación como cumplida.</p>';
  } else {
    cumplidasList.forEach((o) => historialCont.appendChild(crearTarjeta(o)));
  }
}

/* ============================================================
   MINI CALENDARIO
   ============================================================ */
function renderMiniCalendario() {
  const { anio, mes } = estado.mesCalendario; // mes: 1-12
  $('mc-mes-label').textContent = `${MESES_LARGOS[mes - 1]} ${anio}`;

  const hoy = new Date();
  const primerDiaMes = new Date(anio, mes - 1, 1);
  const diasEnMes = new Date(anio, mes, 0).getDate();
  const offsetInicial = (primerDiaMes.getDay() + 6) % 7; // 0 = lunes

  // Mapa fecha ISO -> estado con mayor prioridad ese día
  const porDia = {};
  estado.obligaciones.forEach((o) => {
    const clave = o.estado === 'CUMPLIDA' ? o.fechaCumplimiento : o.fechaVencimiento;
    if (!clave) return;
    const actual = porDia[clave];
    if (!actual || PRIORIDAD_ESTADO[o.estado] < PRIORIDAD_ESTADO[actual]) porDia[clave] = o.estado;
  });
  const sufijo = { PENDIENTE: 'pendiente', PROXIMA: 'proxima', VENCIDA: 'vencida', CUMPLIDA: 'completada' };

  const grid = $('mc-grid');
  grid.innerHTML = DIAS_SEMANA.map((d) => `<span class="dow">${d}</span>`).join('');

  for (let i = 0; i < offsetInicial; i++) grid.appendChild(Object.assign(document.createElement('span'), { className: 'day muted' }));

  for (let dia = 1; dia <= diasEnMes; dia++) {
    const span = document.createElement('span');
    span.className = 'day';
    span.textContent = dia;
    const esHoy = anio === hoy.getFullYear() && mes === hoy.getMonth() + 1 && dia === hoy.getDate();
    if (esHoy) span.classList.add('today');

    const iso = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    if (porDia[iso]) span.classList.add('marca', `marca-${sufijo[porDia[iso]]}`);

    grid.appendChild(span);
  }
}

function cambiarMesCalendario(delta) {
  let { anio, mes } = estado.mesCalendario;
  mes += delta;
  if (mes < 1) { mes = 12; anio -= 1; }
  if (mes > 12) { mes = 1; anio += 1; }
  estado.mesCalendario = { anio, mes };
  renderMiniCalendario();
}

/* ============================================================
   ACCIONES: calendario, cumplir, ver detalle
   ============================================================ */
async function alternarCalendario(btn) {
  const id = btn.dataset.id;
  const enCalendarioActual = btn.classList.contains('btn-success');
  const nuevoValor = !enCalendarioActual;
  btn.disabled = true;
  const resp = await api(`/obligaciones-usuario/${id}/calendario?valor=${nuevoValor}`, { method: 'PATCH' });
  btn.disabled = false;
  if (!resp.ok) { showToast('No se pudo actualizar tu calendario. Intenta de nuevo.'); return; }

  const o = estado.obligaciones.find((x) => String(x.idObligacionUsuario) === String(id));
  if (o) o.enMiCalendario = nuevoValor;
  pintarBotonCalendario(btn, nuevoValor);
  showToast(nuevoValor ? 'Recordatorio agregado a tu calendario' : 'Recordatorio quitado de tu calendario');
}

async function marcarCumplida(btn) {
  const id = btn.dataset.id;
  if (!window.confirm('¿Marcar esta obligación como cumplida? Pasará a tu historial.')) return;
  btn.disabled = true;
  const resp = await api(`/obligaciones-usuario/${id}/cumplir`, { method: 'PATCH' });
  btn.disabled = false;
  if (!resp.ok) { showToast('No se pudo actualizar la obligación. Intenta de nuevo.'); return; }

  const idx = estado.obligaciones.findIndex((x) => String(x.idObligacionUsuario) === String(id));
  if (idx !== -1) estado.obligaciones[idx] = resp.data;
  showToast('¡Obligación marcada como cumplida!');
  renderTodo();
}

function abrirDetalle(id) {
  const item = document.querySelector(`.reminder-item[data-id="${id}"]`);
  if (!item) return;
  const detalle = item.querySelector('.reminder-detail');
  const btn = item.querySelector('.btn-detalle');
  detalle.classList.add('open');
  if (btn) btn.textContent = 'Ocultar detalle';
  item.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ============================================================
   TABS / FILTRO (misma lógica de antes, ahora sobre datos reales)
   ============================================================ */
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const panels = { proximas: $('tabProximas'), historial: $('tabHistorial') };
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      Object.keys(panels).forEach((key) => panels[key].classList.toggle('hidden', key !== target));
    });
  });
}

function initFiltro() {
  const select = $('filterEstado');
  select.addEventListener('change', () => {
    estado.filtro = select.value;
    renderListas();
  });
}

function activarTab(nombre) {
  document.querySelector(`.tab[data-tab="${nombre}"]`)?.click();
}

/* ============================================================
   Delegación de eventos (los botones se crean dinámicamente)
   ============================================================ */
function initAccionesLista() {
  document.addEventListener('click', (e) => {
    const btnDetalle = e.target.closest('.btn-detalle');
    if (btnDetalle) {
      const item = btnDetalle.closest('.reminder-item');
      const detalle = item.querySelector('.reminder-detail');
      const abierta = detalle.classList.toggle('open');
      btnDetalle.textContent = abierta ? 'Ocultar detalle' : 'Ver detalle';
      return;
    }
    const btnCal = e.target.closest('.btn-agregar-calendario');
    if (btnCal) { alternarCalendario(btnCal); return; }

    const btnCumplir = e.target.closest('.btn-marcar-cumplida');
    if (btnCumplir) { marcarCumplida(btnCumplir); return; }
  });

  $('btn-ver-proxima').addEventListener('click', () => {
    const id = $('btn-ver-proxima').dataset.id;
    if (!id) return;
    $('filterEstado').value = 'all';
    estado.filtro = 'all';
    renderListas();
    activarTab('proximas');
    setTimeout(() => abrirDetalle(id), 50);
  });

  $('mc-prev').addEventListener('click', () => cambiarMesCalendario(-1));
  $('mc-next').addEventListener('click', () => cambiarMesCalendario(1));

  $('cerrar-sesion').addEventListener('click', () => {
    localStorage.removeItem('gt_id_usuario');
  });
}

/* ============================================================
   INICIALIZACIÓN
   ============================================================ */
function renderTodo() {
  renderProximaObligacion();
  renderResumen();
  renderBannerEstado();
  renderRecomendacion();
  renderListas();
  renderMiniCalendario();
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!idUsuario) return;

  const hoy = new Date();
  estado.mesCalendario = { anio: hoy.getFullYear(), mes: hoy.getMonth() + 1 };

  initTabs();
  initFiltro();
  initAccionesLista();
  initHeaderDropdowns(); 

  await cargarUsuario();
  const tienePerfil = await cargarPerfil();
  if (tienePerfil) {
    ocultarAviso();
    await generarObligaciones();
  }
  await cargarObligaciones();
  await cargarNotificaciones();

  renderTodo();
});