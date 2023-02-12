import { createContext, memo, useContext } from 'react';

export const ApplicationContext = createContext();

export const ConnectionStatus = {
  Connected: 'connected',
  Connecting: 'connecting',
  Disconnected: 'disconnected',
  Error: 'error',
};

// Higher-order component wrapper for mapping context to props. This allows
// components to use `memo` and avoid rerendering when unrelated context
// changes.
export const withApplicationContext = (Component, mapContextToProps) => {
  const MemoizedComponent = memo(Component);
  return ({ ...props }) => {
    const context = mapContextToProps(useContext(ApplicationContext));

    return <MemoizedComponent {...context} {...props} />;
  };
};
