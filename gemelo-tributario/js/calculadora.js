document.addEventListener("DOMContentLoaded", () => {
  // Manejo de paneles según el impuesto seleccionado
  const segmentedButtons = document.querySelectorAll("#segmented-impuesto button");
  const panels = {
    iva: document.getElementById("panel-iva"),
    renta: document.getElementById("panel-renta"),
    retenciones: document.getElementById("panel-retenciones")
  };

  let impuestoActual = "iva";

  segmentedButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      segmentedButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      impuestoActual = btn.getAttribute("data-impuesto");

      Object.keys(panels.forEach ? [] : panels).forEach(key => {
        if (panels[key]) {
          if (key === impuestoActual) {
            panels[key].classList.remove("hidden");
          } else {
            panels[key].classList.add("hidden");
          }
        }
      });
    });
  });

  // Porcentajes de retención
  const tipoRetencionSelect = document.getElementById("tipo-retencion");
  const pctRetencionPreview = document.getElementById("pct-retencion-preview");
  const porcentajesRetencion = {
    bienes: 0.0175,
    servicios: 0.02,
    profesionales: 0.10,
    arriendo: 0.08,
    publicidad: 0.01,
    transporte: 0.01
  };

  if (tipoRetencionSelect && pctRetencionPreview) {
    tipoRetencionSelect.addEventListener("change", () => {
      const val = tipoRetencionSelect.value;
      const pct = porcentajesRetencion[val] || 0.0175;
      pctRetencionPreview.textContent = (pct * 100) + "%";
    });
  }

  // Tabla progresiva de Renta referencial (Ejemplo Ecuador)
  const tablaRentaBody = document.getElementById("tabla-renta-body");
  const tramosRenta = [
    { min: 0, max: 11722, tarifa: "0%" },
    { min: 11722, max: 14935, tarifa: "5%" },
    { min: 14935, max: 19682, tarifa: "10%" },
    { min: 19682, max: 26031, tarifa: "12%" },
    { min: 26031, max: 34255, tarifa: "15%" },
    { min: 34255, max: 45405, tarifa: "20%" },
    { min: 45405, max: 60450, tarifa: "25%" },
    { min: 60450, max: 100590, tarifa: "30%" },
    { min: 100590, max: Infinity, tarifa: "37%" }
  ];

  function renderTablaRenta(hitIndex = -1) {
    if (!tablaRentaBody) return;
    tablaRentaBody.innerHTML = "";
    tramosRenta.forEach((tramo, index) => {
      const tr = document.createElement("tr");
      if (index === hitIndex) {
        tr.classList.add("hit");
      }
      const maxStr = tramo.max === Infinity ? "en adelante" : `$${tramo.max.toLocaleString()}`;
      tr.innerHTML = `<td>$${tramo.min.toLocaleString()} - ${maxStr}</td><td>${tramo.tarifa}</td>`;
      tablaRentaBody.appendChild(tr);
    });
  }

  renderTablaRenta();

  // Botón calcular
  const btnCalcular = document.getElementById("btn-calcular");
  const resultadoBox = document.getElementById("resultado-box");

  if (btnCalcular) {
    btnCalcular.addEventListener("click", () => {
      const regimen = document.getElementById("regimen").value;

      if (impuestoActual === "iva") {
        const ingresos = parseFloat(document.getElementById("iva-ingresos").value) || 0;
        const compras = parseFloat(document.getElementById("iva-compras").value) || 0;
        
        // Simulación estándar IVA 15%
        const debitoIva = ingresos * 0.15;
        const creditoIva = compras * 0.15;
        const ivaPagar = Math.max(0, debitoIva - creditoIva);

        resultadoBox.innerHTML = `
          <div class="row"><span>Débito Tributario (Ventas 15%):</span><span>$${debitoIva.toFixed(2)}</span></div>
          <div class="row"><span>Crédito Tributario (Compras):</span><span>$${creditoIva.toFixed(2)}</span></div>
          <div class="result-total">
            <span class="label">IVA a pagar / saldo</span>
            <span class="amount">$${ivaPagar.toFixed(2)}</span>
          </div>
        `;
        renderTablaRenta();

      } else if (impuestoActual === "renta") {
        const ingresos = parseFloat(document.getElementById("renta-ingresos").value) || 0;
        const gastos = parseFloat(document.getElementById("renta-gastos").value) || 0;
        
        let impuestoRenta = 0;
        let tramoEncontrado = 0;

        if (regimen === "rimpe_negocio_popular") {
          impuestoRenta = 60.00; // Cuota fija RIMPE Negocio Popular
        } else if (regimen === "rimpe_emprendedor") {
          // Tarifa progresiva simplificada sobre ingresos brutos para RIMPE Emprendedor (ej. 1% o cálculo básico)
          impuestoRenta = ingresos * 0.01;
        } else {
          // Régimen General con base imponible (Ingresos - Gastos)
          const baseImponible = Math.max(0, ingresos - gastos);
          tramosRenta.forEach((t, idx) => {
            if (baseImponible >= t.min && baseImponible < t.max) {
              tramoEncontrado = idx;
            }
          });
          // Cálculo referencial simple de renta
          impuestoRenta = baseImponible * 0.12; 
        }

        resultadoBox.innerHTML = `
          <div class="row"><span>Régimen Aplicado:</span><span>${regimen.replace('_', ' ').toUpperCase()}</span></div>
          <div class="row"><span>Base / Ingresos Simulado:</span><span>$${Math.max(0, ingresos - gastos).toFixed(2)}</span></div>
          <div class="result-total">
            <span class="label">Impuesto a la Renta Estimado</span>
            <span class="amount">$${impuestoRenta.toFixed(2)}</span>
          </div>
        `;
        renderTablaRenta(regimen === "general" ? tramoEncontrado : -1);

      } else if (impuestoActual === "retenciones") {
        const tipo = tipoRetencionSelect.value;
        const base = parseFloat(document.getElementById("retencion-base").value) || 0;
        const porcentaje = porcentajesRetencion[tipo] || 0.0175;
        const valorRetenido = base * porcentaje;

        resultadoBox.innerHTML = `
          <div class="row"><span>Base Imponible:</span><span>$${base.toFixed(2)}</span></div>
          <div class="row"><span>Porcentaje Aplicado:</span><span>${(porcentaje * 100)}%</span></div>
          <div class="result-total">
            <span class="label">Valor Retenido</span>
            <span class="amount">$${valorRetenido.toFixed(2)}</span>
          </div>
        `;
        renderTablaRenta();
      }
    });
  }
});