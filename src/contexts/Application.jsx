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
  resetState,
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

  const {
    inputPurse,
    outputPurse,
    inputAmount,
    outputAmount,
    isInputAmount,
  } = state;

  useEffect(() => {
    function messageHandler(message) {
      if (message.type === 'updateAutoswapExchange') {
        // const exchangeAmount = JSON.parse(message.state);
        console.log(message.state);
      }
    }

    if (inputPurse && outputPurse && inputAmount > 0 && outputAmount > 0) {
      if (isInputAmount) {
        doFetch({
          type: 'getAutoswapExchange',
          amount: inputAmount,
          inputDesc: inputPurse.description,
          outputDesc: outputPurse.description,
        }).then(messageHandler);
      } else {
        doFetch({
          type: 'getAutoswapExchange',
          amount: outputAmount,
          inputDesc: outputPurse.description,
          outputDesc: inputPurse.description,
        }).then(messageHandler);
      }
    }
  }, [inputPurse, outputPurse, inputAmount, outputAmount, isInputAmount]);

  return (
    <ApplicationContext.Provider value={{ state, dispatch }}>
      {children}
    </ApplicationContext.Provider>
  );
}
