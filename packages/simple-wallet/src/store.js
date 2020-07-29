import { writable } from 'svelte/store';
import { makeWebSocket } from './websocket';

// like React useHook, return a store and a setter for it
function makeReadable(value, start = undefined) {
  const store = writable(value, start);
  return [{ subscribe: store.subscribe }, store.set];
}

const [inbox, setInbox] = makeReadable([]);
const [purses, setPurses] = makeReadable([]);

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

// Wallet RPC bridge.
const walletP = Promise.resolve({
  acceptOffer(id) {
    sendMessage({
      type: 'walletAcceptOffer',
      data: id,
    });
  },
  declineOffer(id) {
    sendMessage({
      type: 'walletDeclineOffer',
      data: id,
    });
  },
  cancelOffer(id) {
    sendMessage({
      type: 'walletCancelOffer',
      data: id,
    });
  },
});

const { connected, sendMessage } = makeWebSocket('/private/wallet', {onOpen, onMessage});

export {
  inbox,
  purses,
  connected,
  walletP,
}
