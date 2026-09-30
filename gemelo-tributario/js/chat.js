/* ============================================================
   Chat — Gemelo Tributario
   Conectado a Gemelo Chat con IA (backend + Claude).
   API_URL ya viene declarada por main.js (que se carga antes en chat.html).
   ============================================================ */

const idUsuario = localStorage.getItem('gt_id_usuario');
if (!idUsuario) {
  window.location.href = 'Login.html';
}

const REGIMEN_LABEL = {
  RIMPE_NEGOCIO_POPULAR: 'RIMPE – Negocio Popular',
  RIMPE_EMPRENDEDOR: 'RIMPE – Emprendedor',
  GENERAL: 'Régimen General'
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const messages = document.getElementById('chat-messages');

  document.querySelectorAll('.suggestion-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      enviarMensaje(chip.textContent.trim(), messages);
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const texto = input.value.trim();
    if (!texto) return;
    enviarMensaje(texto, messages);
    input.value = '';
  });

  initFormularioSoporte();
  cargarSidebarReal();
  cargarUsuarioReal();
  cargarNotificaciones();

  const btnCerrarSesion = document.getElementById('cerrar-sesion');
  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', () => {
      localStorage.removeItem('gt_id_usuario');
    });
  }
});

/* ------------------------------------------------------------
   Foto y nombre reales del usuario en la barra superior
   (mismo patrón que usa dashboard.js).
   ------------------------------------------------------------ */
async function cargarUsuarioReal() {
  try {
    const res = await fetch(`${API_URL}/usuarios/${idUsuario}`);
    if (!res.ok) return;
    const usuario = await res.json();

    const nombreEl = document.getElementById('topbar-nombre');
    if (nombreEl) nombreEl.textContent = usuario.primerNombre || 'Usuario';

    const avatarEl = document.getElementById('topbar-avatar');
    if (avatarEl) {
      if (usuario.fotoUrl) {
        avatarEl.innerHTML = `<img src="http://localhost:8080${usuario.fotoUrl}" alt="Foto de perfil" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      } else {
        const iniciales = (usuario.primerNombre?.[0] || '') + (usuario.apellidoPaterno?.[0] || '');
        avatarEl.textContent = iniciales.toUpperCase() || 'GT';
      }
    }
  } catch (e) {
    /* si falla, se queda en "—" en vez de mostrar un dato falso */
  }
}

/* ------------------------------------------------------------
   Régimen y RUC reales en el sidebar (reemplaza los valores
   quemados que traía el diseño original).
   ------------------------------------------------------------ */
async function cargarSidebarReal() {
  try {
    const res = await fetch(`${API_URL}/perfiles-tributarios/usuario/${idUsuario}`);
    if (!res.ok) return;
    const perfil = await res.json();

    const regimenEl = document.getElementById('sidebar-regimen');
    if (regimenEl) regimenEl.textContent = REGIMEN_LABEL[perfil.regimen] || perfil.regimen;

    const rucEl = document.getElementById('sidebar-ruc');
    if (rucEl) rucEl.textContent = `RUC: ${perfil.rucCedula || '—'}`;
  } catch (e) {
    /* si falla, el sidebar se queda en "—" en vez de mostrar un dato falso */
  }
}

/* ------------------------------------------------------------
   Notificaciones reales (contador + lista del dropdown)
   ------------------------------------------------------------ */
async function cargarNotificaciones() {
  const contador = document.getElementById('notif-count');
  const lista = document.getElementById('notif-lista');
  if (!contador || !lista) return;

  try {
    const res = await fetch(`${API_URL}/notificaciones/usuario/${idUsuario}`);
    if (!res.ok) return;
    const notificaciones = await res.json();

    contador.textContent = notificaciones.filter((n) => !n.leida).length;

    lista.innerHTML = '';
    if (notificaciones.length === 0) {
      lista.innerHTML = '<div class="notif-item"><span>No tienes notificaciones por ahora.</span></div>';
      return;
    }
    notificaciones.slice(0, 5).forEach((n) => {
      const item = document.createElement('div');
      item.className = 'notif-item';
      item.innerHTML = `<strong>${n.titulo}</strong><span>${n.mensaje}</span>`;
      lista.appendChild(item);
    });
  } catch (e) {
    /* deja el contador en 0 en vez de un número inventado */
  }
}

async function enviarMensaje(texto, messages) {
  agregarMensajeUsuario(texto, messages);
  mostrarEscribiendo(messages);

  try {
    const res = await fetch(`${API_URL}/chat/mensaje/usuario/${idUsuario}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pregunta: texto })
    });

    const data = await res.json().catch(() => null);
    quitarEscribiendo(messages);

    if (!res.ok) {
      agregarMensajeBot(data?.mensaje || 'No pude conectarme con Gemelo ahora mismo. Intenta de nuevo en un momento.', messages);
      return;
    }

    agregarMensajeBot(data.respuesta, messages);
  } catch (err) {
    quitarEscribiendo(messages);
    agregarMensajeBot('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.', messages);
  }
}

function agregarMensajeUsuario(texto, messages) {
  const div = document.createElement('div');
  div.className = 'msg msg-user';
  div.textContent = texto;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function agregarMensajeBot(texto, messages) {
  const div = document.createElement('div');
  div.className = 'msg msg-bot';
  const p = document.createElement('p');
  p.textContent = texto;
  div.appendChild(p);
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function mostrarEscribiendo(messages) {
  const div = document.createElement('div');
  div.className = 'msg-typing';
  div.id = 'typing-indicator';
  div.innerHTML = '<span></span><span></span><span></span>';
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function quitarEscribiendo(messages) {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

/* ============================================================
   Formulario de soporte (tarjeta "¿Necesitas hablar con una persona?")
   ============================================================ */
function initFormularioSoporte() {
  const form = document.getElementById('form-soporte');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mensajeEl = document.getElementById('soporte-mensaje');
    const mensaje = mensajeEl.value.trim();
    if (!mensaje) {
      mensajeEl.focus();
      return;
    }

    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;

    try {
      const res = await fetch(`${API_URL}/soporte/usuario/${idUsuario}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje })
      });
      if (!res.ok) throw new Error('fallo');
      mensajeEl.value = '';
      if (typeof showToast === 'function') showToast('Tu mensaje fue enviado al equipo de soporte.');
      else alert('Tu mensaje fue enviado al equipo de soporte.');
    } catch (err) {
      if (typeof showToast === 'function') showToast('No se pudo enviar el mensaje. Intenta de nuevo.');
      else alert('No se pudo enviar el mensaje. Intenta de nuevo.');
    } finally {
      boton.disabled = false;
    }
  });
}