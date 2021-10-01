import React, { useReducer, createContext, useContext } from 'react';

import { reducer, defaultState } from '../store';

export const ApplicationContext = createContext();

export function useApplicationContext() {
  return useContext(ApplicationContext);
}

const Provider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, defaultState);

  return (
    <ApplicationContext.Provider value={{ state, dispatch }}>
      {children}
    </ApplicationContext.Provider>
  );
};

export default Provider;
