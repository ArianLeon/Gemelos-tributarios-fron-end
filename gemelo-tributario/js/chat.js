/* ============================================================
   Chat — Gemelo Tributario
   Motor de respuestas por coincidencia de palabras clave.
   En la versión completa este panel se conecta a un asistente
   con IA; aquí se simula con una base de respuestas fija para
   fines de demostración del prototipo.
   ============================================================ */

const BASE_RESPUESTAS = [
  {
    claves: ['iva', 'declarar iva', 'cuando declaro'],
    respuesta: 'Debes declarar el IVA mensualmente si estás obligado a llevar contabilidad, o si tus ingresos anuales superan los $300.000. La fecha límite depende del noveno dígito de tu RUC.',
    norma: 'Art. 67 LRTI'
  },
  {
    claves: ['rimpe'],
    respuesta: 'El RIMPE es el Régimen Simplificado para Emprendedores y Negocios Populares. Es un régimen opcional pensado para formalizar y facilitar el cumplimiento tributario de negocios pequeños y medianos.',
    norma: 'Res. NAC-DGERCGC22-00000024'
  },
  {
    claves: ['renta', 'impuesto a la renta'],
    respuesta: 'El Impuesto a la Renta se calcula sobre tu base imponible anual (ingresos menos gastos deducibles) aplicando una tabla progresiva por tramos. Puedes simularlo en la sección Calculadora.',
    norma: 'Art. 36 LRTI'
  },
  {
    claves: ['retencion', 'retenciones'],
    respuesta: 'Las retenciones en la fuente son anticipos del impuesto que el comprador retiene al proveedor. El porcentaje varía según el tipo de bien o servicio (por ejemplo 1.75% en bienes, 10% en honorarios profesionales).',
    norma: 'Res. NAC-DGERCGC vigente'
  },
  {
    claves: ['multa', 'sancion', 'atraso', 'retraso'],
    respuesta: 'Declarar o pagar fuera de plazo genera un interés por mora más una multa que se calcula como porcentaje del impuesto causado, incluso si el valor a pagar es cero.',
    norma: 'Art. 100 LRTI'
  },
  {
    claves: ['factura', 'facturacion', 'facturar'],
    respuesta: 'Toda transferencia de bienes o prestación de servicios debe respaldarse con un comprobante de venta autorizado por el SRI, actualmente mediante facturación electrónica.',
    norma: 'Reglamento de Comprobantes de Venta'
  },
  {
    claves: ['fecha limite', 'plazo', 'noveno digito'],
    respuesta: 'Los plazos de declaración se organizan según el noveno dígito de tu RUC. Puedes revisar tus próximas fechas clave en la sección Recordatorios.',
    norma: 'Reglamento LRTI, Art. 158'
  },
  {
    claves: ['contador', 'contable', 'diferencia'],
    respuesta: 'Un contador ajusta y organiza tus cuentas financieras. Gemelo Tributario se enfoca en el cumplimiento legal: te guía según la normativa tributaria vigente para que tomes decisiones informadas, sin reemplazar la contabilidad de tu negocio.',
    norma: 'Enfoque Gemelo Tributario'
  }
];

const RESPUESTA_DEFECTO = {
  respuesta: 'Todavía no tengo una respuesta preparada para eso en esta demostración. En la sección Aprender encontrarás guías y preguntas frecuentes sobre IVA, Renta, RIMPE y facturación.',
  norma: null
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
});

function enviarMensaje(texto, messages) {
  agregarMensajeUsuario(texto, messages);
  mostrarEscribiendo(messages);
  const delay = 600 + Math.random() * 500;
  setTimeout(() => {
    quitarEscribiendo(messages);
    const match = buscarRespuesta(texto);
    agregarMensajeBot(match, messages);
  }, delay);
}

function agregarMensajeUsuario(texto, messages) {
  const div = document.createElement('div');
  div.className = 'msg msg-user';
  div.textContent = texto;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}

function agregarMensajeBot(match, messages) {
  const div = document.createElement('div');
  div.className = 'msg msg-bot';
  div.innerHTML = '<p>' + match.respuesta + '</p>' +
    (match.norma ? '<span class="norm-tag light">' + match.norma + '</span>' : '');
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

function buscarRespuesta(texto) {
  const t = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  for (const entrada of BASE_RESPUESTAS) {
    if (entrada.claves.some((clave) => t.includes(clave))) {
      return entrada;
    }
  }
  return RESPUESTA_DEFECTO;
}
