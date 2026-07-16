/**
 * popup.js — Float Video Pro
 * ─────────────────────────────────────────────────────────────────────────
 * UI del popup: muestra la pestaña activa, si tiene video, y controla la
 * ventana flotante de esa misma pestaña.
 *
 * Detalle importante: activar el Picture-in-Picture exige un gesto de
 * usuario "fresco" sobre el documento de la página (no del popup). Por eso
 * el botón principal NO envía un chrome.runtime.sendMessage genérico —
 * llama a chrome.scripting.executeScript de forma directa y síncrona
 * dentro del propio manejador de click, que es la única forma soportada de
 * preservar esa activación hasta pip.js. Cerrar y redimensionar sí pueden
 * ir por el camino normal de mensajes, porque no abren ninguna ventana
 * nueva.
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

  async function highlightSavedSize() {
    const data = await chrome.storage.local.get(['fvpLastSize']);
    const size = data.fvpLastSize || 'M';
    for (const btn of els.sizeButtons) {
      btn.classList.toggle('active', btn.dataset.size === size);
    }
  }

  async function init() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    local.tabId = tab.id;

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

    await highlightSavedSize();
    await refreshState();
  }

  // ── Botón principal: activar/cerrar PiP ─────────────────────────────────
  els.toggleBtn.addEventListener('click', () => {
    if (local.tabId == null) return;

    // Llamada SÍNCRONA dentro del manejador de click: es lo que preserva
    // el gesto de usuario hasta documentPictureInPicture.requestWindow()
    // dentro de pip.js.
    chrome.scripting.executeScript({
      target: { tabId: local.tabId },
      func: () => {
        if (window.FVP_PiP) window.FVP_PiP.toggle();
      },
    });

    // pip.js tarda un instante en abrir/cerrar la ventana; refrescamos el
    // estado poco después para reflejar el resultado en el botón.
    setTimeout(refreshState, 400);
  });

  // ── Presets de tamaño ────────────────────────────────────────────────────
  for (const btn of els.sizeButtons) {
    btn.addEventListener('click', async () => {
      const size = btn.dataset.size;
      for (const b of els.sizeButtons) b.classList.toggle('active', b === btn);
      await chrome.storage.local.set({ fvpLastSize: size });

      // Redimensionar una ventana YA abierta no requiere gesto de usuario:
      // esto sí puede ir por el mensaje normal.
      const response = await sendToContentScript({ type: 'FVP_RESIZE', size });
      if (!response) showStatus(`Tamaño ${size} guardado para la próxima vez`);
    });
  }

  init();
})();
