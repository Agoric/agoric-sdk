// @ts-check
/* eslint-disable import/no-extraneous-dependencies */
import '@endo/eventual-send/shim';
import './lockdown.js';

import React from 'react';
import ReactDOM from 'react-dom';

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
 *   storage: typeof window.localStorage,
 *   parentPost: typeof window.postMessage,
 *   t0: number,
 * }} io
 */
const installDappConnection = async ({
  addEventListener,
  parentPost,
  storage,
  t0,
}) => {
  /** @type { string } */
  let origin;

  console.debug('bridge: installDappConnection');

  parentPost({ type: BridgeProtocol.loaded }, '*');
  parentPost({ type: BridgeProtocol.opened }, '*');

  let outIx = 0; // TODO: persist index in storage
  /** @param {Record<string, any>} payload */

  const { stringify, parse } = JSON;

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
    console.debug('bridge: message from dapp->localStorage', origin, ev.data);
    storage.setItem(stringify(['out', origin, t0, outIx]), stringify(ev.data));
    outIx += 1; // ISSUE: overflow?
  });

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
};

// const sameParent = () => {
//   const me = window;
//   const { parent } = window;
//   if (me === parent) {
//     // eslint-disable-next-line no-debugger
//     debugger;
//     throw Error('window.parent === parent!!!');
//   }
//   return false;
// };

installDappConnection({
  addEventListener: window.addEventListener,
  parentPost: (payload, origin) => window.parent.postMessage(payload, origin),
  storage: window.localStorage,
  t0: Date.now(),
});

ReactDOM.render(
  <button id="signalBridge">Signal Bridge</button>,
  document.getElementById('root'),
);
