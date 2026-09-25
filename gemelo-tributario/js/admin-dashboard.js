document.addEventListener('DOMContentLoaded', async () => {
  const [usuarios, catalogo, guias, opiniones] = await Promise.all([
    api('/usuarios'), api('/obligaciones-catalogo'), api('/guias-aprendizaje'), api('/opiniones')
  ]);
  document.getElementById('kpi-usuarios').textContent = usuarios.ok ? usuarios.data.length : '—';
  document.getElementById('kpi-catalogo').textContent = catalogo.ok ? catalogo.data.length : '—';
  document.getElementById('kpi-guias').textContent = guias.ok ? guias.data.length : '—';
  document.getElementById('kpi-opiniones').textContent = opiniones.ok ? opiniones.data.length : '—';
});