import {
  ACTIVATE_CONNECTION,
  DEACTIVATE_CONNECTION,
  SERVER_CONNECTED,
  SERVER_DISCONNECTED,
  UPDATE_PURSES,
  UPDATE_INBOX,
  CONFIRM_TRADE,
  REJECT_TRADE,
} from './types';
import {
  activateConnection,
  deactivateConnection,
  serverConnected,
  serverDisconnected,
  updatePurses,
  updateInbox,
  confirmTrade,
  rejectTrade,
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

    case CONFIRM_TRADE:
      return confirmTrade(state, payload);
    case REJECT_TRADE:
      return rejectTrade(state, payload);
    default:
      throw new TypeError(`Action not supported ${type}`);
  }
};
