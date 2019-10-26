import {
  ACTIVATE_CONNECTION,
  DEACTIVATE_CONNECTION,
  SERVER_CONNECTED,
  SERVER_DISCONNECTED,
  UPDATE_PURSES,
  CHANGE_PURSE,
  SWAP_PURSES,
  CHANGE_AMOUNT,
  CREATE_OFFER,
  RESET_STATE,
} from './types';

export const activateConnection = () => ({
  type: ACTIVATE_CONNECTION,
});

export const deactivateConnection = () => ({
  type: DEACTIVATE_CONNECTION,
});

export const serverConnected = () => ({
  type: SERVER_CONNECTED,
});

export const serverDisconnected = () => ({
  type: SERVER_DISCONNECTED,
});

export const updatePurses = purses => ({
  type: UPDATE_PURSES,
  payload: purses,
});

export const changePurse = (purse, isInput) => ({
  type: CHANGE_PURSE,
  payload: { purse, isInput },
});

export const swapPurses = () => ({
  type: SWAP_PURSES,
});

export const changeAmount = (amount, isInput) => ({
  type: CHANGE_AMOUNT,
  payload: { amount, isInput },
});

export const createOffer = () => ({
  type: CREATE_OFFER,
});

export const resetState = () => ({
  type: RESET_STATE,
});
