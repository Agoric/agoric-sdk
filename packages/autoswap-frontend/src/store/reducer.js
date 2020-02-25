import {
  ACTIVATE_CONNECTION,
  DEACTIVATE_CONNECTION,
  SERVER_CONNECTED,
  SERVER_DISCONNECTED,
  UPDATE_PURSES,
  UPDATE_EXCHANGE_AMOUNT,
  CHANGE_PURSE,
  SWAP_INPUTS,
  CHANGE_AMOUNT,
  CREATE_OFFER,
  RESET_STATE,
} from './types';
import {
  activateConnection,
  deactivateConnection,
  serverConnected,
  serverDisconnected,
  updatePurses,
  updateExchangeAmount,
  changePurse,
  changeAmount,
  swapInputs,
  createOffer,
  resetState,
} from './operations';

export function createDefaultState() {
  return {
    active: false,
    connected: false,
    account: null,
    purses: null,
    inputPurse: null,
    outputPurse: null,
    inputAmount: null,
    outputAmount: null,
    freeVariable: null,
  };
}

/* eslint-disable complexity */
export const reducer = (state, { type, payload }) => {
  switch (type) {
    case ACTIVATE_CONNECTION:
      return activateConnection(state);
    case DEACTIVATE_CONNECTION:
      return deactivateConnection(state);

    case SERVER_CONNECTED:
      return serverConnected(state);
    case SERVER_DISCONNECTED:
      return serverDisconnected(state);

    case UPDATE_PURSES:
      return updatePurses(state, payload);
    case UPDATE_EXCHANGE_AMOUNT:
      return updateExchangeAmount(state, payload);

    case CHANGE_PURSE:
      return changePurse(state, payload);
    case CHANGE_AMOUNT:
      return changeAmount(state, payload);
    case SWAP_INPUTS:
      return swapInputs(state);

    case CREATE_OFFER:
      return createOffer(state, payload);

    case RESET_STATE:
      return resetState(state);

    default:
      throw new TypeError(`Action not supported ${type}`);
  }
};
/* eslint-enable complexity */
