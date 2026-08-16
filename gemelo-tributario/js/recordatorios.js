/* ============================================================
   Recordatorios — Gemelo Tributario
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initAgregarCalendario();
});

function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      panels.forEach((p) => p.classList.add('hidden'));
      document.getElementById(tab.dataset.target).classList.remove('hidden');
    });
  });
}

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
