/* ============================================================
   Calculadora de impuestos — Gemelo Tributario
   Los porcentajes y tramos son valores referenciales para fines
   demostrativos del prototipo académico. No sustituyen la tabla
   vigente del SRI ni una asesoría profesional.
   ============================================================ */

const TARIFA_IVA = 0.15;

// Tramos referenciales de Impuesto a la Renta (persona natural, anual, USD)
const TRAMOS_RENTA = [
  { hasta: 11722,  base: 0,     pct: 0 },
  { hasta: 14930,  base: 0,     pct: 5 },
  { hasta: 19140,  base: 160.40, pct: 10 },
  { hasta: 25640,  base: 581.40, pct: 12 },
  { hasta: 33736,  base: 1361.40, pct: 15 },
  { hasta: 44721,  base: 2575.80, pct: 20 },
  { hasta: 59077,  base: 4772.80, pct: 25 },
  { hasta: 78714,  base: 8361.80, pct: 30 },
  { hasta: Infinity, base: 14252.90, pct: 35 }
];

const TARIFAS_RETENCION = {
  bienes: { label: 'Compra de bienes', pct: 1.75 },
  servicios: { label: 'Servicios (no profesionales)', pct: 2 },
  profesionales: { label: 'Honorarios profesionales', pct: 10 },
  arriendo: { label: 'Arrendamiento de bienes inmuebles', pct: 8 },
  publicidad: { label: 'Publicidad y comunicación', pct: 1 },
  transporte: { label: 'Transporte privado de carga/pasajeros', pct: 1 }
};

let impuestoActivo = 'iva';

document.addEventListener('DOMContentLoaded', () => {
  initSegmented();
  initRegimenInfo();
  document.getElementById('btn-calcular').addEventListener('click', calcular);
  document.getElementById('tipo-retencion').addEventListener('change', () => {
    const sel = document.getElementById('tipo-retencion');
    document.getElementById('pct-retencion-preview').textContent =
      TARIFAS_RETENCION[sel.value].pct + '%';
  });
  renderTablaRenta();
});

function initSegmented() {
  const buttons = document.querySelectorAll('#segmented-impuesto button');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      impuestoActivo = btn.dataset.impuesto;
      document.querySelectorAll('.panel-impuesto').forEach((p) => p.classList.add('hidden'));
      document.getElementById('panel-' + impuestoActivo).classList.remove('hidden');
      resetResultado();
    });
  });
}

function initRegimenInfo() {
  const sel = document.getElementById('regimen');
  const nota = document.getElementById('nota-regimen');
  const notas = {
    rimpe_emprendedor: 'RIMPE Emprendedor: negocios con ingresos anuales de hasta USD 300.000. Puede aplicar tarifa 0% de IVA en ciertas transferencias y liquida el impuesto a la renta con tarifa progresiva simplificada.',
    rimpe_negocio_popular: 'RIMPE Negocio Popular: ingresos anuales de hasta USD 20.000. Cuota fija mensual y facturación simplificada.',
    general: 'Régimen General: aplica la normativa estándar de IVA (15%) e Impuesto a la Renta por tabla progresiva, con obligación de llevar contabilidad según el caso.'
  };
  const actualizar = () => (nota.textContent = notas[sel.value]);
  sel.addEventListener('change', actualizar);
  actualizar();
}

function resetResultado() {
  const box = document.getElementById('resultado-box');
  box.innerHTML =
    '<div class="result-empty">' +
    '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h3M13 11h3M8 15h3M13 15h3"/></svg>' +
    '<p>Ingresa tus datos y presiona <strong>Calcular</strong> para ver el resultado referencial.</p>' +
    '</div>';
}

function calcular() {
  if (impuestoActivo === 'iva') return calcularIVA();
  if (impuestoActivo === 'renta') return calcularRenta();
  return calcularRetencion();
}

function calcularIVA() {
  const ingresos = parseFloat(document.getElementById('iva-ingresos').value) || 0;
  const compras = parseFloat(document.getElementById('iva-compras').value) || 0;

  const generado = ingresos * TARIFA_IVA;
  const credito = compras * TARIFA_IVA;
  const diferencia = generado - credito;
  const esCredito = diferencia < 0;

  const box = document.getElementById('resultado-box');
  box.innerHTML =
    '<div class="row"><span>IVA generado en ventas (15%)</span><span>$ ' + formatUSD(generado) + '</span></div>' +
    '<div class="row"><span>Crédito tributario en compras (15%)</span><span>$ ' + formatUSD(credito) + '</span></div>' +
    '<div class="result-total"><span class="label">' + (esCredito ? 'Crédito tributario a favor' : 'IVA a pagar') + '</span>' +
    '<span class="amount">$ ' + formatUSD(Math.abs(diferencia)) + '</span></div>';

  appendDisclaimerResultado('Art. 61–68 LRTI · Declaración mensual hasta el noveno dígito del RUC.');
}

function calcularRenta() {
  const ingresoAnual = parseFloat(document.getElementById('renta-ingresos').value) || 0;
  const gastos = parseFloat(document.getElementById('renta-gastos').value) || 0;
  const baseImponible = Math.max(ingresoAnual - gastos, 0);

  const tramo = TRAMOS_RENTA.find((t) => baseImponible <= t.hasta) || TRAMOS_RENTA[TRAMOS_RENTA.length - 1];
  const idx = TRAMOS_RENTA.indexOf(tramo);
  const tramoAnterior = idx > 0 ? TRAMOS_RENTA[idx - 1] : { hasta: 0, base: 0, pct: 0 };
  const excedente = Math.max(baseImponible - tramoAnterior.hasta, 0);
  const impuestoCausado = tramo.base + excedente * (tramo.pct / 100);

  const box = document.getElementById('resultado-box');
  box.innerHTML =
    '<div class="row"><span>Base imponible</span><span>$ ' + formatUSD(baseImponible) + '</span></div>' +
    '<div class="row"><span>Tramo aplicado</span><span>' + tramo.pct + '%</span></div>' +
    '<div class="row"><span>Impuesto base del tramo</span><span>$ ' + formatUSD(tramo.base) + '</span></div>' +
    '<div class="result-total"><span class="label">Impuesto a la renta causado</span>' +
    '<span class="amount">$ ' + formatUSD(impuestoCausado) + '</span></div>';

  renderTablaRenta(baseImponible);
  appendDisclaimerResultado('Art. 36 LRTI · Tabla progresiva anual, valores referenciales.');
}

function calcularRetencion() {
  const base = parseFloat(document.getElementById('retencion-base').value) || 0;
  const tipo = document.getElementById('tipo-retencion').value;
  const tarifa = TARIFAS_RETENCION[tipo];
  const monto = base * (tarifa.pct / 100);

  const box = document.getElementById('resultado-box');
  box.innerHTML =
    '<div class="row"><span>Concepto</span><span>' + tarifa.label + '</span></div>' +
    '<div class="row"><span>Base imponible</span><span>$ ' + formatUSD(base) + '</span></div>' +
    '<div class="row"><span>Porcentaje aplicado</span><span>' + tarifa.pct + '%</span></div>' +
    '<div class="result-total"><span class="label">Valor a retener</span>' +
    '<span class="amount">$ ' + formatUSD(monto) + '</span></div>';

  appendDisclaimerResultado('Resolución NAC-DGERCGC vigente · Emitir comprobante de retención dentro de 5 días hábiles.');
}

function appendDisclaimerResultado(texto) {
  const box = document.getElementById('resultado-box');
  const tag = document.createElement('div');
  tag.className = 'norm-tag light mt-16';
  tag.textContent = texto;
  box.appendChild(tag);
}

function renderTablaRenta(baseImponible) {
  const tbody = document.getElementById('tabla-renta-body');
  if (!tbody) return;
  let desde = 0;
  tbody.innerHTML = TRAMOS_RENTA.map((t, i) => {
    const hit = baseImponible !== undefined && baseImponible > desde && baseImponible <= t.hasta;
    const fila =
      '<tr class="' + (hit ? 'hit' : '') + '">' +
      '<td>$ ' + formatUSD(desde) + ' – ' + (t.hasta === Infinity ? 'en adelante' : '$ ' + formatUSD(t.hasta)) + '</td>' +
      '<td>' + t.pct + '%</td>' +
      '</tr>';
    desde = t.hasta;
    return fila;
  }).join('');
}
