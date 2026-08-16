/* ============================================================
   Aprender — Gemelo Tributario
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initCategorias();
  initFaqAccordion();
  initVideoModal();
});

function initCategorias() {
  const chips = document.querySelectorAll('.category-chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const categoria = chip.dataset.categoria;
      document.querySelectorAll('.faq-item').forEach((item) => {
        const coincide = categoria === 'todas' || item.dataset.categoria === categoria;
        item.classList.toggle('hidden', !coincide);
      });
    });
  });
}

function initFaqAccordion() {
  document.querySelectorAll('.faq-question').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const yaAbierto = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach((el) => el.classList.remove('open'));
      if (!yaAbierto) item.classList.add('open');
    });
  });
}

function initVideoModal() {
  document.querySelectorAll('.video-card').forEach((card) => {
    card.addEventListener('click', () => {
      showToast('Video de demostración — disponible en la versión completa de la app');
    });
  });
}
