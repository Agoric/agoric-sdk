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
  deactivateConnection,
  changeAmount,
  resetState,
} from '../store/actions';
import { reducer, createDefaultState } from '../store/reducer';

import { CONTRACT_NAME } from '../utils/constants';

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
      if (message.type === 'walletUpdatePurses') {
        dispatch(updatePurses(JSON.parse(message.state)));
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
        type: 'autoswapGetPrice',
        contractId: CONTRACT_NAME,
        extent: inputAmount,
        desc0: inputPurse.description,
        desc1: outputPurse.description,
      }).then(messageHandler);
    }

    if (inputPurse && outputPurse && freeVariable === 1 && outputAmount > 0) {
      doFetch({
        type: 'autoswapGetPrice',
        contractId: CONTRACT_NAME,
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
