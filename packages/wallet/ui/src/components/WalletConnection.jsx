// @ts-check
/* eslint-disable no-underscore-dangle */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable react/display-name */
import { makeReactAgoricWalletConnection } from '@agoric/wallet-connection/react.js';
import React, { useState, useEffect } from 'react';
import { E } from '@endo/eventual-send';
import { makeCapTP } from '@endo/captp';
import { observeIterator } from '@agoric/notifier';
import { makeStyles } from '@mui/styles';

import { withApplicationContext } from '../contexts/Application.jsx';
import { makeBackendFromWalletBridge } from '../util/WalletBackendAdapter.js';
import { makeFixedWebSocketConnector } from '../util/fixed-websocket-connector.js';

const useStyles = makeStyles(_ => ({
  hidden: {
    display: 'none',
  },
}));

// Create a wrapper for agoric-wallet-connection that is specific to
// the app's instance of React.
const AgoricWalletConnection = makeReactAgoricWalletConnection(React);

const getAccessToken = () => {
  // Fetch the access token from the window's URL.
  let accessTokenParams = `?${window.location.hash.slice(1)}`;
  let accessToken = new URLSearchParams(accessTokenParams).get('accessToken');

  try {
    if (accessToken) {
      // Store the access token for later use.
      window.localStorage.setItem('accessTokenParams', accessTokenParams);
    } else {
      // Try reviving it from localStorage.
      accessTokenParams =
        window.localStorage.getItem('accessTokenParams') || '?';
      accessToken = new URLSearchParams(accessTokenParams).get('accessToken');
    }
  } catch (e) {
    console.log('Error fetching accessTokenParams', e);
  }

  // Now that we've captured it, clear out the access token from the URL bar.
  window.location.hash = '';

  window.addEventListener('hashchange', _ev => {
    // See if we should update the access token params.
    const atp = `?${window.location.hash.slice(1)}`;
    const at = new URLSearchParams(atp).get('accessToken');

    if (at) {
      // We have new params, so replace them.
      accessTokenParams = atp;
      accessToken = at;
      localStorage.setItem('accessTokenParams', accessTokenParams);
    }

    // Keep it clear.
    window.location.hash = '';
  });

  return accessToken;
};

/** @param {string} key */
const parseKey = key => {
  let parts;
  try {
    parts = JSON.parse(key);
  } catch (_err) {
    return undefined;
  }
  if (!Array.isArray(parts)) {
    return undefined;
  }
  const [tag, origin, epoch, seq] = parts;
  if (tag !== 'out') {
    return undefined;
  }
  return { tag, origin, epoch, seq };
};

/** @param {Window['localStorage']} storage */
const getPending = storage => {
  const pending = [];
  /** @type {Map<string, number>} */
  const latest = new Map(); // latest epoch by origin

  for (let ix = 0; ix <= storage.length; ix += 1) {
    const key = storage.key(ix) || assert.fail();
    const keyParts = parseKey(key);
    if (!keyParts) {
      // eslint-disable-next-line no-continue
      continue;
    }
    const { epoch, origin, seq } = keyParts;
    if (epoch > latest.has(origin) ? latest.get(origin) : 0) {
      latest.set(origin, epoch);
    }
    const value = storage.getItem(key);
    pending.push({ key, origin, epoch, seq, value });
  }

  /** @type {string[]} */
  const old = [];
  const current = pending.filter(item => {
    if (item.epoch === latest.get(item.origin)) {
      return true;
    }
    old.push(item.key);
    return false;
  });

  // eslint-disable-next-line no-nested-ternary
  current.sort((a, b) => (a.seq === b.seq ? 0 : a.seq < b.seq ? -1 : 1));

  return { current, old };
};

const WalletConnection = ({
  setBackend,
  setConnectionState,
  disconnect,
  walletConnection,
}) => {
  const classes = useStyles();
  /**
   * ISSUE: where to get the full types for these?
   *
   * @typedef {{
   *   getAdminBootstrap: (string, unknown) => WalletBridge
   * }} WalletConnection
   * @typedef {{
   *   getScopedBridge: (o: unknown) => unknown
   * }} WalletBridge
   */
  const [wc, setWC] = useState(/** @type {WalletConnection|null} */ (null));

  let cancelled = null;
  const onWalletState = ev => {
    if (cancelled) {
      return;
    }
    const { walletConnection: newWC, state } = ev.detail;
    setConnectionState(state);
    if (!wc) {
      setWC(newWC);
    }
  };

  useEffect(() => {
    if (!wc) {
      return () => {};
    }
    const bridge = E(wc).getAdminBootstrap(
      getAccessToken(),
      makeFixedWebSocketConnector(walletConnection),
    );

    const { backendIt, cancel } = makeBackendFromWalletBridge(bridge);
    const rethrowIfNotCancelled = e => {
      if (!cancelled) {
        throw e;
      }
    };

    observeIterator(backendIt, {
      updateState: be => {
        if (cancelled) {
          throw Error('cancelled');
        }
        setBackend(be);
      },
    }).catch(rethrowIfNotCancelled);

    /** @type {Map<string,[ReturnType<typeof makeCapTP>, number]>} */
    const dappToConn = new Map();
    const {
      localStorage: storage,
      addEventListener,
      removeEventListener,
    } = window; // WARNING: ambient

    function handleStorageMessage(key, newValue) {
      const keyParts = parseKey(key);
      if (!keyParts) {
        return;
      }
      const { origin, epoch } = keyParts;
      const payload = JSON.parse(newValue);
      if (!payload || typeof payload.type !== 'string') {
        return;
      }

      // console.debug('handleStorageMessage', payload);
      const obj = {
        ...payload,
        dappOrigin: origin,
      };
      const dappKey = JSON.stringify([origin, epoch]);
      /** @type {ReturnType<typeof makeCapTP>}  */
      let conn;
      /** @type {number} */
      let ix;
      if (dappToConn.has(dappKey)) {
        [conn, ix] = dappToConn.get(dappKey) || assert.fail();
      } else {
        /** @param {unknown} payloadOut */
        const send = payloadOut => {
          console.debug('WalletConnect: message -> storage', payloadOut);
          storage.setItem(
            JSON.stringify(['in', origin, epoch, ix]),
            JSON.stringify(payloadOut),
          );
          ix += 1; // ISSUE: overflow?
        };

        const makeBoot = () => E(bridge).getScopedBridge(origin);
        // console.debug('new capTP connection', { origin, epoch });
        conn = makeCapTP(`from ${origin} at ${epoch}`, send, makeBoot);
        ix = 0;
      }
      dappToConn.set(dappKey, [conn, ix + 1]);
      console.debug('WalletConnect: storage -> dispatch', obj);
      conn.dispatch(obj);
      storage.removeItem(key);
    }

    const { current, old } = getPending(storage);
    old.forEach(key => storage.removeItem(key));
    current.forEach(({ key, value }) => handleStorageMessage(key, value));

    addEventListener('storage', ev => {
      const { key, newValue } = ev;
      // removeItem causes an event where newValue is null
      if (key && newValue) {
        handleStorageMessage(key, newValue);
      }
    });

    return () => {
      cancelled = true;
      removeEventListener('storage', handleStorageMessage);
      for (const [conn, _ix] of dappToConn.values()) {
        // @ts-expect-error capTP abort has wrong type?
        conn.abort(Error('wallet connection cancelled'));
      }
      disconnect();
      cancel();
    };
  }, [wc]);

  return (
    <AgoricWalletConnection
      onState={onWalletState}
      className={classes.hidden}
    />
  );
};

export default withApplicationContext(WalletConnection, context => ({
  setConnectionState: context.setConnectionState,
  disconnect: context.disconnect,
  setBackend: context.setBackend,
  walletConnection: context.walletConnection,
}));
