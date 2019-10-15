import {
  ACTIVATE_CONNECTION,
  DEACTIVATE_CONNECTION,
  SERVER_CONNECTED,
  SERVER_DISCONNECTED,
  UPDATE_PURSES,
  UPDATE_TRANSACTIONS,
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

export const updateTransactions = payload => ({
  type: UPDATE_TRANSACTIONS,
  payload,
});

export const confirmTrade = () => ({
  type: CONFIRM_TRADE,
});

export const rejectTrade = () => ({
  type: REJECT_TRADE,
});
