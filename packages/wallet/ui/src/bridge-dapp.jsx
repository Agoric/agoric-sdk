// @ts-check
import '@endo/eventual-send/shim';
import './lockdown.js';

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { BridgeProtocol } from '@agoric/web-components';
import { addOffer } from './store/Offers.js';
import { loadDapp, upsertDapp, watchDapps } from './store/Dapps.js';
import { OfferStatus } from './service/Offers';

Error.stackTraceLimit = Infinity;

/**
 * @typedef {{ origin: string, chainId: string, address: string }} DappId
 */

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
 * @param {DappId} id
 * @param {string} proposedPetname
 */
const requestDappConnection = (
  { origin, chainId, address },
  proposedPetname,
) => {
  const dapp = loadDapp(chainId, address, origin);
  if (dapp) {
    return;
  }
  upsertDapp(chainId, address, { origin, petname: proposedPetname });
};

/**
 * Watches for changes in local storage to the dapp's approval status and
 * notifies the dapp.
 *
 * @param {DappId} id
 * @param {boolean} currentlyApproved
 */
const watchDappApproval = ({ origin, chainId, address }, currentlyApproved) => {
  watchDapps(chainId, address, dapps => {
    const dapp = dapps.find(d => d.origin === origin);
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

/**
 * Propose an offer from the dapp to the wallet UI.
 *
 * @param {DappId} id
 * @param {any} config // TODO better type for this.
 */
const createAndAddOffer = ({ origin, chainId, address }, config) => {
  const dapp = loadDapp(chainId, address, origin);
  const isDappApproved = dapp && dapp.isEnabled;
  if (!isDappApproved) return;

  const currentTime = new Date().getTime();
  // TODO: Will these ever collide? Do we need more randomness?
  const id = currentTime;

  const offer = {
    id,
    instancePetname: `instance@${config.instanceHandleBoardId}`,
    requestContext: { origin },
    meta: {
      id,
      creationStamp: currentTime,
    },
    status: OfferStatus.proposed,
    ...config,
  };
  addOffer(chainId, address, offer);
};

/**
 * Notifies the dapp about whether it's approved or not and watches for changes
 * to its approval status.
 *
 * @param {DappId} id
 */
const checkAndWatchDappApproval = ({ origin, chainId, address }) => {
  // Dapps are keyed by origin. A dapp is basically an origin with a petname
  // and an approval status.
  const dapp = loadDapp(chainId, address, origin);
  const isDappApproved = dapp && dapp.isEnabled;
  sendMessage({
    type: BridgeProtocol.checkIfDappApproved,
    isDappApproved,
  });
  watchDappApproval({ origin, chainId, address }, isDappApproved);
};

const handleIncomingMessages = () => {
  /** @type { string } */
  let origin;
  /** @type { string } */
  let address;
  /** @type { string } */
  let chainId;

  window.addEventListener('message', ev => {
    const type = ev.data?.type;
    if (!type?.startsWith(BridgeProtocol.prefix)) {
      return;
    }
    if (origin === undefined) {
      origin = ev.origin;
      address = ev.data?.address;
      chainId = ev.data?.chainId;
      assert.string(
        address,
        'First message from dapp should include an address',
      );
      assert.string(
        chainId,
        'First message from dapp should include a chainId',
      );
      console.debug('bridge connected with dapp origin', origin);
    }

    switch (type) {
      case BridgeProtocol.requestDappConnection:
        requestDappConnection({ origin, chainId, address }, ev.data?.petname);
        break;
      case BridgeProtocol.checkIfDappApproved:
        checkAndWatchDappApproval({ origin, chainId, address });
        break;
      case BridgeProtocol.addOffer:
        createAndAddOffer({ origin, chainId, address }, ev.data?.offerConfig);
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
