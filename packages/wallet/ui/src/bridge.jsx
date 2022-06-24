// @ts-check
/* eslint-disable import/no-extraneous-dependencies */
import '@endo/eventual-send/shim';
import './lockdown.js';

import React from 'react';
import ReactDOM from 'react-dom';

import logo from './Agoric-logo-color.svg';

Error.stackTraceLimit = Infinity;

/** ISSUE: where are these defined? */
const BridgeProtocol = /** @type {const} */ ({
  loaded: 'walletBridgeLoaded',
  opened: 'walletBridgeOpened',
});

/**
 * Install a dApp "connection" where messages posted from
 * the dApp are forwarded to localStorage and vice versa.
 *
 * @param {{
 *   addEventListener: typeof window.addEventListener,
 *   parentPost: typeof window.postMessage,
 *   t0: number,
 * }} io
 */
const installDappConnection = ({ addEventListener, parentPost, t0 }) => {
  /** @type { string } */
  let origin;
  let setItem;
  const buffer = [];

  console.debug('bridge: installDappConnection', new Date(t0).toISOString());

  let outIx = 0; // TODO: persist index in storage
  const { stringify, parse } = JSON;
  /** @param {Record<string, any>} payload */
  const send = payload => {
    // console.debug('bridge: send', payload);
    setItem(stringify(['out', origin, t0, outIx]), stringify(payload));
    outIx += 1; // ISSUE: overflow?
  };

  addEventListener('message', ev => {
    // console.debug('bridge: handling message:', ev.data);
    if (
      !ev.data ||
      typeof ev.data.type !== 'string' ||
      !ev.data.type.startsWith('CTP_')
    ) {
      return;
    }

    if (origin === undefined) {
      // First-come, first-serve.
      // console.debug('bridge: setting origin to', origin);
      origin = ev.origin;
    }
    if (setItem) {
      console.debug('bridge: message from dapp->localStorage', origin, ev.data);
      send(ev.data);
    } else {
      buffer.push(ev.data);
      outIx += 1; // ISSUE: overflow?
    }
  });

  // ISSUE: this fires much earlier than expected.
  // addEventListener('beforeunload', () => {
  //   const bye = { type: 'CTP_DISCONNECT', reason: `bye from ${origin}` };
  //   parentPost(bye, '*');
  // });

  console.debug('bridge: Start the flow of messages.');
  parentPost({ type: BridgeProtocol.loaded }, '*');
  // ISSUE: wallet-bridge.html waits for the websocket side to open
  // before sending this, but if we wait for the storage side to open,
  // it doesn't seem to work.
  parentPost({ type: BridgeProtocol.opened }, '*');

  return {
    /** @param {typeof window.localStorage} storage */
    connectStorage: storage => {
      if (setItem) {
        return;
      }

      addEventListener('storage', ev => {
        // console.debug('from storage', origin, ev.key, ev.newValue);
        if (!ev.key || !ev.newValue) {
          return;
        }
        const [tag, targetOrigin, targetT, _keyIx] = JSON.parse(ev.key); // or throw
        if (tag !== 'in' || targetOrigin !== origin || targetT !== t0) {
          return;
        }
        const payload = parse(ev.newValue); // or throw
        storage.removeItem(ev.key);
        console.debug('bridge: storage -> message to dapp', origin, payload);
        parentPost(payload, '*');
      });
      setItem = (k, v) => storage.setItem(k, v);
      if (buffer.length) {
        console.debug('sending', buffer.length, 'queued messages from', origin);
      }
      while (buffer.length) {
        send(buffer.shift());
      }
    },
  };
};

const conn = installDappConnection({
  addEventListener: window.addEventListener,
  parentPost: (payload, origin) =>
    window.parent !== window
      ? window.parent.postMessage(payload, origin)
      : undefined,
  t0: Date.now(),
});

const signalWallet = () => {
  if ('requestStorageAccess' in document) {
    document
      .requestStorageAccess()
      .then(() => {
        console.debug('bridge: storage access granted');
        conn.connectStorage(window.localStorage);
      })
      .catch(whyNot =>
        console.error('bridge: requestStorageAccess rejected with', whyNot),
      );
  } else {
    console.debug('bridge: SKIP document.requestStorageAccess');
    conn.connectStorage(window.localStorage);
  }

  // TODO: get URL from local.agoric.com
  // use 'locating' protocol from packages/web-components/src/AgoricWalletConnection.js
  // onLocateMessage

  // ISSUE: is this causing the wallet bridge to reload???
  const walletAddress = 'http://localhost:8002/wallet/'; // ISSUE: how to get this???
  window.open(walletAddress, 'target_agoric_wallet');
};

// TODO: pulse as state
// TODO: logo centered; aspect ratio preserved; no iframe scrollbar
ReactDOM.render(
  <img
    className="pulse logo expand100"
    src={logo}
    onClick={signalWallet}
    alt="Agoric logo"
  />,
  document.getElementById('root'),
);
