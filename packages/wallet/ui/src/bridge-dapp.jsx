// @ts-check
import '@endo/eventual-send/shim';
import './lockdown.js';

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { maybeLoad, maybeSave, DAPPS_STORAGE_KEY } from './util/storage.js';

Error.stackTraceLimit = Infinity;

const BridgeProtocol = /** @type {const} */ ({
  loaded: 'agoric_walletBridgeLoaded',
  requestDappConnection: 'agoric_requestDappConnection',
  checkIfDappApproved: 'agoric_checkIfDappApproved',
  dappApprovalChanged: 'agoric_dappApprovalChanged',
  addOffer: 'agoric_addOffer',
});

/**
 * Sends a message to the dapp in the parent window.
 *
 * @param {*} payload
 */
const sendMessage = payload => window.parent.postMessage(payload, '*');

/**
 * Ensures this bridge is being loaded inside another window.
 */
const checkParentWindow = () => {
  const me = window;
  const { parent } = window;
  if (me === parent) {
    throw Error('window.parent === parent!!!');
  }
};

/**
 * Requests a dapp at a given origin to connect to the wallet UI. This will
 * prompt the user to accept the dapp in the wallet and allow it to propose
 * offers if accepted.
 *
 * @param {string} origin
 */
const requestDappConnection = origin => {
  /** @type {any[]} */
  const dapps = maybeLoad(DAPPS_STORAGE_KEY) ?? [];
  const dapp = dapps.find(d => d.origin === origin);
  if (dapp) {
    return;
  }
  dapps.push({ origin });
  maybeSave(DAPPS_STORAGE_KEY, dapps);
};

const watchDappApproval = (origin, latestValue) => {
  window.addEventListener('storage', ev => {
    if (ev.key === DAPPS_STORAGE_KEY) {
      const dapps = JSON.parse(ev.newValue ?? '') ?? [];
      const dapp = dapps.find(d => d.origin === origin);
      const isDappApproved = dapp && dapp.isApproved;
      if (isDappApproved !== latestValue) {
        sendMessage({
          type: BridgeProtocol.dappApprovalChanged,
          isDappApproved,
        });
        latestValue = isDappApproved;
      }
    }
  });
};

const checkIfDappApproved = origin => {
  const dapps = maybeLoad(DAPPS_STORAGE_KEY) ?? [];
  const dapp = dapps.find(d => d.origin === origin);
  const isDappApproved = dapp && dapp.isApproved;
  sendMessage({
    type: BridgeProtocol.checkIfDappApproved,
    isDappApproved,
  });
  watchDappApproval(origin, isDappApproved);
};

const handleIncomingMessages = () => {
  /** @type { string } */
  let origin;

  window.addEventListener('message', ev => {
    const type = ev.data?.type;
    if (!type?.startsWith('agoric_')) {
      return;
    }
    if (origin === undefined) {
      origin = ev.origin;
      console.log('bridge connected with dapp origin', origin);
    }

    switch (type) {
      case BridgeProtocol.requestDappConnection:
        requestDappConnection(ev.origin);
        break;
      case BridgeProtocol.checkIfDappApproved:
        checkIfDappApproved(ev.origin);
        break;
      default:
        break;
    }
  });
};

const connectDapp = async () => {
  checkParentWindow();
  handleIncomingMessages();
  sendMessage({
    type: BridgeProtocol.loaded,
  });
};

const Bridge = () => {
  useEffect(() => {
    const tryConnect = async () => {
      if ('requestStorageAccess' in document) {
        if (await document.hasStorageAccess()) {
          connectDapp();
        } else {
          throw new Error('wallet bridge could not connect to browser storage');
        }
      } else {
        connectDapp();
      }
    };
    tryConnect();
  }, []);

  return <></>;
};

ReactDOM.render(<Bridge />, document.getElementById('root'));
