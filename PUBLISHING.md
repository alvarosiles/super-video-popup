# Cómo publicar Float Video Pro en la Chrome Web Store

Guía paso a paso para subir la extensión al [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## 0. Generar el paquete

```bash
./scripts/3-build.sh
# → dist/float-video-pro-v1.0.0.zip
```

Vuelve a correrlo cada vez que cambies el código, antes de subir una nueva
versión.

## 1. Subir el paquete

Clic en **"+ Nuevo elemento"** → arrastra o selecciona
`dist/float-video-pro-v1.0.0.zip`.

## 2. Completar la ficha del Store

| Campo | Qué poner |
|---|---|
| Nombre | Float Video Pro |
| Descripción resumida (132 caracteres) | "Reproduce cualquier video en una ventana flotante siempre visible, con play/pausa, volumen y tamaño ajustable." |
| Descripción detallada | Puedes usar el bloque de "Características" del [README.md](README.md) |
| Categoría | Herramientas (Tools) |
| Idioma | Español |
| Capturas de pantalla (mín. 1, recomendado 3-5, 1280×800 o 640×400) | La ventana flotante en acción sobre un video real |
| Icono de la tienda (128×128) | `icons/icon128.png` |

## 3. Justificar permisos

Como el manifest pide `host_permissions: ["<all_urls>"]` y `scripting`, la
pestaña **"Privacidad"** del listing va a exigir:

- **Justificación de "Host permission usage"**: la extensión necesita
  inyectarse en cualquier sitio para detectar el `<video>` de esa página y
  poder moverlo a una ventana flotante, sin importar el dominio.
- **Justificación de "scripting"**: se usa `chrome.scripting.executeScript`
  para activar la ventana Picture-in-Picture en respuesta directa a un
  clic o atajo de teclado del usuario (es la única forma soportada por
  Chrome de preservar el gesto de usuario que la API exige).
- **Declaración de "Single Purpose"**: "mostrar el video de la pestaña
  activa en una ventana flotante que permanece encima de otras ventanas".
- **Política de privacidad**: igual que con `host_permissions` amplios en
  cualquier extensión, Google casi siempre la exige aunque no se
  recolecte ni transmita ningún dato — todo el procesamiento (mover el
  `<video>`, sus controles) ocurre localmente en la página.

## 4. Cuenta de desarrollador

- Cuota única de registro (~$5 USD), si es tu primera publicación.
- **Verificación en 2 pasos (2FA)** obligatoria en la cuenta de Google que
  publica. Si ves el error *"Ocurrió un problema al subir el archivo...
  es necesario que habilites la verificación en 2 pasos"*, actívala en
  [myaccount.google.com/security](https://myaccount.google.com/security)
  y reintenta. Es un paso único por cuenta.

## 5. Enviar a revisión

Botón **"Enviar para revisión"**. Al pedir `<all_urls>` y `scripting`,
puede tardar un poco más que extensiones con permisos más acotados.

## Actualizar una versión ya publicada

1. Sube la versión en `manifest.json` (ej. `1.0.0` → `1.0.1`).
2. `./scripts/3-build.sh` de nuevo.
3. En el Dashboard, entra al elemento publicado → **"Paquete"** → sube el
   nuevo `.zip` → enviar a revisión otra vez.
