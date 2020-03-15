import { doFetch } from '../utils/fetch-websocket';

export function activateConnection(state) {
  return { ...state, active: true };
}
export function deactivateConnection(state) {
  return { ...state, active: false };
}

export function serverConnected(state) {
  return { ...state, connected: true };
}
export function serverDisconnected(state) {
  return { ...state, connected: false };
}

export function updatePurses(state, purses) {
  return { ...state, purses };
}
export function updateInbox(state, inbox) {
  return { ...state, inbox };
}

export function declineOffer(state, id) {
  doFetch({
    type: 'walletDeclineOffer',
    data: id,
  }); // todo toast

  return state;
}
export function acceptOffer(state, id) {
  doFetch({
    type: 'walletAcceptOffer',
    data: id,
  }); // todo toast

  return state;
}
export function cancelOffer(state, id) {
  doFetch({
    type: 'walletCancelOffer',
    data: id,
  });
  return state;
}
