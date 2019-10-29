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

export const updatePurses = payload => ({
  type: UPDATE_PURSES,
  payload,
});
export const updateInbox = payload => ({
  type: UPDATE_INBOX,
  payload,
});

export const confirmTrade = () => ({
  type: CONFIRM_TRADE,
});

export const rejectTrade = () => ({
  type: REJECT_TRADE,
});
