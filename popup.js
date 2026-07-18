/**
 * popup.js — Super Video Popup
 * ─────────────────────────────────────────────────────────────────────────
 * UI del popup: muestra la pestaña activa, si tiene video, y controla la
 * ventana flotante de esa misma pestaña.
 *
 * Detalle importante: activar el Picture-in-Picture exige un gesto de
 * usuario "fresco" sobre el documento de la página (no del popup). Por eso
 * la activación NUNCA pasa por un chrome.runtime.sendMessage genérico —
 * usa chrome.scripting.executeScript de forma directa y síncrona, que es
 * la única forma soportada de preservar esa activación hasta pip.js.
 * Cerrar y redimensionar sí pueden ir por el camino normal de mensajes,
 * porque no abren ninguna ventana nueva.
 *
 * Comportamiento por defecto: abrir el popup (clic en el icono de la
 * extensión) YA activa el Picture-in-Picture en tamaño M si la pestaña
 * tiene un video, sin necesidad de un segundo clic. El botón dentro del
 * popup queda disponible para cerrarlo de nuevo o para reabrirlo si el
 * video apareció después.
 */

(() => {
  'use strict';

  const els = {
    favicon: document.getElementById('siteFavicon'),
    title: document.getElementById('siteTitle'),
    domain: document.getElementById('siteDomain'),
    noVideoBadge: document.getElementById('noVideoBadge'),
    toggleBtn: document.getElementById('toggleBtn'),
    toggleLabel: document.getElementById('toggleLabel'),
    sizeButtons: Array.from(document.querySelectorAll('.size-btn')),
    status: document.getElementById('statusMessage'),
  };

  const local = { tabId: null };

  const FALLBACK_FAVICON =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%239aa0a6">' +
        '<path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>'
    );

  function showStatus(text) {
    els.status.textContent = text;
    clearTimeout(showStatus._t);
    showStatus._t = setTimeout(() => {
      els.status.textContent = '';
    }, 1800);
  }

  function sendToContentScript(message) {
    return new Promise((resolve) => {
      if (local.tabId == null) return resolve(null);
      chrome.tabs.sendMessage(local.tabId, message, (response) => {
        void chrome.runtime.lastError;
        resolve(response || null);
      });
    });
  }

  function renderState(state) {
    const hasVideo = Boolean(state && state.hasVideo);
    const pipActive = Boolean(state && state.pipActive);

    els.noVideoBadge.classList.toggle('hidden', hasVideo);
    els.toggleBtn.disabled = !hasVideo;
    els.toggleBtn.classList.toggle('is-active', pipActive);
    els.toggleLabel.textContent = pipActive ? 'Cerrar ventana flotante' : 'Activar Picture-in-Picture';
  }

  async function refreshState() {
    const response = await sendToContentScript({ type: 'FVP_GET_STATE' });
    if (response && response.ok) {
      renderState(response.state);
    } else {
      renderState({ hasVideo: false, pipActive: false });
      showStatus('Esta página no permite detectar video.');
    }
  }

  function highlightSize(size) {
    for (const btn of els.sizeButtons) {
      btn.classList.toggle('active', btn.dataset.size === size);
    }
  }

  /**
   * Activa el PiP en tamaño M, pero solo si la pestaña tiene video y todavía
   * no hay una ventana flotante abierta (comprobado dentro del propio tab,
   * en la misma llamada, para no perder el gesto de usuario en una vuelta
   * de mensajes). Es una llamada "fire and forget": el resultado se refleja
   * después vía refreshState().
   */
  function autoActivate(tabId) {
    chrome.scripting
      .executeScript({
        target: { tabId },
        func: () => {
          if (
            window.FVP_PiP &&
            !window.FVP_PiP.isOpen() &&
            window.FVP_findBestVideo &&
            window.FVP_findBestVideo()
          ) {
            window.FVP_PiP.open();
          }
        },
      })
      .catch(() => {
        // Páginas especiales (chrome://, Web Store, visor de PDF...) no
        // admiten inyección de scripts; refreshState() ya refleja "sin video".
      });
  }

  async function init() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    local.tabId = tab.id;

    // Se dispara ANTES que cualquier otro await para preservar el gesto de
    // usuario que abrió el popup (clic en el icono de la extensión).
    autoActivate(tab.id);

    let domain = '';
    try {
      domain = new URL(tab.url).hostname.replace(/^www\./i, '');
    } catch (_err) {
      domain = '';
    }

    els.title.textContent = tab.title || 'Pestaña sin título';
    els.domain.textContent = domain || 'Página especial del navegador';
    els.favicon.src = tab.favIconUrl || FALLBACK_FAVICON;
    els.favicon.onerror = () => {
      els.favicon.src = FALLBACK_FAVICON;
    };

    highlightSize('M');

    // Le da un instante a autoActivate() para completarse antes de leer el
    // estado real (abrir la ventana Document PiP no es instantáneo).
    setTimeout(refreshState, 350);
  }

  // ── Botón principal: activar/cerrar PiP ─────────────────────────────────
  els.toggleBtn.addEventListener('click', () => {
    if (local.tabId == null) return;

    // Llamada SÍNCRONA dentro del manejador de click: es lo que preserva
    // el gesto de usuario hasta documentPictureInPicture.requestWindow()
    // dentro de pip.js.
    chrome.scripting
      .executeScript({
        target: { tabId: local.tabId },
        func: () => {
          if (window.FVP_PiP) window.FVP_PiP.toggle();
        },
      })
      .catch(() => {
        showStatus('Esta página no permite activar Picture-in-Picture.');
      });

    // pip.js tarda un instante en abrir/cerrar la ventana; refrescamos el
    // estado poco después para reflejar el resultado en el botón.
    setTimeout(refreshState, 400);
  });

  // ── Presets de tamaño ────────────────────────────────────────────────────
  // Redimensionar una ventana YA abierta no requiere gesto de usuario: esto
  // sí puede ir por el mensaje normal a content.js.
  for (const btn of els.sizeButtons) {
    btn.addEventListener('click', async () => {
      const size = btn.dataset.size;
      highlightSize(size);
      const response = await sendToContentScript({ type: 'FVP_RESIZE', size });
      if (!response) showStatus('Abre primero el Picture-in-Picture para poder redimensionarlo');
    });
  }

  init();
})();
