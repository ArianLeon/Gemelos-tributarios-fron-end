const API_URL = 'http://localhost:8080/api';

// ------------------------------------------------------------------
// Elementos
// ------------------------------------------------------------------
const pasoCorreo = document.getElementById('paso-correo');
const pasoCodigo = document.getElementById('paso-codigo');
const pasoExito = document.getElementById('paso-exito');

const formCorreo = document.getElementById('form-correo');
const emailInput = document.getElementById('recuperar-email');
const recuperarSubmit = document.getElementById('recuperar-submit');
const correoAlerta = document.getElementById('correo-alerta');

const formCodigo = document.getElementById('form-codigo');
const codigoInput = document.getElementById('codigo');
const nuevaContrasenaInput = document.getElementById('nueva-contrasena');
const confirmarContrasenaInput = document.getElementById('confirmar-contrasena');
const restablecerSubmit = document.getElementById('restablecer-submit');
const codigoAlerta = document.getElementById('codigo-alerta');
const correoMostrado = document.getElementById('correo-mostrado');

const reenviarBtn = document.getElementById('reenviar-btn');

// Correo que el usuario ya escribió en el paso 1, para poder reenviar
// el código en el paso 2 sin pedirselo de nuevo.
let correoActual = '';

// ------------------------------------------------------------------
// Utilidades de errores de campo (mismo patrón que login.js/Registro.js)
// ------------------------------------------------------------------
function setFieldError(inputEl, errorEl, message) {
  errorEl.textContent = message || '';
  inputEl.classList.toggle('invalid', !!message);
}

function mostrarAlerta(alertaEl, mensaje) {
  alertaEl.textContent = mensaje;
  alertaEl.classList.add('show');
}

function ocultarAlerta(alertaEl) {
  alertaEl.textContent = '';
  alertaEl.classList.remove('show');
}

function irAlPaso(pasoActivo) {
  [pasoCorreo, pasoCodigo].forEach((paso) => paso.classList.remove('active'));
  pasoExito.classList.remove('active');
  pasoActivo.classList.add('active');
}

// ------------------------------------------------------------------
// Mostrar / ocultar contraseña (nueva contraseña y confirmación)
// ------------------------------------------------------------------
const EYE_OPEN = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
const EYE_OFF = '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-3.22 4.4M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/>';

function activarToggleContrasena(botonId, inputEl) {
  const boton = document.getElementById(botonId);
  boton.addEventListener('click', () => {
    const icono = boton.querySelector('.eye-icon');
    const mostrando = inputEl.type === 'text';
    inputEl.type = mostrando ? 'password' : 'text';
    icono.innerHTML = mostrando ? EYE_OPEN : EYE_OFF;
    boton.setAttribute('aria-pressed', String(!mostrando));
  });
}

activarToggleContrasena('password-toggle-1', nuevaContrasenaInput);
activarToggleContrasena('password-toggle-2', confirmarContrasenaInput);

// Solo dígitos en el código, tope de 6
codigoInput.addEventListener('input', () => {
  codigoInput.value = codigoInput.value.replace(/\D/g, '').slice(0, 6);
});

// ------------------------------------------------------------------
// Llama a /api/auth/recuperar (usado tanto por el submit del paso 1
// como por el botón "Reenviar código" del paso 2).
// ------------------------------------------------------------------
async function solicitarCodigo(correo) {
  const res = await fetch(`${API_URL}/auth/recuperar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.mensaje || 'No se pudo enviar el código. Intenta de nuevo.');
  }
}

// ------------------------------------------------------------------
// PASO 1: enviar correo -> pedir código
// ------------------------------------------------------------------
formCorreo.addEventListener('submit', async (e) => {
  e.preventDefault();
  ocultarAlerta(correoAlerta);
  setFieldError(emailInput, document.getElementById('recuperar-email-error'), '');

  const correo = emailInput.value.trim();

  if (!correo) {
    setFieldError(emailInput, document.getElementById('recuperar-email-error'), 'Ingresa tu correo.');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    setFieldError(emailInput, document.getElementById('recuperar-email-error'), 'El correo no es válido.');
    return;
  }

  recuperarSubmit.classList.add('btn-loading');
  recuperarSubmit.disabled = true;

  try {
    await solicitarCodigo(correo);

    // El backend responde 200 tanto si el correo existe como si no
    // (para no revelar qué correos están registrados), asi que aqui
    // siempre avanzamos al paso 2 sin distinguir el caso.
    correoActual = correo;
    correoMostrado.textContent = correo;
    codigoInput.value = '';
    nuevaContrasenaInput.value = '';
    confirmarContrasenaInput.value = '';
    ocultarAlerta(codigoAlerta);
    irAlPaso(pasoCodigo);

  } catch (error) {
    mostrarAlerta(correoAlerta, error.message || 'No se pudo conectar con el servidor.');
  } finally {
    recuperarSubmit.classList.remove('btn-loading');
    recuperarSubmit.disabled = false;
  }
});

// ------------------------------------------------------------------
// PASO 2: validar código + nueva contraseña -> restablecer
// ------------------------------------------------------------------
formCodigo.addEventListener('submit', async (e) => {
  e.preventDefault();
  ocultarAlerta(codigoAlerta);
  setFieldError(codigoInput, document.getElementById('codigo-error'), '');
  setFieldError(nuevaContrasenaInput, document.getElementById('nueva-contrasena-error'), '');
  setFieldError(confirmarContrasenaInput, document.getElementById('confirmar-contrasena-error'), '');

  const codigo = codigoInput.value.trim();
  const nuevaContrasena = nuevaContrasenaInput.value;
  const confirmarContrasena = confirmarContrasenaInput.value;
  let valido = true;

  if (codigo.length !== 6) {
    setFieldError(codigoInput, document.getElementById('codigo-error'), 'Ingresa el código de 6 dígitos.');
    valido = false;
  }
  if (!nuevaContrasena || nuevaContrasena.length < 8) {
    setFieldError(nuevaContrasenaInput, document.getElementById('nueva-contrasena-error'), 'Debe tener al menos 8 caracteres.');
    valido = false;
  }
  if (confirmarContrasena !== nuevaContrasena) {
    setFieldError(confirmarContrasenaInput, document.getElementById('confirmar-contrasena-error'), 'Las contraseñas no coinciden.');
    valido = false;
  }

  if (!valido) return;

  restablecerSubmit.classList.add('btn-loading');
  restablecerSubmit.disabled = true;

  try {
    const res = await fetch(`${API_URL}/auth/restablecer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo, nuevaContrasena })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      mostrarAlerta(codigoAlerta, err?.mensaje || 'El código es inválido o expiró.');
      return;
    }

    irAlPaso(pasoExito);
    pasoExito.classList.add('active');

  } catch (error) {
    mostrarAlerta(codigoAlerta, 'No se pudo conectar con el servidor.');
  } finally {
    restablecerSubmit.classList.remove('btn-loading');
    restablecerSubmit.disabled = false;
  }
});

// ------------------------------------------------------------------
// Reenviar código, con un enfriamiento de 30s para no spamear el
// endpoint (y de paso, no saturar el correo del usuario).
// ------------------------------------------------------------------
let segundosRestantes = 0;
let intervaloReenvio = null;

function iniciarEnfriamiento() {
  segundosRestantes = 30;
  reenviarBtn.disabled = true;
  reenviarBtn.textContent = `Reenviar código (${segundosRestantes}s)`;

  intervaloReenvio = setInterval(() => {
    segundosRestantes -= 1;
    if (segundosRestantes <= 0) {
      clearInterval(intervaloReenvio);
      reenviarBtn.disabled = false;
      reenviarBtn.textContent = 'Reenviar código';
    } else {
      reenviarBtn.textContent = `Reenviar código (${segundosRestantes}s)`;
    }
  }, 1000);
}

reenviarBtn.addEventListener('click', async () => {
  if (!correoActual) return;

  reenviarBtn.disabled = true;
  try {
    await solicitarCodigo(correoActual);
    ocultarAlerta(codigoAlerta);
    iniciarEnfriamiento();
  } catch (error) {
    mostrarAlerta(codigoAlerta, error.message || 'No se pudo reenviar el código.');
    reenviarBtn.disabled = false;
  }
});