/* ============================================================
   Calculadora — Gemelo Tributario (conectado al backend real)
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

// Cache de catalogos que trae el backend, para no pedirlos de nuevo
// cada vez que el usuario presiona "Calcular".
let tarifasRimpe = [];
let tramosRenta = [];
let retenciones = [];
let regimenUsuario = 'GENERAL';

// Guarda el ultimo resultado calculado, para poder "Guardar calculo".
let ultimoCalculo = null;

// Acumulado de esta sesion (no persiste al recargar) para la tarjeta
// "Resumen tributario".
const resumenSesion = { iva: 0, retenciones: 0, renta: 0 };

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

/* ------------------------------------------------------------
   Carga inicial
   ------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {
  initHeaderDropdowns();
  cargarUsuario();
  cargarPerfilYObligaciones();
  cargarNotificaciones();
  cargarRetenciones();
  cargarCalculosRecientes();
  configurarSelectorDeImpuesto();
  configurarCalculo();

  document.getElementById('cerrar-sesion').addEventListener('click', () => {
    localStorage.removeItem('gt_id_usuario');
  });

  document.querySelectorAll('[data-toast]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      showToast(el.getAttribute('data-toast'));
    });
  });

  document.getElementById('btn-como-usar').addEventListener('click', () => {
    showToast('Selecciona qué quieres calcular, ingresa tus datos y presiona Calcular.');
  });

  document.getElementById('btn-limpiar').addEventListener('click', limpiarCampos);
  document.getElementById('btn-guardar-calculo').addEventListener('click', guardarCalculo);
  document.getElementById('btn-descargar-pdf').addEventListener('click', descargarPDF);

  // Delegado: los botones de eliminar se crean despues, dinamicamente
  document.getElementById('calculos-recientes-lista').addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-eliminar-calculo');
    if (btn) eliminarCalculo(btn.dataset.id);
  });
});

/* ------------------------------------------------------------
   Usuario: avatar/foto/nombre en la barra superior
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

/* ------------------------------------------------------------
   Perfil tributario (regimen real) + obligaciones del usuario
   ------------------------------------------------------------ */
async function cargarPerfilYObligaciones() {
  const [perfilRes, obligacionesRes] = await Promise.all([
    fetch(`${API_URL}/perfiles-tributarios/usuario/${idUsuario}`),
    fetch(`${API_URL}/obligaciones-usuario/usuario/${idUsuario}`)
  ]);

  if (perfilRes.ok) {
    const perfil = await perfilRes.json();
    regimenUsuario = perfil.regimen;
    document.getElementById('regimen').value = regimenUsuario;
    const label = REGIMEN_LABEL[regimenUsuario] || regimenUsuario;
    document.getElementById('sidebar-regimen').textContent = label;
  }

  // Solo tiene sentido pedir la tabla RIMPE si el usuario es RIMPE
  if (regimenUsuario === 'RIMPE_NEGOCIO_POPULAR' || regimenUsuario === 'RIMPE_EMPRENDEDOR') {
    await cargarTarifasRimpe();
  } else {
    await cargarTramosRenta();
  }

  let obligaciones = [];
  if (obligacionesRes.ok) obligaciones = await obligacionesRes.json();
  pintarProximasObligaciones(obligaciones);
  pintarEstadoTributario(obligaciones);
}

async function cargarTarifasRimpe() {
  const res = await fetch(`${API_URL}/tarifas-rimpe`);
  if (!res.ok) return;
  const todas = await res.json();
  tarifasRimpe = todas.filter((t) => t.regimen === regimenUsuario);
}

async function cargarTramosRenta() {
  const res = await fetch(`${API_URL}/tramos-renta`);
  if (!res.ok) return;
  tramosRenta = (await res.json()).sort((a, b) => a.montoDesde - b.montoDesde);
}

function pintarProximasObligaciones(obligaciones) {
  const pendientes = obligaciones
    .filter((o) => o.estado !== 'CUMPLIDA')
    .sort((a, b) => new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento));

  const contenedor = document.getElementById('mini-obligaciones-lista');
  const proximoTexto = document.getElementById('proximo-vencimiento-texto');

  if (pendientes.length === 0) {
    contenedor.innerHTML = '<p class="text-muted" style="font-size:12.5px;">No tienes obligaciones pendientes.</p>';
    proximoTexto.textContent = 'No tienes obligaciones pendientes';
    return;
  }

  contenedor.innerHTML = '';
  pendientes.slice(0, 4).forEach((o) => {
    const fecha = new Date(o.fechaVencimiento);
    const mes = fecha.toLocaleDateString('es-EC', { month: 'short' }).replace('.', '');
    const dia = fecha.getDate();
    const nombre = o.obligacionCatalogo?.nombre || 'Obligación';

    const item = document.createElement('div');
    item.className = 'mini-reminder';
    item.innerHTML = `
      <div class="mini-date"><span class="m">${mes}</span><span class="d">${dia}</span></div>
      <div class="body"><strong>${nombre}</strong><span>Periodo ${o.periodoFiscal}</span></div>
    `;
    contenedor.appendChild(item);
  });

  const siguiente = pendientes[0];
  proximoTexto.textContent = `${siguiente.obligacionCatalogo?.nombre || 'Obligación'} — periodo ${siguiente.periodoFiscal}`;
}

function pintarEstadoTributario(obligaciones) {
  const categorias = [
    { clave: 'iva', etiqueta: 'IVA', tipo: 'Obligación de IVA', icono: 'icon-purple', match: /iva/i },
    { clave: 'renta', etiqueta: 'Impuesto a la Renta', tipo: 'Obligación anual', icono: 'icon-green', match: /renta/i },
    { clave: 'retenciones', etiqueta: 'Retenciones', tipo: 'Obligación mensual', icono: 'icon-orange', match: /retenci/i }
  ];

  const lista = document.getElementById('estado-tributario-lista');
  lista.innerHTML = '';

  categorias.forEach((cat) => {
    const delGrupo = obligaciones.filter((o) => cat.match.test(o.obligacionCatalogo?.nombre || ''));
    let estado = 'ok';
    let texto = 'Al día';

    if (delGrupo.some((o) => o.estado === 'VENCIDA')) {
      estado = 'due'; texto = 'Vencida';
    } else if (delGrupo.some((o) => o.estado === 'PROXIMA')) {
      estado = 'warn'; texto = 'Próximo';
    } else if (delGrupo.length === 0) {
      estado = 'pending'; texto = 'Sin datos';
    }

    const row = document.createElement('div');
    row.className = 'status-row';
    row.innerHTML = `
      <span class="ic ${cat.icono}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg></span>
      <div class="body"><strong>${cat.etiqueta}</strong><span>${cat.tipo}</span></div>
      <span class="status-pill ${estado}">${texto}</span>
    `;
    lista.appendChild(row);
  });

  const total = obligaciones.length;
  const cumplidas = obligaciones.filter((o) => o.estado === 'CUMPLIDA').length;
  const pct = total > 0 ? Math.round((cumplidas / total) * 100) : 0;

  document.getElementById('cumplimiento-pct').textContent = total > 0 ? `${pct}%` : 'Sin datos';
  document.getElementById('cumplimiento-barra').style.width = `${pct}%`;
  document.getElementById('cumplimiento-nota').textContent =
    total === 0 ? 'Aún no se han generado tus obligaciones.' :
    pct === 100 ? '¡Estás al día con todo!' :
    pct >= 60 ? 'Vas bien, sigue así.' : 'Tienes varias obligaciones pendientes.';
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
  lista.innerHTML = notificaciones.length === 0
    ? '<div class="notif-item"><span>No tienes notificaciones.</span></div>'
    : '';
  notificaciones.slice(0, 5).forEach((n) => {
    const item = document.createElement('div');
    item.className = 'notif-item';
    item.innerHTML = `<strong>${n.titulo}</strong><span>${n.mensaje}</span>`;
    lista.appendChild(item);
  });
}

/* ------------------------------------------------------------
   Catalogo real de retenciones (reemplaza el objeto fijo del JS viejo)
   ------------------------------------------------------------ */
async function cargarRetenciones() {
  const res = await fetch(`${API_URL}/retenciones`);
  const select = document.getElementById('tipo-retencion');
  if (!res.ok) {
    select.innerHTML = '<option value="">No hay catálogo de retenciones cargado</option>';
    return;
  }
  retenciones = (await res.json()).filter((r) => r.vigente);

  select.innerHTML = retenciones
    .map((r) => `<option value="${r.codigo}">${r.descripcion} (${r.porcentaje}%)</option>`)
    .join('');

  actualizarPorcentajeRetencionPreview();
  select.addEventListener('change', actualizarPorcentajeRetencionPreview);
}

function actualizarPorcentajeRetencionPreview() {
  const codigo = document.getElementById('tipo-retencion').value;
  const retencion = retenciones.find((r) => r.codigo === codigo);
  document.getElementById('pct-retencion-preview').textContent = retencion ? `${retencion.porcentaje}%` : '—';
}

/* ------------------------------------------------------------
   Mis cálculos recientes
   ------------------------------------------------------------ */
async function cargarCalculosRecientes() {
  const res = await fetch(`${API_URL}/calculo-historial/usuario/${idUsuario}`);
  if (!res.ok) return;
  const calculos = await res.json();

  const contenedor = document.getElementById('calculos-recientes-lista');
  if (calculos.length === 0) {
    contenedor.innerHTML = '<p class="text-muted" style="font-size:12.5px;">Aún no tienes cálculos guardados.</p>';
    return;
  }

  const iconoPorTipo = { IVA: 'icon-purple', RETENCION: 'icon-orange', RENTA: 'icon-green' };
  contenedor.innerHTML = '';
  calculos.slice(0, 5).forEach((c) => {
    const fecha = new Date(c.fechaCalculo).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
    const item = document.createElement('div');
    item.className = 'recent-calc-item';
    item.innerHTML = `
      <span class="ic ${iconoPorTipo[c.tipoCalculo] || 'icon-navy'}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg></span>
      <div class="body"><strong>${c.tipoCalculo}</strong><span>${c.etiqueta}</span></div>
      <div class="amt"><strong>$ ${Number(c.monto).toFixed(2)}</strong><span>${fecha}</span></div>
      <button type="button" class="more btn-eliminar-calculo" data-id="${c.idCalculo}" aria-label="Eliminar cálculo">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z"/></svg>
      </button>
    `;
    contenedor.appendChild(item);
  });
}

async function eliminarCalculo(idCalculo) {
  const res = await fetch(`${API_URL}/calculo-historial/${idCalculo}`, { method: 'DELETE' });
  if (!res.ok) {
    showToast('No se pudo eliminar el cálculo.');
    return;
  }
  showToast('Cálculo eliminado.');
  cargarCalculosRecientes();
}

async function guardarCalculo() {
  if (!ultimoCalculo) return;
  const res = await fetch(`${API_URL}/calculo-historial/usuario/${idUsuario}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ultimoCalculo)
  });
  if (!res.ok) {
    showToast('No se pudo guardar el cálculo.');
    return;
  }
  showToast('Cálculo guardado en tu historial.');
  cargarCalculosRecientes();
}

/* ------------------------------------------------------------
   Selector de impuesto (IVA / Renta / Retenciones)
   ------------------------------------------------------------ */
function configurarSelectorDeImpuesto() {
  const botones = document.querySelectorAll('#calc-type-grid .calc-type-btn');
  const paneles = {
    iva: document.getElementById('panel-iva'),
    renta: document.getElementById('panel-renta'),
    retenciones: document.getElementById('panel-retenciones')
  };
  const cardTablaRenta = document.getElementById('card-tabla-renta');
  const labelPorTipo = { iva: 'Calcular IVA', renta: 'Calcular Renta', retenciones: 'Calcular Retención' };

  botones.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tipo = btn.getAttribute('data-impuesto');
      botones.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      window.impuestoActual = tipo;

      Object.keys(paneles).forEach((key) => {
        paneles[key].classList.toggle('hidden', key !== tipo);
      });
      cardTablaRenta.style.display = 'none';
      document.getElementById('btn-calcular-label').textContent = labelPorTipo[tipo];
    });
  });

  window.impuestoActual = 'iva';
}

/* ------------------------------------------------------------
   Calculo real
   ------------------------------------------------------------ */
function resultTemplate({ label, amount, rows, detail }) {
  const rowsHtml = rows.map((r) => `<div class="row"><span>${r.label}</span><span>${r.value}</span></div>`).join('');
  return `
    <div class="result-summary">
      <span class="lbl">${label}</span>
      <div class="amount">$ ${amount}</div>
    </div>
    <div class="result-breakdown">${rowsHtml}</div>
    <button type="button" class="result-toggle" id="result-toggle-btn">
      Ver detalle del cálculo
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
    <div class="result-detail" id="result-detail-box"><p class="hint" style="margin-top:0;">${detail}</p></div>
  `;
}

function bindResultToggle() {
  const toggleBtn = document.getElementById('result-toggle-btn');
  const detailBox = document.getElementById('result-detail-box');
  if (!toggleBtn || !detailBox) return;
  toggleBtn.addEventListener('click', () => {
    toggleBtn.classList.toggle('open');
    detailBox.classList.toggle('open');
  });
}

function renderTablaRenta(hitIndex = -1) {
  const cuerpo = document.getElementById('tabla-renta-body');
  cuerpo.innerHTML = '';
  tramosRenta.forEach((tramo, index) => {
    const tr = document.createElement('tr');
    if (index === hitIndex) tr.classList.add('hit');
    const maxStr = tramo.montoHasta == null ? 'en adelante' : `$${Number(tramo.montoHasta).toLocaleString()}`;
    tr.innerHTML = `<td>$${Number(tramo.montoDesde).toLocaleString()} - ${maxStr}</td><td>${tramo.tarifaPorcentaje}%</td>`;
    cuerpo.appendChild(tr);
  });
}

function actualizarResumenSesion() {
  document.getElementById('resumen-iva').textContent = `$ ${resumenSesion.iva.toFixed(2)}`;
  document.getElementById('resumen-retenciones').textContent = `$ ${resumenSesion.retenciones.toFixed(2)}`;
  document.getElementById('resumen-renta').textContent = `$ ${resumenSesion.renta.toFixed(2)}`;
  const total = resumenSesion.iva + resumenSesion.retenciones + resumenSesion.renta;
  document.getElementById('resumen-total').textContent = `$ ${total.toFixed(2)}`;
}

function configurarCalculo() {
  document.getElementById('btn-calcular').addEventListener('click', () => {
    const resultadoBox = document.getElementById('resultado-box');
    const btnGuardar = document.getElementById('btn-guardar-calculo');
    const cardTablaRenta = document.getElementById('card-tabla-renta');

    if (window.impuestoActual === 'iva') {
      const ingresos = parseFloat(document.getElementById('iva-ingresos').value) || 0;
      const compras = parseFloat(document.getElementById('iva-compras').value) || 0;
      const debito = ingresos * 0.15;
      const credito = compras * 0.15;
      const ivaPagar = Math.max(0, debito - credito);

      resultadoBox.innerHTML = resultTemplate({
        label: 'IVA estimado a pagar',
        amount: ivaPagar.toFixed(2),
        rows: [
          { label: 'IVA generado (ventas)', value: `$ ${debito.toFixed(2)}` },
          { label: 'Crédito tributario (compras)', value: `– $ ${credito.toFixed(2)}` }
        ],
        detail: 'IVA generado en ventas (tarifa 15%) menos crédito tributario de compras con derecho a crédito (Art. 65-67 LRTI).'
      });

      resumenSesion.iva = ivaPagar;
      ultimoCalculo = { tipoCalculo: 'IVA', etiqueta: 'IVA a pagar', monto: ivaPagar, detalle: `Ventas $${ingresos} / Compras $${compras}` };

      cardTablaRenta.style.display = 'none';

    } else if (window.impuestoActual === 'renta') {
      const ingresos = parseFloat(document.getElementById('renta-ingresos').value) || 0;
      const gastos = parseFloat(document.getElementById('renta-gastos').value) || 0;
      let impuestoRenta = 0;
      let detalleFilas = [];
      let detalleTexto = '';
      let tramoEncontrado = -1;

      if (regimenUsuario === 'RIMPE_NEGOCIO_POPULAR' || regimenUsuario === 'RIMPE_EMPRENDEDOR') {
        const tramo = tarifasRimpe.find((t) =>
          ingresos >= t.ingresoDesde && (t.ingresoHasta == null || ingresos <= t.ingresoHasta));

        if (!tramo) {
          showToast('No hay una tarifa RIMPE cargada para ese monto de ingresos.');
          return;
        }
        const excedente = Math.max(0, ingresos - tramo.ingresoDesde);
        const montoExcedente = excedente * (tramo.porcentajeExcedente / 100);
        impuestoRenta = Number(tramo.cuotaFija) + montoExcedente;

        detalleFilas = [
          { label: 'Cuota fija del tramo', value: `$ ${Number(tramo.cuotaFija).toFixed(2)}` },
          { label: `Excedente (${tramo.porcentajeExcedente}%)`, value: `$ ${montoExcedente.toFixed(2)}` }
        ];
        detalleTexto = `Calculado con la tabla ${REGIMEN_LABEL[regimenUsuario]} vigente. ${tramo.baseLegal || ''}`;

      } else {
        const baseImponible = Math.max(0, ingresos - gastos);
        tramosRenta.forEach((t, idx) => {
          if (baseImponible >= t.montoDesde && (t.montoHasta == null || baseImponible < t.montoHasta)) {
            tramoEncontrado = idx;
          }
        });
        if (tramoEncontrado === -1) {
          showToast('No hay tabla de tramos de Renta cargada.');
          return;
        }
        const tarifaPct = tramosRenta[tramoEncontrado].tarifaPorcentaje;
        impuestoRenta = baseImponible * (tarifaPct / 100);

        detalleFilas = [
          { label: 'Base imponible', value: `$ ${baseImponible.toFixed(2)}` },
          { label: `Tarifa del tramo (${tarifaPct}%)`, value: `$ ${impuestoRenta.toFixed(2)}` }
        ];
        detalleTexto = 'Calculado con la tabla progresiva vigente de Impuesto a la Renta (Régimen General).';
        cardTablaRenta.style.display = 'block';
        renderTablaRenta(tramoEncontrado);
      }

      resultadoBox.innerHTML = resultTemplate({
        label: 'Impuesto a la Renta estimado',
        amount: impuestoRenta.toFixed(2),
        rows: detalleFilas,
        detail: detalleTexto
      });

      resumenSesion.renta = impuestoRenta;
      ultimoCalculo = { tipoCalculo: 'RENTA', etiqueta: 'Impuesto a la Renta estimado', monto: impuestoRenta, detalle: detalleTexto };

    } else if (window.impuestoActual === 'retenciones') {
      const codigo = document.getElementById('tipo-retencion').value;
      const base = parseFloat(document.getElementById('retencion-base').value) || 0;
      const retencion = retenciones.find((r) => r.codigo === codigo);

      if (!retencion) {
        showToast('Selecciona un tipo de retención válido.');
        return;
      }
      const valorRetenido = base * (retencion.porcentaje / 100);

      resultadoBox.innerHTML = resultTemplate({
        label: 'Valor retenido',
        amount: valorRetenido.toFixed(2),
        rows: [
          { label: 'Base imponible', value: `$ ${base.toFixed(2)}` },
          { label: 'Porcentaje aplicado', value: `${retencion.porcentaje}%` }
        ],
        detail: `${retencion.descripcion}. ${retencion.baseLegal || ''}`
      });

      resumenSesion.retenciones = valorRetenido;
      ultimoCalculo = { tipoCalculo: 'RETENCION', etiqueta: retencion.descripcion, monto: valorRetenido, detalle: `Base $${base} — ${retencion.porcentaje}%` };
      cardTablaRenta.style.display = 'none';
    }

    bindResultToggle();
    actualizarResumenSesion();
    btnGuardar.disabled = false;
  });
}

function limpiarCampos() {
  document.querySelectorAll('.panel-impuesto input[type="number"]').forEach((inp) => { inp.value = ''; });
  document.getElementById('resultado-box').innerHTML = `
    <div class="result-empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h3M13 11h3M8 15h3M13 15h3"/></svg>
      <p>Ingresa tus datos y presiona <strong>Calcular</strong> para ver el resultado referencial.</p>
    </div>`;
  document.getElementById('card-tabla-renta').style.display = 'none';
  document.getElementById('btn-guardar-calculo').disabled = true;
  ultimoCalculo = null;
}

/* ------------------------------------------------------------
   Descargar el ultimo resultado como PDF real (jsPDF)
   ------------------------------------------------------------ */
function descargarPDF() {
  if (!ultimoCalculo) {
    showToast('Primero calcula algo para poder descargarlo.');
    return;
  }
  if (!window.jspdf) {
    showToast('No se pudo cargar el generador de PDF. Revisa tu conexión a internet.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text('Gemelo Tributario', 14, 20);
  doc.setFontSize(12);
  doc.text('Resultado de cálculo tributario (referencial)', 14, 28);

  doc.setDrawColor(200);
  doc.line(14, 32, 196, 32);

  doc.setFontSize(11);
  let y = 44;
  doc.text(`Tipo de cálculo:`, 14, y); doc.text(ultimoCalculo.tipoCalculo, 80, y); y += 8;
  doc.text(`Concepto:`, 14, y); doc.text(ultimoCalculo.etiqueta, 80, y); y += 8;
  doc.text(`Monto estimado:`, 14, y); doc.text(`$ ${Number(ultimoCalculo.monto).toFixed(2)}`, 80, y); y += 8;
  doc.text(`Fecha:`, 14, y); doc.text(new Date().toLocaleDateString('es-EC'), 80, y); y += 12;

  doc.setFontSize(10);
  const detalleLineas = doc.splitTextToSize(`Detalle: ${ultimoCalculo.detalle || ''}`, 180);
  doc.text(detalleLineas, 14, y);

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('Este documento es un cálculo referencial generado por Gemelo Tributario y no constituye una declaración oficial ante el SRI.', 14, 285, { maxWidth: 180 });

  doc.save(`gemelo-tributario-${ultimoCalculo.tipoCalculo.toLowerCase()}-${Date.now()}.pdf`);
}