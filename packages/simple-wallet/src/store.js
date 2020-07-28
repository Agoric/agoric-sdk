import { writable } from 'svelte/store';

// like React useHook, return a store and a setter for it
function privateStore(value, start = undefined) {
  const store = writable(value, start);
  return [{ subscribe: store.subscribe }, store.set];
}

const [inbox, setInbox] = privateStore([]);
const [purses, setPurses] = privateStore([]);
const [connected, setConnected] = privateStore(false);

// INITALIZATION

function onOpen(event) {
  sendMessage({ type: 'walletGetPurses' });
  sendMessage({ type: 'walletGetInbox' });
}

function onMessage(event) {
  const obj = JSON.parse(event.data);
  switch (obj.type) {
    case 'walletUpdatePurses': {
      setPurses(JSON.parse(obj.data));
      break;
    }
    case 'walletUpdateInbox': {
      setInbox(JSON.parse(obj.data));
      break;
    }
  }
};

// === WEB SOCKET
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
  socket = new WebSocket('ws://localhost:8000/private/wallet');
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

const accept = (id) => {
  sendMessage({
    type: 'walletAcceptOffer',
    data: id,
  });
};

const decline = (id) => {
  sendMessage({
    type: 'walletDeclineOffer',
    data: id,
  });
};

const cancel = (id) => {
  sendMessage({
    type: 'walletCancelOffer',
    data: id,
  });
};

const connectedExt = { connect: openSocket, disconnect, ...connected };

export {
  inbox,
  purses,
  connectedExt as connected,
  // FIXME: Separate methods to approve/reject/cancel
  accept,
  decline,
  cancel,
}
