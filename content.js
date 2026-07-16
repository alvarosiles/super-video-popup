/**
 * content.js — Float Video Pro
 * ─────────────────────────────────────────────────────────────────────────
 * Se inyecta en todas las páginas (ver manifest.json) y es responsable de:
 *
 *   1. Detectar automáticamente los elementos <video> de la página,
 *      incluidos los que aparecen después de cargar (YouTube, Netflix,
 *      Twitch, Vimeo... son SPAs que montan el reproductor dinámicamente).
 *   2. Elegir "el mejor" video cuando hay varios en la misma página (el que
 *      se está reproduciendo, o si no el más grande visualmente).
 *   3. Responder a los mensajes del popup/background que NO requieren un
 *      gesto de usuario fresco (consultar estado, cerrar PiP, cambiar de
 *      tamaño). Activar el PiP es la única acción sensible al gesto del
 *      usuario, y por eso NO pasa por aquí — ver pip.js y popup.js.
 *
 * El trabajo real de construir la ventana flotante vive en pip.js, cargado
 * justo después de este archivo en el mismo mundo aislado (namespace
 * compartido en `window.FVP_PiP`).
 */

(() => {
  'use strict';

  if (window.__floatVideoProInjected) return;
  window.__floatVideoProInjected = true;

  /** Devuelve todos los <video> visibles actualmente en la página. */
  function findVideos() {
    return Array.from(document.querySelectorAll('video'));
  }

  /**
   * Elige el video "más relevante": prioriza los que se están reproduciendo
   * ahora mismo y, entre esos (o entre todos si ninguno está en play), el
   * de mayor área visible en pantalla.
   */
  function pickBestVideo() {
    const videos = findVideos();
    if (!videos.length) return null;

    const playing = videos.filter((v) => !v.paused && !v.ended && v.readyState > 2);
    const pool = playing.length ? playing : videos;

    let best = pool[0];
    let bestArea = best.clientWidth * best.clientHeight;
    for (const v of pool.slice(1)) {
      const area = v.clientWidth * v.clientHeight;
      if (area > bestArea) {
        best = v;
        bestArea = area;
      }
    }
    return best;
  }

  // Se expone para que pip.js (mismo mundo aislado) pueda reutilizarla al
  // activar el PiP, sin duplicar la lógica de selección.
  window.FVP_findBestVideo = pickBestVideo;

  function currentState() {
    return {
      hasVideo: findVideos().length > 0,
      pipActive: Boolean(window.FVP_PiP && window.FVP_PiP.isOpen()),
      domain: (() => {
        try {
          return location.hostname.replace(/^www\./i, '');
        } catch (_err) {
          return '';
        }
      })(),
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message.type !== 'string') return false;

    switch (message.type) {
      case 'FVP_GET_STATE':
        sendResponse({ ok: true, state: currentState() });
        break;

      case 'FVP_CLOSE_PIP':
        if (window.FVP_PiP) window.FVP_PiP.close();
        sendResponse({ ok: true, state: currentState() });
        break;

      case 'FVP_RESIZE':
        if (window.FVP_PiP) window.FVP_PiP.resize(message.size);
        sendResponse({ ok: true, state: currentState() });
        break;

      default:
        return false;
    }

    return true;
  });
})();
