document.addEventListener("DOMContentLoaded", () => {
  // Manejo de paneles según el impuesto seleccionado
  const calcTypeButtons = document.querySelectorAll("#calc-type-grid .calc-type-btn");
  const panels = {
    iva: document.getElementById("panel-iva"),
    renta: document.getElementById("panel-renta"),
    retenciones: document.getElementById("panel-retenciones")
  };
  const cardTablaRenta = document.getElementById("card-tabla-renta");

  let impuestoActual = "iva";

  calcTypeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tipo = btn.getAttribute("data-impuesto");

      if (tipo === "utilidad" || tipo === "precio") {
        showToast("Muy pronto disponible en la calculadora.");
        return;
      }

      calcTypeButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      impuestoActual = tipo;

      Object.keys(panels).forEach(key => {
        if (panels[key]) {
          if (key === impuestoActual) {
            panels[key].classList.remove("hidden");
          } else {
            panels[key].classList.add("hidden");
          }
        }
      });

      if (cardTablaRenta) cardTablaRenta.style.display = "none";
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

  function resultTemplate({ label, amount, negative, rows, detail }) {
    const rowsHtml = rows.map(r => `<div class="row"><span>${r.label}</span><span>${r.value}</span></div>`).join("");
    return `
      <div class="result-summary${negative ? " negative" : ""}">
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
    const toggleBtn = document.getElementById("result-toggle-btn");
    const detailBox = document.getElementById("result-detail-box");
    if (toggleBtn && detailBox) {
      toggleBtn.addEventListener("click", () => {
        toggleBtn.classList.toggle("open");
        detailBox.classList.toggle("open");
      });
    }
  }

  if (btnCalcular) {
    btnCalcular.addEventListener("click", () => {
      const regimen = document.getElementById("regimen").value;

      if (impuestoActual === "iva") {
        const ingresos = parseFloat(document.getElementById("iva-ingresos").value) || 0;
        const compras = parseFloat(document.getElementById("iva-compras").value) || 0;

        const debitoIva = ingresos * 0.15;
        const creditoIva = compras * 0.15;
        const ivaPagar = Math.max(0, debitoIva - creditoIva);

        resultadoBox.innerHTML = resultTemplate({
          label: "IVA estimado a pagar",
          amount: ivaPagar.toFixed(2),
          rows: [
            { label: "IVA generado (ventas)", value: `$ ${debitoIva.toFixed(2)}` },
            { label: "Crédito tributario (compras)", value: `– $ ${creditoIva.toFixed(2)}` }
          ],
          detail: "Cálculo referencial según Art. 65-67 de la LRTI: IVA generado en ventas (tarifa 15%) menos crédito tributario de compras con derecho a crédito. Verifica siempre la normativa vigente."
        });
        bindResultToggle();
        if (cardTablaRenta) cardTablaRenta.style.display = "none";

      } else if (impuestoActual === "renta") {
        const ingresos = parseFloat(document.getElementById("renta-ingresos").value) || 0;
        const gastos = parseFloat(document.getElementById("renta-gastos").value) || 0;

        let impuestoRenta = 0;
        let tramoEncontrado = 0;

        if (regimen === "rimpe_negocio_popular") {
          impuestoRenta = 60.00;
        } else if (regimen === "rimpe_emprendedor") {
          impuestoRenta = ingresos * 0.01;
        } else {
          const baseImponible = Math.max(0, ingresos - gastos);
          tramosRenta.forEach((t, idx) => {
            if (baseImponible >= t.min && baseImponible < t.max) {
              tramoEncontrado = idx;
            }
          });
          impuestoRenta = baseImponible * 0.12;
        }

        resultadoBox.innerHTML = resultTemplate({
          label: "Impuesto a la Renta estimado",
          amount: impuestoRenta.toFixed(2),
          rows: [
            { label: "Régimen aplicado", value: regimen.replace(/_/g, " ") },
            { label: "Base / ingresos simulado", value: `$ ${Math.max(0, ingresos - gastos).toFixed(2)}` }
          ],
          detail: "Cálculo referencial según tu régimen: cuota fija para RIMPE Negocio Popular, tarifa simplificada sobre ingresos para RIMPE Emprendedor, o tabla progresiva de la LRTI para Régimen General."
        });
        bindResultToggle();
        if (cardTablaRenta) cardTablaRenta.style.display = regimen === "general" ? "block" : "none";
        renderTablaRenta(regimen === "general" ? tramoEncontrado : -1);

      } else if (impuestoActual === "retenciones") {
        const tipo = tipoRetencionSelect.value;
        const base = parseFloat(document.getElementById("retencion-base").value) || 0;
        const porcentaje = porcentajesRetencion[tipo] || 0.0175;
        const valorRetenido = base * porcentaje;

        resultadoBox.innerHTML = resultTemplate({
          label: "Valor retenido",
          amount: valorRetenido.toFixed(2),
          rows: [
            { label: "Base imponible", value: `$ ${base.toFixed(2)}` },
            { label: "Porcentaje aplicado", value: `${(porcentaje * 100)}%` }
          ],
          detail: "El valor retenido se calcula aplicando el porcentaje correspondiente según el tipo de retención al valor de la factura (base imponible)."
        });
        bindResultToggle();
        if (cardTablaRenta) cardTablaRenta.style.display = "none";
      }
    });
  }

  // Diagnóstico tributario
  const btnDiagnostico = document.getElementById("btn-diagnostico");
  const diagnosticBox = document.getElementById("diagnostic-box");
  const diagnosticResult = document.getElementById("diagnostic-result");

  if (btnDiagnostico && diagnosticBox) {
    btnDiagnostico.addEventListener("click", () => {
      diagnosticBox.classList.toggle("open");
    });
  }

  if (diagnosticBox) {
    diagnosticBox.querySelectorAll(".diagnostic-opts button").forEach(btn => {
      btn.addEventListener("click", () => {
        if (diagnosticResult) {
          diagnosticResult.innerHTML = `<strong>Recomendación:</strong> ${btn.getAttribute("data-r")}`;
          diagnosticResult.classList.add("open");
        }
      });
    });
  }

  // ------------------------------------------------------------
  // Extras de la nueva vista: texto del botón Calcular, limpiar
  // campos y toasts de los botones decorativos. No modifica nada
  // de la lógica de cálculo de arriba.
  // ------------------------------------------------------------
  const btnCalcularLabel = document.getElementById("btn-calcular-label");
  const labelPorTipo = { iva: "Calcular IVA", renta: "Calcular Renta", retenciones: "Calcular Retención" };
  calcTypeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const tipo = btn.getAttribute("data-impuesto");
      if (btnCalcularLabel && labelPorTipo[tipo]) {
        btnCalcularLabel.textContent = labelPorTipo[tipo];
      }
    });
  });

  const btnLimpiar = document.getElementById("btn-limpiar");
  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", () => {
      document.querySelectorAll(".panel-impuesto input[type='number']").forEach(inp => { inp.value = ""; });
      const tipoSel = document.getElementById("tipo-retencion");
      if (tipoSel) tipoSel.selectedIndex = 0;
      if (pctRetencionPreview) pctRetencionPreview.textContent = "1.75%";
      if (resultadoBox) {
        resultadoBox.innerHTML = `
          <div class="result-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h3M13 11h3M8 15h3M13 15h3"/></svg>
            <p>Ingresa tus datos y presiona <strong>Calcular</strong> para ver el resultado referencial.</p>
          </div>`;
      }
      if (cardTablaRenta) cardTablaRenta.style.display = "none";
    });
  }

  document.querySelectorAll("[data-toast]").forEach(el => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      showToast(el.getAttribute("data-toast"));
    });
  });

  const btnComoUsar = document.getElementById("btn-como-usar");
  if (btnComoUsar) {
    btnComoUsar.addEventListener("click", () => {
      showToast("Selecciona qué quieres calcular, ingresa tus datos y presiona Calcular.");
    });
  }
});