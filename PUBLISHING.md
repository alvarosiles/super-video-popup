# Cómo publicar Super Video Popup en la Chrome Web Store

Guía paso a paso para subir la extensión al [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

## 0. Generar el paquete

```bash
./scripts/3-build.sh
# → dist/super-video-popup-v1.0.0.zip
```

Vuelve a correrlo cada vez que cambies el código, antes de subir una nueva
versión.

## 1. Subir el paquete

Clic en **"+ Nuevo elemento"** → arrastra o selecciona
`dist/super-video-popup-v1.0.0.zip`.

## 2. Completar la ficha del Store

Todo el texto ya redactado (descripción corta, larga, categoría, idioma)
está en **[store-assets/store-listing.md](store-assets/store-listing.md)**
— copiar y pegar directo, no hace falta reescribirlo.

| Campo | Qué poner |
|---|---|
| Nombre | Super Video Popup |
| Descripción resumida (132 caracteres) | Ver `store-listing.md` § "Descripción corta" |
| Descripción detallada | Ver `store-listing.md` § "Descripción larga" |
| Categoría | Herramientas de productividad (Productivity) |
| Idioma | Español |
| Capturas de pantalla | `store-assets/screenshot-1-popup.png`, `screenshot-2-floating.png`, `screenshot-3-sizes.png` (1280×800 cada una) |
| Imagen promocional pequeña (440×280) | `store-assets/promo-small-440x280.png` |
| Imagen de marquesina (1400×560, opcional) | `store-assets/promo-marquee-1400x560.png` |
| Icono de la tienda (128×128) | `icons/icon128.png` |

## 3. Justificar permisos

Como el manifest pide `host_permissions: ["<all_urls>"]` y `scripting`, la
pestaña **"Privacidad"** del listing va a exigir varios campos. El texto
exacto para copiar y pegar en cada uno está en
**[store-assets/store-listing.md](store-assets/store-listing.md)** § "Justificación
de permisos", e incluye:

- Justificación de "Host permission usage" (`<all_urls>`).
- Justificación de "scripting".
- Declaración de "Single Purpose".
- Respuesta a "¿Usás código remoto?" → **No** (verificado por grep de
  `eval`, `new Function`, `fetch`, `<script src="http...` — no aparece
  ninguno en el código).
- Casillas de "Uso de datos" → ninguna marcada, la extensión no
  recolecta nada.
- **URL de política de privacidad**: `https://<tu-usuario>.github.io/super-video-popup/privacy.html`
  (ver paso 3.1 abajo para publicarla).

### 3.1 Publicar la política de privacidad (GitHub Pages)

Ya están generadas en `docs/`:
- `docs/privacy.html` — política de privacidad standalone.
- `docs/index.html` — landing del proyecto, con botón a la política.

Para servirlas:
1. Sube/commitea la carpeta `docs/` al repo (rama `main` o `dev`, según cuál publiques).
2. En GitHub → **Settings → Pages → Source** → elige la rama y la carpeta `/docs`.
3. Espera 1-2 minutos y confirma que `https://<tu-usuario>.github.io/super-video-popup/privacy.html` carga sin necesitar login.
4. Pega esa URL en el campo "Privacy policy URL" del Dashboard.

## 3.2 Guía paso a paso en el Dashboard

1. **Subir el paquete**: `./scripts/3-build.ps1` (o `3-build.sh`) → arrastra
   el `.zip` de `dist/` en "+ Nuevo elemento".
2. **Ficha de Play Store**: pega los textos de `store-listing.md`, sube las
   3 capturas + las 2 imágenes promocionales.
3. **Privacidad**: completa cada justificación con el texto de
   `store-listing.md`, marca "No" en código remoto, no marques ninguna
   casilla de uso de datos, y pega la URL de GitHub Pages del paso 3.1.
4. **Distribución**: gratis, público, todas las regiones (o las que
   prefieras) — sin restricciones especiales para esta extensión.
5. **Configuración → Correo electrónico de contacto**: verifícalo si aún
   no lo está (paso obligatorio, ver sección 4 abajo).
6. **Enviar a revisión**: al pedir `<all_urls>` + `scripting`, es normal
   que aparezca un aviso de que la revisión puede tardar más — es solo
   informativo, confirma el envío desde el mismo diálogo si el permiso
   sigue siendo necesario (lo es, para poder actuar sobre el video de
   cualquier sitio).

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
