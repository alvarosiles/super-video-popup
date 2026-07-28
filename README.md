# 🖼️ Super Video Popup
<!-- https://alvarosiles.github.io/super-video-popup/privacy.html -->
> Super Video Popup is a Chrome extension that allows users to watch videos
> in a floating popup window while browsing other websites. Built with
> Manifest V3 and modern Web APIs.

Extensión para **Chrome / Edge** (Manifest V3) que reproduce
cualquier video HTML5 en una **ventana flotante** que se mantiene encima de
las demás ventanas — sigues viendo el video mientras trabajas en otra
pestaña, otra app, o incluso otro monitor.

Usa la Picture-in-Picture **nativa** del navegador
(`video.requestPictureInPicture()`), la API pública y estándar que
implementan Chrome/Edge/Chromium. Se eligió a propósito en vez de la
Document Picture-in-Picture API: esa otra API permite dibujar controles
propios, pero el navegador le agrega siempre una barra de título con el
dominio del sitio que no se puede ocultar ni personalizar. La PiP nativa
clásica, en cambio, es una ventana mínima sin esa barra — solo el video
con los controles propios del navegador (play/pausa/mute) apareciendo al
pasar el mouse.

- **Autor:** [alvarosiles](https://github.com/alvarosiles)
- **Contacto:** alvarosiles.developer@gmail.com

---

## Índice

1. [Características](#características)
2. [Estructura del proyecto](#estructura-del-proyecto)
3. [Cómo funciona (arquitectura)](#cómo-funciona-arquitectura)
4. [Instalación en modo desarrollador](#instalación-en-modo-desarrollador)
5. [Publicar en la Chrome Web Store](#publicar-en-la-chrome-web-store) — guía completa en [PUBLISHING.md](PUBLISHING.md)
6. [Atajos de teclado](#atajos-de-teclado)
7. [Personalización](#personalización)
8. [Permisos utilizados](#permisos-utilizados)
9. [Compatibilidad](#compatibilidad)
10. [Limitaciones conocidas](#limitaciones-conocidas)

---

## Características

- **Un solo clic en el icono de la extensión activa el Picture-in-Picture**
  si la pestaña tiene un video — no hace falta abrir el popup y pulsar un
  botón aparte.
- Ventana flotante mínima que permanece **encima de todas las ventanas**,
  incluso fuera del navegador, sin barra de título ni distracciones: solo
  el video.
- Detecta automáticamente el `<video>` de la página, incluido en sitios
  SPA que lo montan dinámicamente.
- Si hay varios videos en la página, elige el que se está reproduciendo (o
  el más grande visualmente si ninguno está en play).
- Atajos de teclado globales para activar y cerrar la ventana flotante.
- El video **no se mueve del DOM de la página**: la PiP nativa solo lo
  "espeja" en la ventana flotante, así que no hay nada que restaurar al
  cerrarla.
- Tema oscuro en el popup de la extensión, sin dependencias externas, sin
  llamadas de red.

---

## Estructura del proyecto

```
super-video-popup/
├── manifest.json        # Configuración Manifest V3
├── background.js        # Service worker: atajos de teclado
├── content.js            # Detecta <video> y responde consultas de estado
├── pip.js                  # Construye y controla la ventana flotante
├── popup.html            # Interfaz del popup
├── popup.css              # Estilos (tema oscuro, acento violeta)
├── popup.js                # Lógica del popup
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── gen_icons.py           # Regenera los iconos
├── scripts/
│   ├── 1-install.sh       # Abre chrome://extensions en tu Chrome real
│   ├── 2-test-extension.sh # Abre Chrome con la extensión ya cargada
│   └── 3-build.sh         # Empaqueta la extensión en dist/*.zip
└── README.md
```

---

## Cómo funciona (arquitectura)

El punto más delicado de esta extensión no es técnico en el sentido
habitual, sino de **permisos del navegador**: abrir cualquier ventana
nueva (incluida una Picture-in-Picture) exige que el navegador detecte un
**gesto de usuario reciente** ("activación transitoria") sobre el
documento que la pide. Un mensaje asíncrono de `chrome.runtime.sendMessage`
normal *no* cuenta como gesto de usuario a ojos de la página. Por eso el
flujo es:

```
Clic en el icono de la extensión / atajo de teclado
        │
        ▼
chrome.scripting.executeScript(...)   ← llamada SÍNCRONA, en el mismo
        │                                manejador del clic/atajo
        ▼
window.FVP_PiP.open()  (pip.js, ya inyectado en la pestaña)
        │
        ▼
video.requestPictureInPicture()  ← se acepta porque el gesto
        │                          todavía está "fresco"
        ▼
Ventana flotante nativa del navegador (sin barra de título)
```

- **`content.js`** vive en la pestaña (se inyecta en todas las páginas) y
  se encarga de detectar `<video>` y de responder mensajes que **no**
  requieren gesto (consultar estado, cerrar).
- **`pip.js`** (mismo mundo aislado que `content.js`, expone
  `window.FVP_PiP`) llama a `video.requestPictureInPicture()` sobre el
  video elegido. Como esta API no saca el `<video>` del DOM de la página
  (solo lo "espeja" en la ventana flotante), no hace falta guardar ni
  restaurar su posición original.
- **`popup.js`** activa el PiP en cuanto el popup termina de abrirse
  (mismo gesto que el clic en el icono de la extensión) y **`background.js`**
  hace lo mismo desde `chrome.commands.onCommand` para el atajo de teclado.
  Ambos usan `chrome.scripting.executeScript` llamado de forma síncrona —
  la única forma soportada de preservar el gesto de usuario hasta `pip.js`.

---

## Instalación en modo desarrollador

### Opción A — manual

1. Abre `chrome://extensions` (`edge://extensions`).
2. Activa **Modo desarrollador**.
3. **Cargar descomprimida** → selecciona esta carpeta.

### Opción B — con los scripts de `scripts/`

```bash
./scripts/1-install.sh        # Abre chrome://extensions en TU Chrome real
./scripts/2-test-extension.sh # Abre Chrome con la extensión YA cargada
                               # en un perfil de pruebas aislado, más una
                               # URL de video lista para probar.
./scripts/3-build.sh          # Genera dist/super-video-popup-v<version>.zip
```

---

## Publicar en la Chrome Web Store

Guía completa en **[PUBLISHING.md](PUBLISHING.md)**. Resumen rápido:

```bash
./scripts/3-build.sh
# → dist/super-video-popup-v1.0.0.zip
```

Sube ese `.zip` en el
[Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## Atajos de teclado

| Acción | Atajo por defecto |
|---|---|
| Activar/cerrar Picture-in-Picture | `Ctrl+Shift+P` |
| Cerrar la ventana flotante | `Ctrl+Shift+C` |

`Ctrl+Shift+C` es también el atajo nativo de Chrome para "Inspeccionar
elemento" (DevTools), y Chrome no permite que una extensión lo sobrescriba
por defecto — es posible que este atajo no quede asignado automáticamente.
Si no responde, ve a `chrome://extensions/shortcuts` y asígnalo a mano (o
elige otra combinación, como `Ctrl+Shift+X`).

---

## Personalización

- **Colores**: variables CSS al inicio de [`popup.css`](popup.css)
  (`--accent`, `--bg`, `--card`...). La ventana flotante en sí no tiene
  estilos propios: es la PiP nativa del navegador, que no se puede
  personalizar visualmente desde la extensión.
- **Iconos**: reemplaza los archivos en `icons/` (mismos nombres/tamaños),
  o edita y vuelve a correr `python3 gen_icons.py`.
- **Atajos de teclado**: sección `"commands"` de `manifest.json`.

---

## Permisos utilizados

| Permiso | Para qué se usa |
|---|---|
| `activeTab` | Identificar la pestaña activa al abrir el popup / usar un atajo. |
| `scripting` | `chrome.scripting.executeScript`, necesario para activar el PiP preservando el gesto de usuario. |
| `host_permissions: <all_urls>` | Inyectar `content.js`/`pip.js` en cualquier sitio para poder detectar y flotar su video, no solo una lista fija. |

No se usa `tabCapture` ni se envían datos a ningún servidor.

---

## Compatibilidad

- Cualquier Chrome / Edge con soporte de la Picture-in-Picture API clásica
  (`video.requestPictureInPicture()`), disponible desde hace varias
  versiones — no requiere Document Picture-in-Picture ni una versión tan
  reciente como esa API.

## Limitaciones conocidas

- Solo apunta a elementos `<video>` (la Picture-in-Picture es un concepto
  de video; un `<audio>` no tiene nada que "flotar" visualmente).
- El tamaño y la posición de la ventana flotante los decide el navegador,
  no la extensión: no hay presets de tamaño ni controles propios
  (play/pausa, barra de progreso) dentro de la ventana — solo los que el
  navegador dibuja por su cuenta.
- Un video con contenido de otro origen sin cabeceras CORS puede impedir
  algunas operaciones del navegador sobre el elemento; en ese caso,
  Super Video Popup sigue pudiendo activar la Picture-in-Picture (no se
  necesita `createMediaElementSource` como en un extractor de audio), así
  que este caso es poco frecuente.
