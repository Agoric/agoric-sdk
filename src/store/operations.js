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

export function rejectOffer(state, date) {
  doFetch({
    type: 'walletRejectOffer',
    data: date,
  }); // todo toast

  return state;
}
export function confirmOffer(state, date) {
  doFetch({
    type: 'walletConfirmOffer',
    data: date,
  }); // todo toast

  return state;
}
