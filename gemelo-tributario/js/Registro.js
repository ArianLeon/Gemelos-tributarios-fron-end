const API_URL = 'http://localhost:8080/api';

const form = document.getElementById('form-registro');
const submitBtn = document.getElementById('registro-submit');

function mostrarError(mensaje) {
  document.getElementById('modal-error-mensaje').textContent = mensaje;
  document.getElementById('modal-error').classList.add('show');
}
document.getElementById('modal-error-cerrar').addEventListener('click', () => {
  document.getElementById('modal-error').classList.remove('show');
});


// 1) Solo numeros en RUC/cedula y telefono, con tope de digitos.
//    Se filtra en cada tecla, no solo al enviar.
function soloNumeros(input, maxDigitos) {
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D/g, '').slice(0, maxDigitos);
  });
}
soloNumeros(document.getElementById('ruc_cedula'), 13);
soloNumeros(document.getElementById('telefono'), 10);


// 2) Vista previa de la foto de perfil al elegir un archivo.
const inputFoto = document.getElementById('foto_archivo');
const cajaAvatar = document.getElementById('avatar-preview-box');

inputFoto.addEventListener('change', () => {
  const archivo = inputFoto.files[0];
  if (!archivo) return;

  const lector = new FileReader();
  lector.onload = (e) => {
    cajaAvatar.innerHTML = `<img src="${e.target.result}" alt="Foto de perfil">`;
  };
  lector.readAsDataURL(archivo);
});


// 3) Marcar en rojo cada campo invalido (no solo bloquear el envio).
const camposConValidacionNativa = form.querySelectorAll('input:not([type=radio]):not([type=checkbox]):not([type=file]), select');

function marcarEstado(campo) {
  if (campo.checkValidity()) {
    campo.classList.remove('invalid');
  } else {
    campo.classList.add('invalid');
  }
}

camposConValidacionNativa.forEach((campo) => {
  campo.addEventListener('blur', () => marcarEstado(campo));
  campo.addEventListener('input', () => {
    if (campo.classList.contains('invalid')) marcarEstado(campo);
  });
  campo.addEventListener('change', () => marcarEstado(campo));
});

function marcarGrupoRadio(valido) {
  const contenedor = document.querySelector('.form-row-checkboxes');
  contenedor.style.borderColor = valido ? 'var(--border)' : 'var(--red-600)';
}

function marcarTerminos(valido) {
  const checkbox = document.getElementById('acepto_terminos').nextElementSibling; // .check-box
  checkbox.style.borderColor = valido ? 'var(--border)' : 'var(--red-600)';
}

function calcularEdad(fechaStr) {
  const nacimiento = new Date(fechaStr);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}


// Obtiene el nombre "humano" de un campo a partir de su <label>,
// para poder armar el mensaje del modal.
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

function validarTodoYMarcar() {
  let primerInvalido = null;
  let mensajeError = '';

  camposConValidacionNativa.forEach((campo) => {
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

  const condicionMarcada = document.querySelector('input[name="condicion_tributaria"]:checked');
  marcarGrupoRadio(!!condicionMarcada);
  if (!condicionMarcada && !primerInvalido) {
    primerInvalido = document.querySelector('input[name="condicion_tributaria"]');
    mensajeError = 'Selecciona una opción en "Condición tributaria".';
  }

  const terminosAceptados = document.getElementById('acepto_terminos').checked;
  marcarTerminos(terminosAceptados);
  if (!terminosAceptados && !primerInvalido) {
    primerInvalido = document.getElementById('acepto_terminos');
    mensajeError = 'Debes aceptar los términos y condiciones.';
  }

  const contrasena = document.getElementById('contrasena');
  const confirmar = document.getElementById('confirmar_contrasena');
  const coinciden = contrasena.value === confirmar.value;
  if (!coinciden) {
    confirmar.classList.add('invalid');
    if (!primerInvalido) {
      primerInvalido = confirmar;
      mensajeError = 'Las contraseñas no coinciden.';
    }
  }

  const fechaNacInput = document.getElementById('fecha_nacimiento');
  if (fechaNacInput.value && calcularEdad(fechaNacInput.value) < 15) {
    fechaNacInput.classList.add('invalid');
    if (!primerInvalido) {
      primerInvalido = fechaNacInput;
      mensajeError = 'La fecha de nacimiento es incorrecta: debes tener al menos 15 años.';
    }
  }

  return { primerInvalido, mensajeError };
}


// Envio del formulario
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const { primerInvalido, mensajeError } = validarTodoYMarcar();
  if (primerInvalido) {
    primerInvalido.focus();
    mostrarError(mensajeError);
    return;
  }

  submitBtn.classList.add('btn-loading');

  const datosUsuario = {
    primerNombre: document.getElementById('primer_nombre').value.trim(),
    segundoNombre: document.getElementById('segundo_nombre').value.trim() || null,
    apellidoPaterno: document.getElementById('apellido_paterno').value.trim(),
    apellidoMaterno: document.getElementById('apellido_materno').value.trim() || null,
    correo: document.getElementById('correo').value.trim(),
    contrasenaHash: document.getElementById('contrasena').value, // el backend lo hashea
    telefono: document.getElementById('telefono').value.trim() || null,
    fechaNacimiento: document.getElementById('fecha_nacimiento').value || null,
    direccion: document.getElementById('direccion').value.trim() || null
  };

  try {
    const resUsuario = await fetch(`${API_URL}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosUsuario)
    });

    if (!resUsuario.ok) {
      const err = await resUsuario.json().catch(() => null);
      throw new Error(err?.mensaje || 'No se pudo crear el usuario.');
    }

    const usuario = await resUsuario.json();
    const idUsuario = usuario.idUsuario;

    const condicion = document.querySelector('input[name="condicion_tributaria"]:checked')?.value;

    const datosPerfil = {
      rucCedula: document.getElementById('ruc_cedula').value.trim(),
      nombreNegocio: document.getElementById('nombre_negocio').value.trim() || null,
      direccionNegocio: document.getElementById('direccion_negocio').value.trim() || null,
      regimen: document.getElementById('regimen').value,
      tipoContribuyente: document.getElementById('tipo_contribuyente').value,
      obligadoContabilidad: condicion === 'obligado',
      agenteRetencion: condicion === 'agente'
    };

    const resPerfil = await fetch(`${API_URL}/perfiles-tributarios/usuario/${idUsuario}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosPerfil)
    });

    if (!resPerfil.ok) {
      const err = await resPerfil.json().catch(() => null);
      throw new Error(err?.mensaje || 'El usuario se creó, pero falló el perfil tributario.');
    }

    // 3) Subir la foto de perfil, si se eligio una 
    const archivoFoto = document.getElementById('foto_archivo').files[0];
    if (archivoFoto) {
      const formData = new FormData();
      formData.append('archivo', archivoFoto);

      const resFoto = await fetch(`${API_URL}/usuarios/${idUsuario}/foto`, {
        method: 'POST',
        body: formData 
      });

      if (!resFoto.ok) {
        console.warn('El usuario se creó, pero la foto no se pudo subir.');
      }
    }

    localStorage.setItem('gt_registro_correo', datosUsuario.correo); // solo para prellenar el login, no es sesion
    window.location.href = 'Login.html';

  } catch (error) {
    mostrarError(error.message);
  } finally {
    submitBtn.classList.remove('btn-loading');
  }
});

// 4) Mostrar / ocultar contraseña 
document.querySelectorAll('.password-toggle').forEach((boton) => {
  boton.addEventListener('click', () => {
    const idCampo = boton.getAttribute('data-toggle-for');
    const campoPass = document.getElementById(idCampo);
    const iconoOjo = boton.querySelector('.icon-eye');
    const iconoOjoTachado = boton.querySelector('.icon-eye-off');

    const mostrando = campoPass.type === 'text';

    campoPass.type = mostrando ? 'password' : 'text';
    iconoOjo.classList.toggle('hidden', !mostrando);
    iconoOjoTachado.classList.toggle('hidden', mostrando);
  });
});