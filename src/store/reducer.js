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
import {
  activateConnection,
  deactivateConnection,
  serverConnected,
  serverDisconnected,
  updatePurses,
  swapPurses,
  changePurse,
  changeAmount,
  createOffer,
  resetState,
} from './operations';

export function createDefaultState() {
  return {
    active: false,
    connected: false,
    account: null,
    purses: null,
    inputPurse: '',
    outputPurse: '',
    inputAmount: '',
    outputAmount: '',
  };
}

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

    case CHANGE_PURSE:
      return changePurse(state, payload);
    case SWAP_PURSES:
      return swapPurses(state);
    case CHANGE_AMOUNT:
      return changeAmount(state, payload);

    case CREATE_OFFER:
      return createOffer(state, payload);

    case RESET_STATE:
      return resetState(state);

    default:
      throw new TypeError(`Action not supported ${type}`);
  }
};
