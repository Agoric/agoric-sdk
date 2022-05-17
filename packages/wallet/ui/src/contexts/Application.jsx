/* eslint-disable react/display-name */
import { observeIterator } from '@agoric/notifier';
import {
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
  const id = val.meta?.id;
  return { ...val, ...keyObj, id: id ?? text, text, value: val };
};

const inboxReducer = (_, newInbox) =>
  newInbox
    ?.map(tx => ({
      ...tx,
      offerId: tx.id,
      id: tx.meta.id,
    }))
    .sort((a, b) => cmp(b.id, a.id)) || null;

const pursesReducer = (_, newPurses) =>
  newPurses
    ?.map(purse => kv({ pursePetname: purse.pursePetname }, purse))
    .sort(
      (a, b) =>
        cmp(a.brandPetname, b.brandPetname) ||
        cmp(a.pursePetname, b.pursePetname),
    ) || null;

const dappsReducer = (_, newDapps) =>
  newDapps
    ?.map(dapp => ({ ...dapp, id: dapp.meta.id }))
    .sort((a, b) => cmp(a.petname, b.petname) || cmp(a.id, b.id)) || null;

const contactsReducer = (_, newContacts) =>
  newContacts
    ?.map(([contactPetname, contact]) => kv({ contactPetname }, contact))
    .sort(
      (a, b) => cmp(a.contactPetname, b.contactPetname) || cmp(a.id, b.id),
    ) || null;

const issuersReducer = (_, newIssuers) =>
  newIssuers
    ?.map(([issuerPetname, issuer]) => kv({ issuerPetname }, issuer))
    .sort((a, b) => cmp(a.id, b.id)) || null;

const paymentsReducer = (_, newPayments) =>
  newPayments
    ?.map(payment => ({ ...payment, id: payment.meta.id }))
    .sort((a, b) => cmp(a.id, b.id)) || null;

const pendingPurseCreationsReducer = (
  pendingPurseCreations,
  { issuerId, isPending },
) => {
  if (isPending) pendingPurseCreations.add(issuerId);
  else pendingPurseCreations.delete(issuerId);

  return new Set(pendingPurseCreations);
};

const pendingTransfersReducer = (pendingTransfers, { purseId, isPending }) => {
  if (isPending) pendingTransfers.add(purseId);
  else pendingTransfers.delete(purseId);

  return new Set(pendingTransfers);
};

const pendingOffersReducer = (pendingOffers, { offerId, isPending }) => {
  if (isPending) pendingOffers.add(offerId);
  else pendingOffers.delete(offerId);

  return new Set(pendingOffers);
};

const declinedOffersReducer = (declinedOffers, { offerId, isDeclined }) => {
  if (isDeclined) declinedOffers.add(offerId);
  else declinedOffers.delete(offerId);

  return new Set(declinedOffers);
};

const closedOffersReducer = (closedOffers, { offerId, isClosed }) => {
  if (isClosed) closedOffers.add(offerId);
  else closedOffers.delete(offerId);

  return new Set(closedOffers);
};

const Provider = ({ children }) => {
  const [connectionState, setConnectionState] = useState('disconnected');
  const [inbox, setInbox] = useReducer(inboxReducer, null);
  const [purses, setPurses] = useReducer(pursesReducer, null);
  const [dapps, setDapps] = useReducer(dappsReducer, null);
  const [contacts, setContacts] = useReducer(contactsReducer, null);
  const [payments, setPayments] = useReducer(paymentsReducer, null);
  const [issuers, setIssuers] = useReducer(issuersReducer, null);
  const [services, setServices] = useState(null);
  const [schemaActions, setSchemaActions] = useState(null);
  const [useChainBackend, setUseChainBackend] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const onChain = urlParams.get('onchain') === 'true';
    setUseChainBackend(onChain);
  }, []);

  const backendSetters = new Map([
    ['services', setServices],
    ['offers', setInbox],
    ['purses', setPurses],
    ['contacts', setContacts],
    ['payments', setPayments],
    ['issuers', setIssuers],
    ['dapps', setDapps],
  ]);
  const setBackend = backend => {
    if (!backend) {
      setSchemaActions(null);
      for (const setter of backendSetters.values()) {
        setter(null);
      }
      return;
    }
    setSchemaActions(backend.actions);
    for (const [prop, setter] of backendSetters.entries()) {
      observeIterator(backend[prop], { updateState: setter });
    }
  };

  const [pendingPurseCreations, setPendingPurseCreations] = useReducer(
    pendingPurseCreationsReducer,
    new Set(),
  );
  const [pendingTransfers, setPendingTransfers] = useReducer(
    pendingTransfersReducer,
    new Set(),
  );

  // Eager set of pending offer ids.
  const [pendingOffers, setPendingOffers] = useReducer(
    pendingOffersReducer,
    new Set(),
  );

  // Eager set of declined offer ids.
  const [declinedOffers, setDeclinedOffers] = useReducer(
    declinedOffersReducer,
    new Set(),
  );

  // Set of closed offers. Allows eagerly declined offers to be closed while
  // still pending.
  const [closedOffers, setClosedOffers] = useReducer(
    closedOffersReducer,
    new Set(),
  );

  const state = {
    connectionState,
    setConnectionState,
    schemaActions,
    setBackend,
    services,
    setServices,
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
    pendingPurseCreations,
    setPendingPurseCreations,
    pendingTransfers,
    setPendingTransfers,
    pendingOffers,
    setPendingOffers,
    declinedOffers,
    setDeclinedOffers,
    closedOffers,
    setClosedOffers,
    useChainBackend,
  };

  useDebugLogging(state, [
    schemaActions,
    inbox,
    purses,
    dapps,
    contacts,
    payments,
    issuers,
    pendingPurseCreations,
    services,
    pendingTransfers,
    pendingOffers,
    declinedOffers,
    closedOffers,
  ]);

  return (
    <ApplicationContext.Provider value={state}>
      {children}
    </ApplicationContext.Provider>
  );
};

export default Provider;
