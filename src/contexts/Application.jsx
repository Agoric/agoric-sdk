import React, { createContext, useContext, useReducer, useEffect } from 'react';

import {
  activateWebSocket,
  deactivateWebSocket,
  doFetch,
} from '../utils/fetch-websocket';
import {
  updatePurses,
  updateTransactions,
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
      if (message.type === 'updateWalletPurses') {
        const pursesState = JSON.parse(message.state);
        dispatch(updatePurses(pursesState));
      }
    }

    function fetchGetWalletState() {
      return doFetch({ type: 'getWalletPursesState' }).then(messageHandler);
    }

    if (active) {
      activateWebSocket({
        onConnect() {
          dispatch(serverConnected());
          fetchGetWalletState();
        },
        onDisconnect() {
          dispatch(serverDisconnected());
          dispatch(updatePurses({}));
          dispatch(updateTransactions({}));
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
