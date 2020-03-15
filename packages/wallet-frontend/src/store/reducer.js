import {
  ACTIVATE_CONNECTION,
  DEACTIVATE_CONNECTION,
  SERVER_CONNECTED,
  SERVER_DISCONNECTED,
  UPDATE_PURSES,
  UPDATE_INBOX,
  REJECT_OFFER,
  CANCEL_OFFER,
  CONFIRM_OFFER,
} from './types';
import {
  activateConnection,
  deactivateConnection,
  serverConnected,
  serverDisconnected,
  updatePurses,
  updateInbox,
  declineOffer,
  cancelOffer,
  acceptOffer,
} from './operations';

export function createDefaultState() {
  return {
    active: false,
    connected: false,
    account: null,
    purses: null,
    inbox: null,
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
    case UPDATE_INBOX:
      return updateInbox(state, payload);

    case REJECT_OFFER:
      return declineOffer(state, payload);
    case CANCEL_OFFER:
      return cancelOffer(state, payload);
    case CONFIRM_OFFER:
      return acceptOffer(state, payload);

    default:
      throw new TypeError(`Action not supported ${type}`);
  }
};
/* eslint-enable complexity */
