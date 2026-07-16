/**
 * pip.js — Super Video Popup
 * ─────────────────────────────────────────────────────────────────────────
 * Construye y controla la ventana flotante "Picture-in-Picture" usando la
 * Document Picture-in-Picture API (documentPictureInPicture.requestWindow),
 * disponible en Chrome/Edge 116+. A diferencia de la PiP nativa clásica
 * (video.requestPictureInPicture, solo un rectángulo de video sin más),
 * esta API nos deja renderizar HTML propio dentro de la ventana flotante:
 * por eso podemos ofrecer play/pausa, volumen, silenciar y tamaño.
 *
 * Si el navegador no soporta Document PiP, se hace un fallback automático
 * a la PiP nativa clásica (sin controles propios, pero funcional).
 *
 * Nota importante sobre el gesto de usuario: abrir una ventana (de
 * cualquier tipo, incluida PiP) exige "activación transitoria" del
 * documento que la pide. Por eso `open()`/`toggle()` solo deben invocarse
 * como consecuencia DIRECTA de un clic real (ver popup.js, que usa
 * chrome.scripting.executeScript de forma síncrona en el propio manejador
 * del clic, y background.js, que hace lo mismo dentro de
 * chrome.commands.onCommand). Cerrar o redimensionar una ventana que ya
 * está abierta NO requiere gesto, así que esas funciones sí se pueden
 * llamar libremente desde mensajes async (ver content.js).
 */

(() => {
  'use strict';

  if (window.FVP_PiP) return; // ya inicializado en este documento

  const SIZE_PRESETS = {
    S: { width: 300, height: 170 },
    M: { width: 440, height: 250 },
    L: { width: 640, height: 360 },
  };
  const DEFAULT_SIZE = 'M';

  const state = {
    pipWindow: null,
    video: null,
    originalParent: null,
    originalNextSibling: null,
    originalStyleCssText: '',
    currentSize: DEFAULT_SIZE,
  };

  function supportsDocumentPiP() {
    return 'documentPictureInPicture' in window;
  }

  function isOpen() {
    return state.pipWindow !== null;
  }

  /** Devuelve el <video> al lugar exacto de donde lo sacamos. */
  function restoreVideo() {
    const { video, originalParent, originalNextSibling } = state;
    if (video && originalParent) {
      video.style.cssText = state.originalStyleCssText;
      if (originalNextSibling && originalNextSibling.parentNode === originalParent) {
        originalParent.insertBefore(video, originalNextSibling);
      } else {
        originalParent.appendChild(video);
      }
    }
    state.pipWindow = null;
    state.video = null;
    state.originalParent = null;
    state.originalNextSibling = null;
    state.originalStyleCssText = '';
  }

  function injectStyles(doc) {
    const style = doc.createElement('style');
    style.textContent = `
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      html, body {
        margin: 0; padding: 0; width: 100%; height: 100%;
        background: #16171a; overflow: hidden;
        font-family: 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      }
      .fvp-container {
        display: flex; flex-direction: column; width: 100%; height: 100%;
      }
      .fvp-video-slot {
        flex: 1; min-height: 0; display: flex; align-items: center;
        justify-content: center; background: #000; overflow: hidden;
      }
      .fvp-video-slot video {
        width: 100%; height: 100%; object-fit: contain; background: #000;
      }
      .fvp-controls {
        display: flex; align-items: center; gap: 8px; padding: 8px 10px;
        background: #202124; border-top: 1px solid #333;
      }
      .fvp-btn {
        display: inline-flex; align-items: center; justify-content: center;
        width: 30px; height: 30px; border: none; border-radius: 8px;
        background: #2d2f33; color: #fff; cursor: pointer;
        transition: background 150ms ease, transform 150ms ease;
      }
      .fvp-btn:hover { background: #3a3d42; }
      .fvp-btn:active { transform: scale(0.92); }
      .fvp-btn svg { width: 16px; height: 16px; fill: currentColor; }
      .fvp-volume {
        flex: 1; height: 4px; accent-color: #7C5CFC; cursor: pointer;
      }
      .fvp-sizes { display: flex; gap: 4px; margin-left: 4px; }
      .fvp-size-btn {
        width: 24px; height: 24px; font-size: 11px; font-weight: 700;
        border: 1px solid #3c4043; border-radius: 6px; background: #2d2f33;
        color: #9aa0a6; cursor: pointer; transition: all 150ms ease;
      }
      .fvp-size-btn.active { background: #7C5CFC; color: #fff; border-color: #7C5CFC; }
      .fvp-close { margin-left: 4px; }
      .fvp-close:hover { background: #d93025; }
    `;
    doc.head.appendChild(style);
  }

  const ICONS = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>',
    volume: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3z"/></svg>',
    muted: '<svg viewBox="0 0 24 24"><path d="M16.5 12l2.5 2.5V9.5zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25L18 16.27 4.27 3z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
  };

  function buildUI(doc) {
    const container = doc.createElement('div');
    container.className = 'fvp-container';

    const videoSlot = doc.createElement('div');
    videoSlot.className = 'fvp-video-slot';

    const controls = doc.createElement('div');
    controls.className = 'fvp-controls';

    const playPauseBtn = doc.createElement('button');
    playPauseBtn.className = 'fvp-btn';
    playPauseBtn.innerHTML = ICONS.pause;
    playPauseBtn.title = 'Play/Pausa';

    const muteBtn = doc.createElement('button');
    muteBtn.className = 'fvp-btn';
    muteBtn.innerHTML = ICONS.volume;
    muteBtn.title = 'Silenciar';

    const volumeSlider = doc.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = '0';
    volumeSlider.max = '100';
    volumeSlider.className = 'fvp-volume';
    volumeSlider.title = 'Volumen';

    const sizes = doc.createElement('div');
    sizes.className = 'fvp-sizes';
    const sizeButtons = {};
    for (const key of Object.keys(SIZE_PRESETS)) {
      const btn = doc.createElement('button');
      btn.className = 'fvp-size-btn';
      btn.textContent = key;
      btn.title = `Tamaño ${key}`;
      sizes.appendChild(btn);
      sizeButtons[key] = btn;
    }

    const closeBtn = doc.createElement('button');
    closeBtn.className = 'fvp-btn fvp-close';
    closeBtn.innerHTML = ICONS.close;
    closeBtn.title = 'Cerrar';

    controls.append(playPauseBtn, muteBtn, volumeSlider, sizes, closeBtn);
    container.append(videoSlot, controls);
    doc.body.appendChild(container);

    return { container, videoSlot, playPauseBtn, muteBtn, volumeSlider, sizeButtons, closeBtn };
  }

  function wireControls(ui, video, pipWindow) {
    function syncPlayPause() {
      ui.playPauseBtn.innerHTML = video.paused ? ICONS.play : ICONS.pause;
    }
    function syncVolume() {
      ui.muteBtn.innerHTML = video.muted || video.volume === 0 ? ICONS.muted : ICONS.volume;
      ui.volumeSlider.value = String(Math.round((video.muted ? 0 : video.volume) * 100));
    }
    function syncSizeButtons() {
      for (const [key, btn] of Object.entries(ui.sizeButtons)) {
        btn.classList.toggle('active', key === state.currentSize);
      }
    }

    video.addEventListener('play', syncPlayPause);
    video.addEventListener('pause', syncPlayPause);
    video.addEventListener('volumechange', syncVolume);

    ui.playPauseBtn.addEventListener('click', () => {
      if (video.paused) video.play().catch(() => {});
      else video.pause();
    });

    ui.muteBtn.addEventListener('click', () => {
      video.muted = !video.muted;
    });

    ui.volumeSlider.addEventListener('input', () => {
      const value = Number(ui.volumeSlider.value) / 100;
      video.volume = value;
      video.muted = value === 0;
    });

    for (const [key, btn] of Object.entries(ui.sizeButtons)) {
      btn.addEventListener('click', () => resize(key));
    }

    ui.closeBtn.addEventListener('click', () => pipWindow.close());

    syncPlayPause();
    syncVolume();
    syncSizeButtons();

    return { syncSizeButtons };
  }

  let syncSizeButtonsRef = null;

  /** Cambia el tamaño de la ventana flotante ya abierta a un preset S/M/L. */
  function resize(size) {
    const preset = SIZE_PRESETS[size];
    if (!preset || !state.pipWindow) return;
    state.currentSize = size;
    try {
      state.pipWindow.resizeTo(preset.width, preset.height);
    } catch (_err) {
      // Algunas versiones no permiten resizeTo si el usuario ya movió/ajustó
      // la ventana a mano; no es un error crítico, seguimos igual.
    }
    if (syncSizeButtonsRef) syncSizeButtonsRef();
  }

  /** Fallback a la PiP nativa clásica cuando Document PiP no está disponible. */
  async function openNativeFallback(video) {
    await video.requestPictureInPicture();
    state.video = video; // solo para que isOpen()/estado reflejen algo coherente
    video.addEventListener(
      'leavepictureinpicture',
      () => {
        state.video = null;
      },
      { once: true }
    );
  }

  async function open(preferredVideo) {
    if (isOpen()) return state.pipWindow;

    const video = preferredVideo || window.FVP_findBestVideo();
    if (!video) throw new Error('No se encontró ningún video en esta página.');

    if (!supportsDocumentPiP()) {
      await openNativeFallback(video);
      return null;
    }

    const initial = SIZE_PRESETS[DEFAULT_SIZE];
    const pipWindow = await documentPictureInPicture.requestWindow({
      width: initial.width,
      height: initial.height,
    });

    state.pipWindow = pipWindow;
    state.video = video;
    state.originalParent = video.parentNode;
    state.originalNextSibling = video.nextSibling;
    state.originalStyleCssText = video.style.cssText;
    state.currentSize = DEFAULT_SIZE;

    injectStyles(pipWindow.document);
    const ui = buildUI(pipWindow.document);
    ui.videoSlot.appendChild(video);
    const { syncSizeButtons } = wireControls(ui, video, pipWindow);
    syncSizeButtonsRef = syncSizeButtons;

    pipWindow.addEventListener('pagehide', restoreVideo, { once: true });

    return pipWindow;
  }

  function close() {
    if (state.pipWindow) {
      state.pipWindow.close(); // dispara 'pagehide' -> restoreVideo()
    } else if (state.video && document.pictureInPictureElement === state.video) {
      document.exitPictureInPicture().catch(() => {});
    }
  }

  async function toggle() {
    if (isOpen() || document.pictureInPictureElement) {
      close();
    } else {
      await open();
    }
  }

  window.FVP_PiP = { open, close, toggle, resize, isOpen };
})();
