/* eslint-disable react/display-name */
import React, {
  useEffect,
  createContext,
  memo,
  useContext,
  useState,
  useReducer,
} from 'react';

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

const useDebugLogging = (state, watch) => {
  useEffect(() => console.log(state), watch);
};

const cmp = (a, b) => {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
};

const kv = (keyObj, val) => {
  const key = Object.values(keyObj)[0];
  const text = Array.isArray(key) ? key.join('.') : key;
  return { ...val, ...keyObj, id: text, text, value: val };
};

const inboxReducer = (_, newInbox) =>
  newInbox
    .map(tx => ({
      ...tx,
      offerId: tx.id,
      id: `${tx.requestContext.date}-${tx.requestContext.dappOrigin}-${tx.id}`,
    }))
    .sort((a, b) => cmp(b.id, a.id));

const pursesReducer = (_, newPurses) =>
  newPurses
    .map(purse => kv({ pursePetname: purse.pursePetname }, purse))
    .sort(
      (a, b) =>
        cmp(a.brandPetname, b.brandPetname) ||
        cmp(a.pursePetname, b.pursePetname),
    );

const dappsReducer = (_, newDapps) =>
  newDapps
    .map(dapp => ({ ...dapp, id: dapp.origin }))
    .sort((a, b) => cmp(a.petname, b.petname) || cmp(a.id, b.id));

const contactsReducer = (_, newContacts) =>
  newContacts
    .map(([contactPetname, contact]) => kv({ contactPetname }, contact))
    .sort((a, b) => cmp(a.contactPetname, b.contactPetname) || cmp(a.id, b.id));

const issuersReducer = (_, newIssuers) =>
  newIssuers
    .map(([issuerPetname, issuer]) => kv({ issuerPetname }, issuer))
    .sort((a, b) => cmp(a.id, b.id));

const Provider = ({ children }) => {
  const [connectionState, setConnectionState] = useState('disconnected');
  const [inbox, setInbox] = useReducer(inboxReducer, null);
  const [purses, setPurses] = useReducer(pursesReducer, null);
  const [dapps, setDapps] = useReducer(dappsReducer, null);
  const [contacts, setContacts] = useReducer(contactsReducer, null);
  const [payments, setPayments] = useState(null);
  const [issuers, setIssuers] = useReducer(issuersReducer, null);

  const state = {
    connectionState,
    setConnectionState,
    inbox,
    setInbox,
    purses,
    setPurses,
    dapps,
    setDapps,
    contacts,
    setContacts,
    payments,
    setPayments,
    issuers,
    setIssuers,
  };

  useDebugLogging(state, [inbox, purses, dapps, contacts, payments, issuers]);

  return (
    <ApplicationContext.Provider value={state}>
      {children}
    </ApplicationContext.Provider>
  );
};

export default Provider;
