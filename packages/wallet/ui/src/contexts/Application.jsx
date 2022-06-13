/* eslint-disable react/display-name */
/* global process */
import { observeIterator } from '@agoric/notifier';
import { E } from '@endo/far';
import {
  useEffect,
  createContext,
  memo,
  useContext,
  useState,
  useReducer,
} from 'react';

export const ConnectionStatus = {
  Connected: 'connected',
  Connecting: 'connecting',
  Disconnected: 'disconnected',
  Error: 'error',
};

// TODO: Graduate to show mainnet in production.
const SHOW_MAINNET = process.env.NODE_ENV === 'development';
const localConnection =
  window && window.location.hostname !== 'localhost'
    ? { label: window.location.hostname, url: window.location.origin }
    : { label: 'Local Solo', url: 'http://localhost:8000' };
const stageConnections =
  process.env.NODE_ENV === 'development'
    ? [
        {
          label: 'Agoric Stage',
          url: 'https://stage.agoric.net/network-config',
        },
      ]
    : [];
const netConnections = SHOW_MAINNET
  ? [
      {
        label: 'Agoric Mainnet',
        url: 'https://main.agoric.net/network-config',
      },
      {
        label: 'Agoric Devnet',
        url: 'https://devnet.agoric.net/network-config',
      },
    ]
  : [];

export const DEFAULT_WALLET_CONNECTIONS = [
  localConnection,
  ...stageConnections,
  ...netConnections,
];

export const ApplicationContext = createContext();

export const DEFAULT_WALLET_CONNECTION = DEFAULT_WALLET_CONNECTIONS[0];

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

const buildWalletConnectionFromModule = ({ buildWalletConnection }) => {
  const WalletConnection = buildWalletConnection(withApplicationContext);
  return <WalletConnection />;
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
  const [backend, setBackend] = useState(null);
  const [schemaActions, setSchemaActions] = useState(null);
  const [useChainBackend, setUseChainBackend] = useState(false);
  const [wantConnection, setWantConnection] = useState(true);
  const [connectionComponent, setConnectionComponent] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(
    wantConnection ? 'connecting' : 'disconnected',
  );

  const RESTORED_WALLET_CONNECTIONS = [...DEFAULT_WALLET_CONNECTIONS];
  let restoredWalletConnection;
  if (window && window.localStorage) {
    try {
      const json = window.localStorage.getItem('userWalletConnections');
      if (json) {
        const userConnections = JSON.parse(json);
        RESTORED_WALLET_CONNECTIONS.unshift(...userConnections);
      }
    } catch (e) {
      console.error(e);
    }
    try {
      const json = window.localStorage.getItem('walletConnection');
      if (json) {
        restoredWalletConnection = JSON.parse(json);
      }
    } catch (e) {
      console.error(e);
    }
  }
  if (!restoredWalletConnection) {
    restoredWalletConnection = RESTORED_WALLET_CONNECTIONS[0];
  }

  const [walletConnection, setWalletConnection] = useState(
    restoredWalletConnection,
  );
  const [allWalletConnections, setAllWalletConnections] = useState(
    harden([...DEFAULT_WALLET_CONNECTIONS]),
  );

  useEffect(() => {
    if (!connectionComponent) {
      if (connectionState === 'error') {
        setConnectionStatus(ConnectionStatus.Error);
      } else {
        setConnectionStatus(ConnectionStatus.Disconnected);
      }
      return;
    }
    switch (connectionState) {
      case 'bridged': {
        setConnectionStatus(ConnectionStatus.Connected);
        break;
      }
      case 'disconnected': {
        setConnectionStatus(ConnectionStatus.Disconnected);
        break;
      }
      case 'connecting': {
        setConnectionStatus(ConnectionStatus.Connecting);
        break;
      }
      default:
    }
  }, [connectionState, connectionComponent]);

  useEffect(() => {
    if (window && window.localStorage) {
      window.localStorage.setItem(
        'walletConnection',
        JSON.stringify(walletConnection),
      );
    }
    const userConnections = [];
    for (const { url, label } of allWalletConnections) {
      const found = DEFAULT_WALLET_CONNECTIONS.find(
        ({ url: defaultUrl, label: defaultLabel }) =>
          url === defaultUrl && label === defaultLabel,
      );
      if (!found) {
        userConnections.push({ url, label });
      }
    }
    if (window && window.localStorage) {
      window.localStorage.setItem(
        'userWalletConnections',
        JSON.stringify(userConnections),
      );
    }
  }, [allWalletConnections, walletConnection]);

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

  // Resubscribe when a new backend is set.
  useEffect(() => {
    setSchemaActions(null);
    for (const setter of backendSetters.values()) {
      setter(null);
    }

    if (!backend) {
      return () => {};
    }

    let cancelIteration = null;
    const rethrowIfNotCancelled = e => {
      if (e !== cancelIteration) {
        throw e;
      }
    };
    setSchemaActions(E.get(backend).actions);
    for (const [prop, setter] of backendSetters.entries()) {
      const iterator = E.get(backend)[prop];
      observeIterator(iterator, {
        fail: rethrowIfNotCancelled,
        updateState: state => {
          if (cancelIteration) {
            throw cancelIteration;
          }
          setter(state);
        },
      }).catch(rethrowIfNotCancelled);
    }
    return () => {
      cancelIteration = Error('cancelled');
    };
  }, [backend]);

  const disconnect = wantReconnect => {
    setBackend(null);
    setConnectionComponent(null);
    setConnectionState('disconnected');
    if (typeof wantReconnect === 'boolean') {
      setWantConnection(wantReconnect);
    }
  };

  let attempts = 0;
  useEffect(() => {
    if (!walletConnection || !wantConnection) {
      disconnect();
      return () => {};
    }
    if (connectionComponent) {
      return () => {};
    }
    const { url } = walletConnection;
    const u = new URL(url);
    let outdated = false;

    let retryTimeout;
    const retry = async e => {
      if (outdated) {
        return;
      }
      console.error('Connection to', walletConnection, 'failed:', e);
      const backoff = Math.ceil(
        Math.min(Math.random() * 2 ** attempts * 1_000, 10_000),
      );
      console.log('Retrying connection after', backoff, 'ms...');
      await new Promise(
        resolve => (retryTimeout = setTimeout(resolve, backoff)),
      );
      if (outdated) {
        return;
      }
      // eslint-disable-next-line no-use-before-define
      connect().catch(retry);
    };

    let importer;
    const connect = async () => {
      const mod = await importer();
      if (outdated) {
        return;
      }
      const component = buildWalletConnectionFromModule(mod);
      setConnectionComponent(component);
      attempts = 0;
    };
    if (u.pathname.endsWith('/network-config')) {
      importer = () => import('../components/SmartWalletConnection');
    } else {
      importer = () => import('../components/WalletConnection');
    }
    connect().catch(retry);
    return () => {
      outdated = true;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [walletConnection, wantConnection, connectionComponent]);

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
    setWantConnection,
    wantConnection,
    walletConnection,
    setWalletConnection,
    allWalletConnections,
    setAllWalletConnections,
    connectionComponent,
    disconnect,
    connectionStatus,
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
