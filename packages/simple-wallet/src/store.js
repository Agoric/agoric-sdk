import { writable } from 'svelte/store';

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
      purses.set(JSON.parse(obj.data));
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

const accept = (entry) => {
  sendMessage({
    type: 'walletAcceptOffer',
    data: entry.id,
  });
};

const decline = (offer) => {
  sendMessage({
    type: 'walletDeclineOffer',
    data: entry.id,
  });
};

const cancel = (offer) => {
  sendMessage({
    type: 'walletCancelOffer',
    data: entry.id,
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
