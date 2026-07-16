/**
 * background.js — Super Video Popup
 * ─────────────────────────────────────────────────────────────────────────
 * Service worker de Manifest V3. Su única responsabilidad es traducir los
 * atajos de teclado (chrome.commands) en acciones sobre la pestaña activa.
 *
 * "activate-pip" usa chrome.scripting.executeScript de forma síncrona,
 * dentro del propio manejador de onCommand: Chrome trata la pulsación del
 * atajo como un gesto de usuario válido, y ejecutar el script en esa misma
 * cadena síncrona es lo que permite que documentPictureInPicture (llamado
 * dentro de pip.js) no sea rechazado por falta de "activación transitoria".
 * "close-pip" no crea ninguna ventana nueva, así que no necesita ese cuidado
 * y basta con un mensaje normal al content script.
 */

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

chrome.commands.onCommand.addListener(async (command) => {
  const tab = await getActiveTab();
  if (!tab || tab.id == null) return;

  if (command === 'activate-pip') {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        if (window.FVP_PiP) window.FVP_PiP.toggle();
      },
    });
  } else if (command === 'close-pip') {
    chrome.tabs.sendMessage(tab.id, { type: 'FVP_CLOSE_PIP' }, () => {
      // Ignoramos chrome.runtime.lastError: puede no haber content script
      // en páginas especiales (chrome://, Web Store, etc.).
      void chrome.runtime.lastError;
    });
  }
});
