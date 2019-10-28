import React, { createContext, useContext, useReducer, useEffect } from 'react';

import {
  activateWebSocket,
  deactivateWebSocket,
  doFetch,
} from '../utils/fetch-websocket';
import {
  updatePurses,
  serverConnected,
  serverDisconnected,
  changeAmount,
  resetState,
} from '../store/actions';
import { reducer, createDefaultState } from '../store/reducer';

export const ApplicationContext = createContext();

export function useApplicationContext() {
  return useContext(ApplicationContext);
}

export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, createDefaultState());
  const {
    active,
    inputPurse,
    outputPurse,
    inputAmount,
    outputAmount,
    freeVariable,
  } = state;

  useEffect(() => {
    function messageHandler(message) {
      if (!message) return;
      const { type, purses } = message;
      if (type === 'updateWalletPurses' && purses) {
        dispatch(updatePurses(JSON.parse(purses)));
      }
    }

    function getWalletPursesState() {
      return doFetch({ type: 'getWalletPursesState' }).then(messageHandler);
    }

    if (active) {
      activateWebSocket({
        onConnect() {
          dispatch(serverConnected());
          getWalletPursesState();
        },
        onDisconnect() {
          dispatch(serverDisconnected());
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

  useEffect(() => {
    function messageHandler(message) {
      if (!message) return;
      const { type, extent } = message;
      if (type === 'autoswapPrice' && extent) {
        dispatch(changeAmount(extent, 1 - freeVariable));
      }
    }

    if (inputPurse && outputPurse && freeVariable === 0 && inputAmount > 0) {
      doFetch({
        type: 'getAutoswapPrice',
        extent: inputAmount,
        desc0: inputPurse.description,
        desc1: outputPurse.description,
      }).then(messageHandler);
    }

    if (inputPurse && outputPurse && freeVariable === 1 && outputAmount > 0) {
      doFetch({
        type: 'getAutoswapPrice',
        extent: outputAmount,
        desc0: outputPurse.description,
        desc1: inputPurse.description,
      }).then(messageHandler);
    }
  }, [inputPurse, outputPurse, inputAmount, outputAmount, freeVariable]);

  return (
    <ApplicationContext.Provider value={{ state, dispatch }}>
      {children}
    </ApplicationContext.Provider>
  );
}
