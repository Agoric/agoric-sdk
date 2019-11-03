import {
  ACTIVATE_CONNECTION,
  DEACTIVATE_CONNECTION,
  SERVER_CONNECTED,
  SERVER_DISCONNECTED,
  UPDATE_PURSES,
  CHANGE_PURSE,
  SWAP_INPUTS,
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

export const changePurse = (purse, fieldNumber, freeVariable) => ({
  type: CHANGE_PURSE,
  payload: { purse, fieldNumber, freeVariable },
});

export const swapInputs = () => ({
  type: SWAP_INPUTS,
});

export const changeAmount = (amount, fieldNumber, freeVariable) => ({
  type: CHANGE_AMOUNT,
  payload: { amount, fieldNumber, freeVariable },
});

export const createOffer = (
  instanceId,
  inputAmount,
  outputAmount,
  inputPurse,
  outputPurse,
) => ({
  type: CREATE_OFFER,
  payload: { instanceId, inputAmount, outputAmount, inputPurse, outputPurse },
});

export const resetState = () => ({
  type: RESET_STATE,
});
