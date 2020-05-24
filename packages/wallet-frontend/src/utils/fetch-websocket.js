/* globals window, WebSocket */

// todo: refactor this to a class

import { API_URL } from './constants';

// === FETCH

export async function doFetch(req) {
  if (!isWebSocketActive()) {
    throw Error('Must activate web socket before calling doFetch');
  }

  const socket = websocket;

  let resolve;
  const p = new Promise(res => {
    resolve = res;
  });
  socket.send(JSON.stringify(req));
  const expectedResponse = `${req.type}Response`;
  function getResponse({ data: msg }) {
    // console.log('got', msg);
    const obj = JSON.parse(msg);
    if (obj.type === expectedResponse) {
      resolve(obj);
      socket.removeEventListener('message', getResponse);
    }
  }
  socket.addEventListener('message', getResponse);
  return p;
}

// === WEB SOCKET

let websocket = null;

function getWebsocketEndpoint() {
  // TODO proxy websocket.
  const url = new URL('/private/wallet', API_URL || window.origin);
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
