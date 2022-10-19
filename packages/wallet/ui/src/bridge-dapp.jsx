// @ts-check
import '@endo/eventual-send/shim';
import './lockdown.js';

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { BridgeProtocol } from '@agoric/web-components';
import { addOffer, OfferUIStatus } from './store/Offers.js';
import { loadDapp, upsertDapp, watchDapps } from './store/Dapps.js';

/** @typedef {import('./store/Dapps').DappKey} DappKey */

Error.stackTraceLimit = Infinity;

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
 * @param {DappKey} dappKey
 * @param {string} proposedPetname - The suggested petname if the wallet does
 * not already know about the dapp.
 */
const requestDappConnection = (dappKey, proposedPetname) => {
  const dapp = loadDapp(dappKey);
  if (dapp) {
    return;
  }
  upsertDapp(dappKey.chainId, dappKey.address, {
    origin: dappKey.origin,
    petname: proposedPetname,
  });
};

/**
 * Watches for changes in local storage to the dapp's approval status and
 * notifies the dapp.
 *
 * @param {DappKey} dappKey
 * @param {boolean} currentlyApproved
 */
const watchDappApproval = (dappKey, currentlyApproved) => {
  watchDapps(dappKey.chainId, dappKey.address, dapps => {
    const dapp = dapps.find(d => d.origin === dappKey.origin);
    const isDappApproved = dapp && dapp.isEnabled;
    if (isDappApproved !== currentlyApproved) {
      sendMessage({
        type: BridgeProtocol.dappApprovalChanged,
        isDappApproved,
      });
      currentlyApproved = isDappApproved;
    }
  });
};

/** @typedef {import('@agoric/web-components/src/dapp-wallet-bridge/DappWalletBridge').OfferConfig} OfferConfig */
/**
 * Propose an offer from the dapp to the wallet UI.
 *
 * @param {DappKey} dappKey
 * @param {OfferConfig} offerConfig
 */
const createAndAddOffer = (dappKey, offerConfig) => {
  const dapp = loadDapp(dappKey);
  const isDappApproved = !!dapp?.isEnabled;
  if (!isDappApproved) return;

  const currentTime = new Date().getTime();
  // TODO: Will these ever collide? Do we need more randomness?
  const id = currentTime;

  const offer = {
    id,
    meta: {
      id,
      creationStamp: currentTime,
    },
    requestContext: { origin: dappKey.origin },
    status: OfferUIStatus.proposed,
    ...offerConfig,
  };
  addOffer(dappKey.chainId, dappKey.address, offer);
};

/**
 * Notifies the dapp about whether it's approved or not and watches for changes
 * to its approval status.
 *
 * @param {DappKey} dappKey
 */
const checkAndWatchDappApproval = dappKey => {
  // Dapps are keyed by origin. A dapp is basically an origin with a petname
  // and an approval status.
  const dapp = loadDapp(dappKey);
  const isDappApproved = !!dapp?.isEnabled;
  sendMessage({
    type: BridgeProtocol.checkIfDappApproved,
    isDappApproved,
  });
  watchDappApproval(dappKey, isDappApproved);
};

const handleIncomingMessages = () => {
  /** @type {DappKey=} */
  let dappKey;

  window.addEventListener('message', ev => {
    const type = ev.data?.type;
    if (!type?.startsWith(BridgeProtocol.prefix)) {
      return;
    }
    if (dappKey === undefined) {
      const origin = ev.origin;
      const chainId = ev.data?.chainId;
      const address = ev.data?.address;
      assert.string(
        address,
        'First message from dapp should include an address',
      );
      assert.string(
        chainId,
        'First message from dapp should include a chainId',
      );
      dappKey = { origin, chainId, address };
      console.debug('bridge connected with dapp', dappKey);
    }

    switch (type) {
      case BridgeProtocol.requestDappConnection:
        requestDappConnection(dappKey, ev.data?.petname);
        break;
      case BridgeProtocol.checkIfDappApproved:
        checkAndWatchDappApproval(dappKey);
        break;
      case BridgeProtocol.addOffer:
        createAndAddOffer(dappKey, ev.data?.offerConfig);
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
