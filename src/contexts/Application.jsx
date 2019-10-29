import React, { createContext, useContext, useReducer, useEffect } from 'react';

import {
  activateWebSocket,
  deactivateWebSocket,
  doFetch,
} from '../utils/fetch-websocket';
import {
  updatePurses,
  updateInbox,
  serverConnected,
  serverDisconnected,
} from '../store/actions';
import { reducer, createDefaultState } from '../store/reducer';

export const ApplicationContext = createContext();

export function useApplicationContext() {
  return useContext(ApplicationContext);
}

export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, createDefaultState());
  const { active } = state;

  useEffect(() => {
    function messageHandler(message) {
      if (!message) return;
      const { type, purses, inbox } = message;
      if (type === 'walletUpdatePurses' && purses) {
        dispatch(updatePurses(JSON.parse(purses)));
      }
      if (type === 'walletUpdateInbox' && inbox) {
        dispatch(updateInbox(JSON.parse(inbox)));
      }
    }

    function walletGetPurses() {
      return doFetch({ type: 'walletGetPurses' }).then(messageHandler);
    }

    function walletGetInbox() {
      return doFetch({ type: 'walletGetInbox' }).then(messageHandler);
    }

    if (active) {
      activateWebSocket({
        onConnect() {
          dispatch(serverConnected());
          walletGetPurses();
          walletGetInbox();
        },
        onDisconnect() {
          dispatch(serverDisconnected());
          dispatch(updatePurses(null));
          dispatch(updateInbox(null));
        },
        onMessage(message) {
          messageHandler(JSON.parse(message));
        },
      });
    } else {
      deactivateWebSocket();
    }
  }, [active]);

  return (
    <ApplicationContext.Provider value={{ state, dispatch }}>
      {children}
    </ApplicationContext.Provider>
  );
}
