import { E } from '@agoric/eventual-send';
import { makeWeakStore as nonVOMakeWeakStore } from '@agoric/store';
import { Far } from '@agoric/marshal';

import { evalContractBundle } from './evalContractCode';
import { makeHandle } from '../makeHandle';

export function buildRootObject(_powers, _params) {
  const executeContract = async (bundle, zoeInstanceAdmin) => {
    const invitationHandleToHandler = nonVOMakeWeakStore('invitationHandle');

    const zcf = Far('zcf', {
      makeInvitation: (offerHandler = () => {}, description) => {
        const invitationHandle = makeHandle('Invitation');
        invitationHandleToHandler.init(invitationHandle, offerHandler);

        const invitationP = E(zoeInstanceAdmin).makeInvitation(
          invitationHandle,
          description,
        );
        return invitationP;
      },
    });

    const addSeatObj = Far('addSeatObj', {
      addSeat: invitationHandle => {
        const zcfSeat = Far('zcfSeat', {
          exit: () => {},
        });
        const offerHandler = invitationHandleToHandler.get(invitationHandle);
        const offerResultP = E(offerHandler)(zcfSeat).catch(reason => {
          throw zcfSeat.fail(reason);
        });
        const exitObj = Far('exitObj', {
          exit: () => {
            throw new Error(
              `Only seats with the exit rule "onDemand" can exit at will`,
            );
          },
        });

        return harden({ offerResultP, exitObj });
      },
    });

    const contractCode = evalContractBundle(bundle);

    contractCode.catch(() => {});

    const result = E(contractCode)
      .start(zcf)
      .then(
        ({
          publicFacet = Far('emptyPublicFacet', {}),
          creatorInvitation = undefined,
        }) => {
          return harden({
            publicFacet,
            creatorInvitation,
            addSeatObj,
          });
        },
      );

    result.catch(() => {});
    return result;
  };

  return Far('executeContract', { executeContract });
}

harden(buildRootObject);
