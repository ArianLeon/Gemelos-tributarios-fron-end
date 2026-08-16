

document.addEventListener('DOMContentLoaded', () => {
  initAgregarCalendario();
  initVerDetalle();
  initTabs();
  initFiltro();
  initDropdowns();
});

/* ---- Agregar a mi calendario ---- */
function initAgregarCalendario() {
  document.querySelectorAll('.btn-agregar-calendario').forEach((btn) => {
    const id = btn.dataset.id;
    if (gtGet('reminder_' + id, false)) marcarAgregado(btn);

    btn.addEventListener('click', () => {
      gtSet('reminder_' + id, true);
      marcarAgregado(btn);
      showToast('Recordatorio agregado a tu calendario');
    });
  });
}

function marcarAgregado(btn) {
  btn.disabled = true;
  btn.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Agregado';
  btn.classList.remove('btn-outline');
  btn.classList.add('btn-success');
}

/* ---- Ver detalle (expande la tarjeta) ---- */
function initVerDetalle() {
  document.querySelectorAll('.btn-detalle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.reminder-item');
      const detail = item.querySelector('.reminder-detail');
      if (!detail) return;
      const isOpen = detail.classList.toggle('open');
      btn.textContent = isOpen ? 'Ocultar detalle' : 'Ver detalle';
    });
  });
}

/* ---- Tabs: Próximas / Historial ---- */
function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const panels = {
    proximas: document.getElementById('tabProximas'),
    historial: document.getElementById('tabHistorial'),
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.dataset.tab;
      Object.keys(panels).forEach((key) => {
        if (!panels[key]) return;
        panels[key].classList.toggle('hidden', key !== target);
      });
    });
  });
}

/* ---- Filtro por estado ---- */
function initFiltro() {
  const select = document.getElementById('filterEstado');
  if (!select) return;

  select.addEventListener('change', () => {
    const value = select.value;
    document.querySelectorAll('#tabProximas .reminder-item').forEach((item) => {
      const status = item.dataset.status;
      item.classList.toggle('hidden', value !== 'all' && status !== value);
    });
  });
}

/* ---- Dropdowns: notificaciones y usuario ---- */
function initDropdowns() {
  const pairs = [
    { btn: document.getElementById('btnNotif'), panel: document.getElementById('notifPanel') },
    { btn: document.getElementById('btnUser'), panel: document.getElementById('userPanel') },
  ];

  pairs.forEach(({ btn, panel }) => {
    if (!btn || !panel) return;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !panel.classList.contains('open');
      pairs.forEach((p) => p.panel && p.panel.classList.remove('open'));
      pairs.forEach((p) => p.btn && p.btn.classList.remove('open'));
      if (willOpen) {
        panel.classList.add('open');
        btn.classList.add('open');
      }
    });
  });

  document.addEventListener('click', () => {
    pairs.forEach((p) => {
      p.panel && p.panel.classList.remove('open');
      p.btn && p.btn.classList.remove('open');
    });
  });

  const btnHelp = document.getElementById('btnHelp');
  if (btnHelp) {
    btnHelp.addEventListener('click', (e) => {
      e.stopPropagation();
      showToast('Centro de ayuda próximamente');
    });
  }
}