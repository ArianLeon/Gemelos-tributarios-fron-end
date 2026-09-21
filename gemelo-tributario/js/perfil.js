const API_URL = 'http://localhost:8080/api';

const idUsuario = localStorage.getItem('gt_id_usuario');
if (!idUsuario) {
  window.location.href = 'Login.html';
}

// Guardamos aqui lo que llega del backend para poder reenviarlo completo
// en cada PUT (evita que un campo que el formulario no toca se borre).
let usuarioActual = null;
let perfilActual = null;

const REGIMEN_INFO = {
  RIMPE_NEGOCIO_POPULAR: 'Ingresos brutos anuales de hasta USD 20.000. Cuota fija y facturación simplificada.',
  RIMPE_EMPRENDEDOR: 'Ingresos brutos superiores a USD 20.000 y hasta USD 300.000 anuales.',
  GENERAL: 'Sin límite de ingresos. Declaración de IVA y Renta según el calendario general del SRI.'
};

const REGIMEN_LABEL = {
  RIMPE_NEGOCIO_POPULAR: 'RIMPE – Negocio Popular',
  RIMPE_EMPRENDEDOR: 'RIMPE – Emprendedor',
  GENERAL: 'Régimen General'
};

/* ------------------------------------------------------------
   Validaciones (mismo patrón que en registro.js): marca en rojo
   los campos obligatorios vacios/invalidos y muestra un modal
   explicando cual es el problema.
   ------------------------------------------------------------ */
function mostrarError(mensaje) {
  document.getElementById('modal-error-mensaje').textContent = mensaje;
  document.getElementById('modal-error').classList.add('show');
}

function marcarEstado(campo) {
  if (campo.checkValidity()) {
    campo.classList.remove('invalid');
  } else {
    campo.classList.add('invalid');
  }
}

function obtenerNombreCampo(campo) {
  if (campo.labels && campo.labels[0]) {
    return campo.labels[0].textContent.trim();
  }
  const labelPadre = campo.closest('label');
  if (labelPadre) {
    return labelPadre.textContent.trim();
  }
  return 'Este campo';
}

function calcularEdad(fechaStr) {
  const nacimiento = new Date(fechaStr);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

function marcarGrupoRadio(valido) {
  const contenedor = document.querySelector('#form-perfil-tributario .form-row-checkboxes');
  if (contenedor) contenedor.style.borderColor = valido ? 'var(--border)' : 'var(--red-600)';
}

function validarFormulario(formulario) {
  let primerInvalido = null;
  let mensajeError = '';

  const campos = formulario.querySelectorAll('input:not([type=radio]):not([type=checkbox]):not([type=file]):not([disabled]), select');

  campos.forEach((campo) => {
    marcarEstado(campo);
    if (!campo.checkValidity() && !primerInvalido) {
      primerInvalido = campo;
      const nombre = obtenerNombreCampo(campo);
      if (campo.validity.valueMissing) {
        mensajeError = `El campo "${nombre}" es obligatorio.`;
      } else {
        mensajeError = `El campo "${nombre}" no es válido, revísalo.`;
      }
    }
  });

  // Validacion extra de edad minima, solo si el formulario tiene fecha de nacimiento
  const fechaNacInput = formulario.querySelector('#fecha_nacimiento');
  if (fechaNacInput && fechaNacInput.value && calcularEdad(fechaNacInput.value) < 15) {
    fechaNacInput.classList.add('invalid');
    if (!primerInvalido) {
      primerInvalido = fechaNacInput;
      mensajeError = 'La fecha de nacimiento es incorrecta: debes tener al menos 15 años.';
    }
  }

  // Validacion extra del grupo de radios "condicion tributaria", si aplica
  const gruposRadio = formulario.querySelectorAll('input[type=radio][required]');
  if (gruposRadio.length) {
    const condicionMarcada = formulario.querySelector('input[name="condicion_tributaria"]:checked');
    marcarGrupoRadio(!!condicionMarcada);
    if (!condicionMarcada && !primerInvalido) {
      primerInvalido = gruposRadio[0];
      mensajeError = 'Selecciona una opción en "Condición tributaria".';
    }
  }

  return { primerInvalido, mensajeError };
}

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
  cargarPerfilTributario();
  cargarNotificaciones();

  document.getElementById('form-datos-personales').addEventListener('submit', guardarDatosPersonales);
  document.getElementById('form-perfil-tributario').addEventListener('submit', guardarPerfilTributario);
  document.getElementById('foto_archivo').addEventListener('change', subirFoto);
  document.getElementById('regimen').addEventListener('change', (e) => actualizarInfoRegimen(e.target.value));

  document.getElementById('modal-error-cerrar').addEventListener('click', () => {
    document.getElementById('modal-error').classList.remove('show');
  });

  // Quita el rojo de un campo en cuanto el usuario lo corrige
  document.querySelectorAll('#form-datos-personales input, #form-perfil-tributario input, #form-perfil-tributario select')
    .forEach((campo) => {
      campo.addEventListener('input', () => {
        if (campo.classList.contains('invalid')) marcarEstado(campo);
      });
      campo.addEventListener('change', () => {
        if (campo.classList.contains('invalid')) marcarEstado(campo);
      });
    });

  document.getElementById('cerrar-sesion').addEventListener('click', () => {
    localStorage.removeItem('gt_id_usuario');
  });

  const updatedEl = document.getElementById('regime-updated');
  const ahora = new Date();
  updatedEl.textContent = 'Actualizado: hoy, ' + ahora.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
});

async function cargarUsuario() {
  const res = await fetch(`${API_URL}/usuarios/${idUsuario}`);
  if (!res.ok) {
    showToast('No se pudo cargar tu cuenta.');
    return;
  }
  usuarioActual = await res.json();

  document.getElementById('primer_nombre').value = usuarioActual.primerNombre || '';
  document.getElementById('segundo_nombre').value = usuarioActual.segundoNombre || '';
  document.getElementById('apellido_paterno').value = usuarioActual.apellidoPaterno || '';
  document.getElementById('apellido_materno').value = usuarioActual.apellidoMaterno || '';
  document.getElementById('correo').value = usuarioActual.correo || '';
  document.getElementById('telefono').value = usuarioActual.telefono || '';
  document.getElementById('fecha_nacimiento').value = usuarioActual.fechaNacimiento || '';
  document.getElementById('direccion').value = usuarioActual.direccion || '';

  const nombreCompleto = [usuarioActual.primerNombre, usuarioActual.apellidoPaterno].filter(Boolean).join(' ');
  document.getElementById('perfil-nombre-display').textContent = nombreCompleto || 'Sin nombre';
  document.getElementById('topbar-nombre').textContent = usuarioActual.primerNombre || 'Usuario';

  const avatarTopbar = document.getElementById('topbar-avatar');
  if (usuarioActual.fotoUrl) {
    avatarTopbar.innerHTML = `<img src="http://localhost:8080${usuarioActual.fotoUrl}" alt="Foto de perfil" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  } else {
    const iniciales = (usuarioActual.primerNombre?.[0] || '') + (usuarioActual.apellidoPaterno?.[0] || '');
    avatarTopbar.textContent = iniciales.toUpperCase() || 'GT';
  }

  if (usuarioActual.fotoUrl) {
    mostrarFotoEnCirculo(usuarioActual.fotoUrl);
  }
}

async function cargarPerfilTributario() {
  const res = await fetch(`${API_URL}/perfiles-tributarios/usuario/${idUsuario}`);
  if (!res.ok) {
    showToast('Aún no tienes un perfil tributario registrado.');
    return;
  }
  perfilActual = await res.json();

  document.getElementById('ruc_cedula').value = perfilActual.rucCedula || '';
  document.getElementById('nombre_negocio').value = perfilActual.nombreNegocio || '';
  document.getElementById('direccion_negocio').value = perfilActual.direccionNegocio || '';
  document.getElementById('regimen').value = perfilActual.regimen;
  document.getElementById('tipo_contribuyente').value = perfilActual.tipoContribuyente;

  let condicion = 'no_obligado';
  if (perfilActual.obligadoContabilidad) condicion = 'obligado';
  else if (perfilActual.agenteRetencion) condicion = 'agente';
  const radio = document.querySelector(`input[name="condicion_tributaria"][value="${condicion}"]`);
  if (radio) radio.checked = true;

  actualizarEncabezadoRegimen(perfilActual.regimen);
  actualizarInfoRegimen(perfilActual.regimen);
}

async function cargarNotificaciones() {
  const res = await fetch(`${API_URL}/notificaciones/usuario/${idUsuario}`);
  if (!res.ok) return;
  const notificaciones = await res.json();

  document.getElementById('notif-count').textContent = notificaciones.filter((n) => !n.leida).length;

  const lista = document.getElementById('notif-lista');
  lista.innerHTML = '';
  notificaciones.slice(0, 5).forEach((n) => {
    const item = document.createElement('div');
    item.className = 'notif-item';
    item.innerHTML = `<strong>${n.titulo}</strong><span>${n.mensaje}</span>`;
    lista.appendChild(item);
  });
}

function actualizarEncabezadoRegimen(regimen) {
  const label = REGIMEN_LABEL[regimen] || regimen;
  document.getElementById('perfil-regimen-display').textContent = label;
  document.getElementById('sidebar-regimen').textContent = label;
}

function actualizarInfoRegimen(regimen) {
  document.getElementById('regimen-info-text').textContent = REGIMEN_INFO[regimen] || '';
}

function mostrarFotoEnCirculo(fotoUrl) {
  const caja = document.getElementById('avatar-preview-box');
  caja.innerHTML = `<img src="http://localhost:8080${fotoUrl}" alt="Foto de perfil">`;
}

/* ------------------------------------------------------------
   Subir foto (se guarda al instante al elegir el archivo)
   ------------------------------------------------------------ */
async function subirFoto() {
  const archivo = document.getElementById('foto_archivo').files[0];
  if (!archivo) return;

  // Vista previa inmediata, antes de que responda el servidor
  const lector = new FileReader();
  lector.onload = (e) => {
    document.getElementById('avatar-preview-box').innerHTML = `<img src="${e.target.result}" alt="Foto de perfil">`;
  };
  lector.readAsDataURL(archivo);

  const formData = new FormData();
  formData.append('archivo', archivo);

  try {
    const res = await fetch(`${API_URL}/usuarios/${idUsuario}/foto`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error();
    usuarioActual = await res.json();

    // Actualiza también el circulo de arriba con la nueva foto
    const avatarTopbar = document.getElementById('topbar-avatar');
    if (usuarioActual.fotoUrl) {
      avatarTopbar.innerHTML = `<img src="http://localhost:8080${usuarioActual.fotoUrl}" alt="Foto de perfil" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }

    showToast('Foto actualizada');
  } catch {
    showToast('No se pudo subir la foto');
  }
}

/* ------------------------------------------------------------
   Guardar datos personales
   ------------------------------------------------------------ */
async function guardarDatosPersonales(e) {
  e.preventDefault();

  const { primerInvalido, mensajeError } = validarFormulario(document.getElementById('form-datos-personales'));
  if (primerInvalido) {
    primerInvalido.focus();
    mostrarError(mensajeError);
    return;
  }

  const payload = {
    primerNombre: document.getElementById('primer_nombre').value.trim(),
    segundoNombre: document.getElementById('segundo_nombre').value.trim() || null,
    apellidoPaterno: document.getElementById('apellido_paterno').value.trim(),
    apellidoMaterno: document.getElementById('apellido_materno').value.trim() || null,
    correo: document.getElementById('correo').value.trim(),
    telefono: document.getElementById('telefono').value.trim() || null,
    fechaNacimiento: document.getElementById('fecha_nacimiento').value || null,
    direccion: document.getElementById('direccion').value.trim() || null,
    fotoUrl: usuarioActual?.fotoUrl || null // se reenvia para que el PUT no la borre
  };

  const res = await fetch(`${API_URL}/usuarios/${idUsuario}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    showToast(err?.mensaje || 'No se pudieron guardar los datos.');
    return;
  }

  usuarioActual = await res.json();
  document.getElementById('perfil-nombre-display').textContent =
    [usuarioActual.primerNombre, usuarioActual.apellidoPaterno].filter(Boolean).join(' ');
  document.getElementById('topbar-nombre').textContent = usuarioActual.primerNombre;
  showToast('Datos personales guardados');
}

/* ------------------------------------------------------------
   Guardar perfil tributario
   ------------------------------------------------------------ */
async function guardarPerfilTributario(e) {
  e.preventDefault();
  if (!perfilActual) {
    showToast('No hay un perfil tributario que editar.');
    return;
  }

  const { primerInvalido, mensajeError } = validarFormulario(document.getElementById('form-perfil-tributario'));
  if (primerInvalido) {
    primerInvalido.focus();
    mostrarError(mensajeError);
    return;
  }

  const condicion = document.querySelector('input[name="condicion_tributaria"]:checked')?.value;

  const payload = {
    ...perfilActual, // conserva rucCedula, novenoDigito, etc.
    nombreNegocio: document.getElementById('nombre_negocio').value.trim() || null,
    direccionNegocio: document.getElementById('direccion_negocio').value.trim() || null,
    regimen: document.getElementById('regimen').value,
    tipoContribuyente: document.getElementById('tipo_contribuyente').value,
    obligadoContabilidad: condicion === 'obligado',
    agenteRetencion: condicion === 'agente'
  };

  const res = await fetch(`${API_URL}/perfiles-tributarios/${perfilActual.idPerfil}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    showToast(err?.mensaje || 'No se pudo guardar el perfil tributario.');
    return;
  }

  perfilActual = await res.json();
  actualizarEncabezadoRegimen(perfilActual.regimen);
  actualizarInfoRegimen(perfilActual.regimen);
  showToast('Perfil tributario guardado');
}