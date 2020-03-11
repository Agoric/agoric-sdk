import {
  ACTIVATE_CONNECTION,
  DEACTIVATE_CONNECTION,
  SERVER_CONNECTED,
  SERVER_DISCONNECTED,
  UPDATE_PURSES,
  UPDATE_INBOX,
  CANCEL_OFFER,
  REJECT_OFFER,
  CONFIRM_OFFER,
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

export const cancelOffer = payload => ({
  type: CANCEL_OFFER,
  payload,
});

export const declineOffer = payload => ({
  type: REJECT_OFFER,
  payload,
});

export const acceptOffer = payload => ({
  type: CONFIRM_OFFER,
  payload,
});
