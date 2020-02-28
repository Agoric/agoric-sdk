// import { doFetch } from '../utils/fetch-websocket';

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

export function resetState(state) {
  return {
    ...state,
    purses: null,
    inputPurse: null,
    outputPurse: null,
    inputAmount: null,
    outputAmount: null,
  };
}
