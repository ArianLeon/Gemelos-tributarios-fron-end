# Gemelo Tributario — Prototipo Web

Prototipo web **no funcional a nivel de backend** (sin base de datos) del
emprendimiento académico *Gemelo Tributario*. Construido en HTML, CSS y
JavaScript puros, con lógica de cálculo real en el navegador para simular
las funciones principales de la app.

## Cómo abrirlo

1. Descomprime la carpeta.
2. Haz doble clic en `index.html` (o ábrelo con clic derecho → Abrir con →
   tu navegador). No necesita servidor ni instalación.
3. Desde la landing, entra a la demo (`dashboard.html`) y navega con el
   menú lateral (o el menú inferior en móvil).

## Estructura de carpetas

```
gemelo-tributario/
├── index.html            → Landing / bienvenida
├── dashboard.html         → Inicio (accesos rápidos)
├── calculadora.html       → Calculadora de IVA, Renta y Retenciones
├── recordatorios.html     → Fechas clave (Próximos / Historial)
├── aprender.html          → Videos y preguntas frecuentes
├── chat.html               → Chat con "Gemelo Tributario"
├── perfil.html             → Datos de usuario y preferencias
├── css/
│   └── styles.css          → Todo el diseño (sin estilos inline)
└── js/
    ├── main.js              → Utilidades compartidas (toast, localStorage)
    ├── calculadora.js       → Fórmulas de IVA / Renta / Retenciones
    ├── chat.js               → Motor de respuestas por palabra clave
    ├── recordatorios.js     → Tabs y estado "agregado al calendario"
    ├── aprender.js           → Filtro por categoría y acordeón de FAQ
    └── perfil.js             → Formulario de perfil y toggles
```

## Qué es interactivo (sin backend)

- **Calculadora**: hace los cálculos reales de IVA (15%), Impuesto a la
  Renta (tabla progresiva referencial) y Retenciones en la fuente, todo
  en el navegador con JavaScript.
- **Chat**: responde preguntas frecuentes por coincidencia de palabras
  clave (IVA, RIMPE, renta, retenciones, multas, facturación, etc.).
- **Recordatorios**: tabs funcionales y botón "Agregar a mi calendario"
  que cambia de estado (guardado en `localStorage` del navegador).
- **Aprender**: filtro por categoría y acordeón de preguntas frecuentes.
- **Perfil**: formulario editable que guarda tus datos en `localStorage`.

Todo el "guardado" es local en tu navegador — no hay servidor ni base de
datos real, tal como se pidió para este prototipo.

## Notas de diseño

- Paleta navy + naranja (misma línea de marca usada en las diapositivas
  del proyecto).
- Elemento distintivo: las etiquetas `§ Art. ...` (`.norm-tag`) que
  acompañan resultados y respuestas, para reforzar el enfoque de
  **cumplimiento legal** del proyecto (a diferencia de un enfoque
  puramente contable).
- Todo el diseño vive en `css/styles.css`; no hay estilos inline ni
  JavaScript embebido en los `.html`.

## Disclaimer

Los porcentajes, tramos y fechas son **valores referenciales** con fines
de demostración académica. No reemplazan la normativa vigente del SRI ni
la asesoría de un profesional.
