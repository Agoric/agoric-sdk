import { writable } from 'svelte/store';

// like React useHook, return a store and a setter for it
function makeReadable(value, start = undefined) {
  const store = writable(value, start);
  return [{ subscribe: store.subscribe }, store.set];
}

// Find a default url if we are running in dev mode.  FIXME: Make better.
const base = location.port === '5000' ? 'http://localhost:8000' : location.url;

export function makeWebSocket(path, { onOpen, onMessage, onClose }) {
  const [connected, setConnected] = makeReadable(false);

  // Construct a web socket URL.
  const wsurl = new URL(path, base);
  wsurl.protocol = wsurl.protocol.replace(/^http/, 'ws');
  if (!wsurl.protocol.startsWith('ws')) {
    wsurl.protocol = 'ws';
  }

  const RECONNECT_BACKOFF_SECONDS = 3;
  function reopen() {
    console.log(`Reconnecting in ${RECONNECT_BACKOFF_SECONDS} seconds`);
    setTimeout(openSocket, RECONNECT_BACKOFF_SECONDS * 1000);
  }

  let socket = null;
  let retryStrategy = null;
  function openSocket() {
    if (socket) {
      return;
    }
    socket = new WebSocket(`${wsurl}`);
    retryStrategy = reopen;

    // Connection opened
    socket.addEventListener('open', event => {
      setConnected(true);
      onOpen(event);
    });

    // Listen for messages
    socket.addEventListener('message', onMessage);

    socket.addEventListener('error', ev => {
      console.log(`ws.error`, ev);
      socket.close();
    });

    socket.addEventListener('close', _ev => {
      socket = null;
      setConnected(false);
      if (onClose) {
        onClose();
      }
      if (retryStrategy) {
        retryStrategy();
      }
    });
  }

  function disconnect() {
    retryStrategy = null;
    if (socket) {
      socket.close();
    }
  }

  const sendMessage = (obj) => {
    if (socket && socket.readyState <= 1) {
      socket.send(JSON.stringify(obj));
    }
  };

  const connectedExt = { connect: openSocket, disconnect, ...connected };
  return { connected: connectedExt, sendMessage };
}
