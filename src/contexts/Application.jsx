import React, { createContext, useReducer } from 'react';

import { reducer, initialState } from '../store/reducer';

export const ApplicationContext = createContext();

export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <ApplicationContext.Provider value={{ state, dispatch }}>
      {children}
    </ApplicationContext.Provider>
  );
}
