# Ficha de Chrome Web Store — Super Video Popup

## Datos básicos

| Campo | Valor |
|---|---|
| Nombre | Super Video Popup |
| Categoría | Herramientas de productividad (Productivity) |
| Idioma principal | Español |
| Sitio web / Homepage | https://github.com/alvarosiles/super-video-popup |
| Email de soporte | alvarosiles.developer@gmail.com |

## Descripción de un solo propósito (máx. 1000 caracteres)

```
Super Video Popup muestra el video de la pestaña activa en una ventana
flotante que permanece siempre encima de las demás ventanas, para poder
seguir viéndolo mientras navegas por otro sitio, usas otra aplicación o
cambias de monitor. Ese es su único propósito: no hace nada más.
```
(272 caracteres)

## Descripción corta / resumida (máx. 132 caracteres, para el listado)

Copiar como una sola línea (el campo del Dashboard no admite saltos de línea):

```
Reproduce cualquier video en una ventana flotante siempre visible, con play/pausa, volumen y tamaño ajustable (S/M/L).
```
(118 caracteres)

## Descripción larga

```
Super Video Popup convierte cualquier video HTML5 de la página que estés
viendo en una ventana flotante que se queda por encima de todo — el
navegador, otras apps, incluso otro monitor — mientras sigues trabajando
o navegando.

A diferencia de la Picture-in-Picture nativa del navegador (un simple
rectángulo de video sin más controles), Super Video Popup usa la Document
Picture-in-Picture API para dibujar su propia interfaz dentro de la
ventana flotante:

★ UN SOLO CLIC
Haz clic en el icono de la extensión y, si la pestaña tiene un video, la
ventana flotante se abre al instante en tamaño mediano. No hace falta un
segundo clic.

★ CONTROLES PROPIOS
Play/pausa, volumen, silenciar, y tres tamaños (S/M/L) que puedes cambiar
en cualquier momento sin cerrar la ventana.

★ DETECCIÓN AUTOMÁTICA
Encuentra el <video> de la página aunque se cargue después, como en sitios
que montan el reproductor dinámicamente. Si hay varios videos, elige el
que se está reproduciendo o, si ninguno lo está, el más grande visualmente.

★ ATAJOS DE TECLADO
Ctrl+Shift+P para activar el Picture-in-Picture, Ctrl+Shift+C para
cerrarlo, sin tocar el mouse.

★ EL VIDEO VUELVE A SU LUGAR
Al cerrar la ventana flotante, el video regresa exactamente a donde
estaba en la página original — mismo contenedor, misma posición.

★ FUNCIONA EN CASI CUALQUIER SITIO
Sin lista fija de sitios compatibles: se activa sobre cualquier página
con un elemento <video>.

★ SIN RASTREO, SIN RED
No envía datos a ningún servidor, no usa analítica, no descarga código
remoto. Todo el procesamiento ocurre localmente en tu navegador.

★ FUNCIONA AUNQUE TU NAVEGADOR NO TENGA DOCUMENT PIP
Si el navegador no soporta la Document Picture-in-Picture API, la
extensión hace fallback automático a la Picture-in-Picture nativa clásica
(sin los controles propios, pero sigue funcionando).

REQUISITOS
Chrome o Edge 116 o superior.
```

## Justificación de permisos (pestaña Privacidad del Dashboard)

| Permiso | Justificación |
|---|---|
| `activeTab` | Necesario para identificar la pestaña que el usuario tiene activa en el momento en que abre el popup o usa un atajo de teclado, y así poder detectar si esa pestaña tiene un video reproducible. No se usa para nada fuera de ese momento puntual. |
| `scripting` | Se usa `chrome.scripting.executeScript` para invocar `documentPictureInPicture.requestWindow()` en respuesta directa e inmediata a un clic del usuario o a un atajo de teclado. Es la única forma soportada por Chrome de preservar el "gesto de usuario" que esa API exige; sin este permiso la ventana flotante no podría abrirse. |
| `host_permissions: <all_urls>` | La extensión debe poder inyectar su script de detección de video (`content.js`/`pip.js`) en cualquier sitio, ya que su propósito es funcionar sobre cualquier página con un `<video>`, no sobre una lista fija de dominios predeterminados. |

Declaración de propósito único a pegar en el campo correspondiente:
```
Mostrar el video de la pestaña activa del usuario en una ventana
flotante que permanece encima de otras ventanas, con controles propios
de reproducción.
```

## ¿Usás código remoto?

**Respuesta: No.**

Verificado por inspección de código (no solo por criterio): no hay
`eval(`, `new Function(`, `<script src="http...` ni `fetch`/`XMLHttpRequest`
en ningún archivo del paquete (`background.js`, `content.js`, `pip.js`,
`popup.js`). Todo el JavaScript que se ejecuta viene empaquetado dentro
de la extensión; no se descarga ni ejecuta código desde un servidor
externo.

## Casillas de "Uso de datos" (Data usage)

La extensión **no recolecta ningún dato**. No usa `chrome.storage`, no
hace peticiones de red, no tiene analítica ni telemetría. En el
formulario de Chrome Web Store:

- [ ] Información personal identificable — NO marcar (no se recolecta)
- [ ] Datos de salud — NO marcar
- [ ] Información financiera y de pago — NO marcar
- [ ] Información de autenticación — NO marcar
- [ ] Comunicaciones personales — NO marcar
- [ ] Ubicación — NO marcar
- [ ] Historial web — NO marcar
- [ ] Actividad del usuario — NO marcar
- [ ] Identificadores de sitio web — NO marcar

Marcar explícitamente: **"Esta extensión no recolecta ni usa datos del
usuario"** (declaración de certificación que pide el Dashboard).

## Capturas y promocionales generados

- `screenshot-1-popup.png` (1280×800) — popup abierto sobre una página con video.
- `screenshot-2-floating.png` (1280×800) — ventana flotante encima de otra app/documento.
- `screenshot-3-sizes.png` (1280×800) — los tres tamaños S/M/L.
- `promo-small-440x280.png` — imagen promocional pequeña.
- `promo-marquee-1400x560.png` — imagen de marquesina.
