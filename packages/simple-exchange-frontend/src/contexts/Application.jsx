import React, { createContext, useContext, useEffect, useReducer } from 'react';

import {
  activateWebSocket,
  deactivateWebSocket,
  doFetch,
} from '../utils/fetch-websocket';
import {
  updatePurses,
  serverConnected,
  serverDisconnected,
  deactivateConnection,
  resetState,
} from '../store/actions';
import { reducer, createDefaultState } from '../store/reducer';

export const ApplicationContext = createContext();

export function useApplicationContext() {
  return useContext(ApplicationContext);
}

// eslint-disable-next-line react/prop-types
export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, createDefaultState());

  const { active } = state;

  useEffect(() => {
    function messageHandler(message) {
      if (!message) return;
      const { type, data } = message;
      if (type === 'walletUpdatePurses') {
        dispatch(updatePurses(JSON.parse(data)));
      }
    }

    function walletGetPurses() {
      return doFetch({ type: 'walletGetPurses' }).then(messageHandler);
    }

    if (active) {
      activateWebSocket({
        onConnect() {
          dispatch(serverConnected());
          walletGetPurses();
        },
        onDisconnect() {
          dispatch(serverDisconnected());
          dispatch(deactivateConnection());
          dispatch(resetState());
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
