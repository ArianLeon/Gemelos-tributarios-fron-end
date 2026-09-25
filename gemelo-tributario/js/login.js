const API_URL = 'http://localhost:8080/api';

const form = document.getElementById('login-form');
const submitBtn = document.getElementById('login-submit');
const emailInput = document.getElementById('login-email');
const passwordInput = document.getElementById('login-password');

// Si venimos del registro, prellenar el correo (comodidad, no obligatorio)
const correoRecienRegistrado = localStorage.getItem('gt_registro_correo');
if (correoRecienRegistrado) {
  emailInput.value = correoRecienRegistrado;
  localStorage.removeItem('gt_registro_correo');
}

function setFieldError(inputEl, errorEl, message) {
  errorEl.textContent = message || '';
  inputEl.classList.toggle('invalid', !!message);
}

function limpiarErrores() {
  setFieldError(emailInput, document.getElementById('login-email-error'), '');
  setFieldError(passwordInput, document.getElementById('login-password-error'), '');
}

// ------------------------------------------------------------------
// Mostrar / ocultar contraseña
// ------------------------------------------------------------------
const EYE_OPEN = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
const EYE_OFF = '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-3.22 4.4M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/>';

document.getElementById('password-toggle').addEventListener('click', () => {
  const icon = document.getElementById('eye-icon');
  const mostrando = passwordInput.type === 'text';
  passwordInput.type = mostrando ? 'password' : 'text';
  icon.innerHTML = mostrando ? EYE_OPEN : EYE_OFF;
});

// ------------------------------------------------------------------
// Validacion + envio
// ------------------------------------------------------------------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  limpiarErrores();

  const correo = emailInput.value.trim();
  const contrasena = passwordInput.value;
  let valido = true;

  if (!correo) {
    setFieldError(emailInput, document.getElementById('login-email-error'), 'Ingresa tu correo.');
    valido = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    setFieldError(emailInput, document.getElementById('login-email-error'), 'El correo no es válido.');
    valido = false;
  }

  if (!contrasena) {
    setFieldError(passwordInput, document.getElementById('login-password-error'), 'Ingresa tu contraseña.');
    valido = false;
  }

  if (!valido) return;

  submitBtn.classList.add('btn-loading');
  submitBtn.disabled = true;

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correo, contrasenaHash: contrasena })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      // El backend siempre da el mismo mensaje para correo o clave mal,
      // asi que se muestra junto a la contraseña, no se distingue cual fallo.
      setFieldError(passwordInput, document.getElementById('login-password-error'),
        err?.mensaje || 'Correo o contraseña incorrectos.');
      return;
    }

       const usuario = await res.json();
    localStorage.setItem('gt_id_usuario', usuario.idUsuario);
    localStorage.setItem('gt_rol', usuario.rol || 'USUARIO');

    if (document.getElementById('remember-me').checked) {
      localStorage.setItem('gt_recordar_correo', correo);
    } else {
      localStorage.removeItem('gt_recordar_correo');
    }

    window.location.href = usuario.rol === 'ADMIN' ? 'admin-dashboard.html' : 'dashboard.html';

  } catch (error) {
    setFieldError(passwordInput, document.getElementById('login-password-error'),
      'No se pudo conectar con el servidor.');
  } finally {
    submitBtn.classList.remove('btn-loading');
    submitBtn.disabled = false;
  }
});

// Si el usuario marco "Recuerdame" antes, prellenar (correo del login guardado
// tiene prioridad sobre el del registro, por si ya inicio sesion antes)
const correoRecordado = localStorage.getItem('gt_recordar_correo');
if (correoRecordado) {
  emailInput.value = correoRecordado;
  document.getElementById('remember-me').checked = true;
}