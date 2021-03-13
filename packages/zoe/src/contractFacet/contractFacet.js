import { E } from '@agoric/eventual-send';
import { makeWeakStore as nonVOMakeWeakStore } from '@agoric/store';
import { Far } from '@agoric/marshal';

import { evalContractBundle } from './evalContractCode';
import { makeHandle } from '../makeHandle';

export function buildRootObject(_powers, _params) {
  const executeContract = async (bundle, zoeInstanceAdmin) => {
    const invitationHandleToHandler = nonVOMakeWeakStore('invitationHandle');

    const makeInvitation = offerHandler => {
      const invitationHandle = makeHandle('Invitation');
      invitationHandleToHandler.init(invitationHandle, offerHandler);
      return E(zoeInstanceAdmin).makeInvitation(invitationHandle);
    };

    const zcf = Far('zcf', {
      makeInvitation,
    });

    const callOfferHandler = invitationHandle => {
      const offerHandler = invitationHandleToHandler.get(invitationHandle);
      return E(offerHandler)();
    };

    const callOfferHandlerObj = Far('callOfferHandlerObj', {
      callOfferHandler,
    });

    const contractCode = evalContractBundle(bundle);

    const result = E(contractCode)
      .start(zcf)
      .then(({ publicFacet, creatorInvitation }) => {
        return harden({
          publicFacet,
          creatorInvitation,
          callOfferHandlerObj,
        });
      });

    return result;
  };

  return Far('executeContract', { executeContract });
}

harden(buildRootObject);
