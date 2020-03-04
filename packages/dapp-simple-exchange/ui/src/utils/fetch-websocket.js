/* globals window, WebSocket, fetch */

import { API_URL } from './constants';

// === FETCH

export async function doFetch(req, toBridge = false) {
  return fetch(toBridge ? '/bridge' : '/vat', {
    method: 'POST',
    body: JSON.stringify(req),
    headers: { 'Content-Type': 'application/json' },
  })
    .then(response => response.json())
    .then(({ ok, res }) => (ok ? res : {}))
    .catch(err => {
      console.log('Fetch Error', err);
    });
}

// === WEB SOCKET

let websocket = null;

function getWebsocketEndpoint() {
  // TODO proxy websocket.
  const url = new URL(API_URL || window.origin);
  url.protocol = 'ws';
  return url;
}

function createWebSocket({ onConnect, onDisconnect, onMessage }) {
  websocket = new WebSocket(getWebsocketEndpoint());
  if (onConnect) {
    websocket.addEventListener('open', () => onConnect());
  }
  if (onDisconnect) {
    websocket.addEventListener('close', () => onDisconnect());
  }
  if (onMessage) {
    websocket.addEventListener('message', ({ data }) => onMessage(data));
  }
}

function closeWebSocket() {
  websocket.close();
  websocket = null;
}

function isWebSocketActive() {
  return !!websocket;
}

export function activateWebSocket(websocketListeners = {}) {
  if (isWebSocketActive()) return;
  createWebSocket(websocketListeners);
}

export function deactivateWebSocket() {
  if (!isWebSocketActive()) return;
  closeWebSocket();
}
