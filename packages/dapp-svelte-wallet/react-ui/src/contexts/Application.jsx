/* eslint-disable react/display-name */
import React, { createContext, memo, useContext, useState } from 'react';

export const ApplicationContext = createContext();

export const useApplicationContext = () => useContext(ApplicationContext);

// Higher-order component wrapper for mapping context to props. This allows
// components to use `memo` and avoid rerendering when unrelated context
// changes.
export const withApplicationContext = (Component, mapContextToProps) => {
  const MemoizedComponent = memo(Component);
  return ({ ...props }) => {
    const context = mapContextToProps(useApplicationContext());

    return <MemoizedComponent {...context} {...props} />;
  };
};

const Provider = ({ children }) => {
  const [connectionState, setConnectionState] = useState('disconnected');

  const state = {
    connectionState,
    setConnectionState,
  };

  return (
    <ApplicationContext.Provider value={state}>
      {children}
    </ApplicationContext.Provider>
  );
};

export default Provider;
