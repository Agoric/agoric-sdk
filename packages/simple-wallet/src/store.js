import { writable, get } from 'svelte/store';

const inbox = writable([]);
const purses = writable([]);

const socket = new WebSocket('ws://localhost:8000/private/wallet');

// Connection opened
socket.addEventListener('open', function (event) {
  sendMessage({ type: 'walletGetPurses' });
  sendMessage({ type: 'walletGetInbox' });
});

// Listen for messages
socket.addEventListener('message', function (event) {
  const obj = JSON.parse(event.data);
  switch (obj.type) {
    case 'walletUpdatePurses': {
      console.log("PURSES ", obj);
      purses.set(JSON.parse(obj.data));
      console.log("PURSES after", get(purses));
      break;
    }
    case 'walletUpdateInbox': {
      inbox.set(JSON.parse(obj.data));
      break;
    }
  }
});

const sendMessage = (obj) => {
  if (socket.readyState <= 1) {
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


export {
  inbox,
  purses,
  // FIXME: Separate methods to approve/reject/cancel
  accept,
  decline,
  cancel,
}
