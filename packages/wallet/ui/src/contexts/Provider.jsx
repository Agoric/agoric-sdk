/* eslint-disable react/display-name */
import { observeIterator } from '@agoric/notifier';
import { E } from '@endo/far';
import { useEffect, useState, useReducer } from 'react';

import { ApplicationContext, ConnectionStatus } from './Application';

import { DEFAULT_WALLET_CONNECTIONS } from '../util/defaults';

const useDebugLogging = (state, watch) => {
  useEffect(() => console.log(state), watch);
};

/**
 * @param {string} key
 * @param {unknown} value
 */
const maybeSave = (key, value) => {
  if (window?.localStorage) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
};
const maybeLoad = key => {
  if (window?.localStorage) {
    try {
      const json = window.localStorage.getItem(key);
      if (json) {
        return JSON.parse(json);
      }
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }
  return undefined;
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
  const [backend, setBackend] = useState(null);
  const [schemaActions, setSchemaActions] = useState(null);
  const [useChainBackend, setUseChainBackend] = useState(false);
  const [wantConnection, setWantConnection] = useState(true);
  const [connectionComponent, setConnectionComponent] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(
    wantConnection
      ? ConnectionStatus.Connecting
      : ConnectionStatus.Disconnected,
  );
  const [backendErrorHandler, setBackendErrorHandler] = useState(null);

  const RESTORED_WALLET_CONNECTIONS = [...DEFAULT_WALLET_CONNECTIONS];
  const userConnections = maybeLoad('userWalletConnections');
  if (userConnections) {
    RESTORED_WALLET_CONNECTIONS.unshift(...userConnections);
  }

  const [walletConnection, setWalletConnection] = useState(
    maybeLoad('walletConnection') || null,
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
      case 'error': {
        setConnectionStatus(ConnectionStatus.Error);
        break;
      }
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
    const tryFetchAccessToken = () => {
      if (!walletConnection) {
        return;
      }

      // Fetch the access token from the window's URL.
      const accessTokenParams = `?${window.location.hash.slice(1)}`;
      const accessToken = new URLSearchParams(accessTokenParams).get(
        'accessToken',
      );
      console.log('have accesstoken', window.location.hash);
      if (!accessToken) {
        return;
      }

      setWalletConnection({ ...walletConnection, accessToken });

      // Now that we've captured it, clear out the access token from the URL bar.
      window.location.hash = '';
    };

    window.addEventListener('hashchange', tryFetchAccessToken);
    tryFetchAccessToken();
    return () => {
      window.removeEventListener('hashchange', tryFetchAccessToken);
    };
  }, [walletConnection]);

  useEffect(() => {
    if (!walletConnection) {
      return;
    }
    maybeSave('walletConnection', walletConnection);

    const isKnown = allWalletConnections.some(
      c => c.label === walletConnection.label && c.url === walletConnection.url,
    );
    if (!isKnown) {
      setAllWalletConnections(conns => [walletConnection, ...conns]);
    }

    const updatedUserConnections = [];
    for (const wc of allWalletConnections) {
      const found = DEFAULT_WALLET_CONNECTIONS.find(
        ({ url, label }) => wc.url === url && wc.label === label,
      );
      if (!found) {
        updatedUserConnections.push(wc);
      }
    }
    maybeSave('userWalletConnections', updatedUserConnections);
  }, [walletConnection]);

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
    const subscribeToBackend = async () => {
      const rethrowIfNotCancelled = e => {
        if (e !== cancelIteration) {
          if (backendErrorHandler) {
            backendErrorHandler(e);
            return;
          }
          throw e;
        }
      };
      setSchemaActions(E.get(backend).actions);
      for (const [prop, setter] of backendSetters.entries()) {
        const iterator = E.get(backend)[prop];
        observeIterator(iterator, {
          fail: e => {
            console.log('caught error', { prop }, e);
            rethrowIfNotCancelled(e);
            setter(null);
          },
          updateState: state => {
            if (cancelIteration) {
              throw cancelIteration;
            }
            setter(state);
          },
        }).catch(e => {
          console.log('caught error', { prop }, e);
          setter(null);
          rethrowIfNotCancelled(e);
        });
      }
    };
    subscribeToBackend().catch(e => {
      if (backendErrorHandler) {
        return backendErrorHandler(e);
      }
      throw e;
    });
    return () => {
      cancelIteration = Error('cancelled');
    };
  }, [backend, backendErrorHandler]);

  const disconnect = wantReconnect => {
    setBackend(null);
    setBackendErrorHandler(null);
    setConnectionComponent(null);
    setConnectionState('disconnected');
    setConnectionStatus(
      wantReconnect
        ? ConnectionStatus.Connecting
        : ConnectionStatus.Disconnected,
    );
    if (typeof wantReconnect === 'boolean') {
      setWantConnection(wantReconnect);
    }
  };

  let attempts = 0;
  useEffect(() => {
    if (!wantConnection) {
      disconnect();
    }
    if (!walletConnection || !wantConnection) {
      return () => {};
    }
    if (connectionComponent) {
      return () => {};
    }
    let u;
    try {
      const { url } = walletConnection;
      u = new URL(url);
    } catch (e) {
      alert(
        `Invalid wallet connection URL: ${
          walletConnection && walletConnection.url
        }`,
      );
      setWalletConnection(DEFAULT_WALLET_CONNECTIONS[0]);
      return () => {};
    }
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
      const WalletConnection = mod.default;
      setConnectionComponent(<WalletConnection />);
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
    connectionComponent,
    disconnect,
    connectionStatus,
    backendErrorHandler,
    setBackendErrorHandler,
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
