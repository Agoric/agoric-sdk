import { assert, details as X } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { makeWeakStore } from '@agoric/store';
import { Far, Data } from '@agoric/marshal';

import { evalContractBundle } from './evalContractCode';
import { makeHandle } from '../makeHandle';

export function buildRootObject(_powers, _params) {
  const executeContract = async (bundle, zoeInstanceAdmin) => {
    const invitationHandleToHandler = makeWeakStore('invitationHandle');

    const zcfSeatToSeatHandle = makeWeakStore('zcfSeat');

    const zcf = Far('zcf', {
      makeInvitation: (
        offerHandler = () => {},
        description,
        customProperties = Data({}),
      ) => {
        assert.typeof(
          description,
          'string',
          X`invitations must have a description string: ${description}`,
        );

        const invitationHandle = makeHandle('Invitation');
        invitationHandleToHandler.init(invitationHandle, offerHandler);
        /** @type {Promise<Payment>} */
        const invitationP = E(zoeInstanceAdmin).makeInvitation(
          invitationHandle,
          description,
          customProperties,
        );
        return invitationP;
      },
    });

    const addSeatObj = Far('addSeatObj', {
      addSeat: (invitationHandle, zoeSeatAdmin, seatHandle) => {
        const zcfSeat = Far('zcfSeat', {
          exit: completion => {
            E(zoeSeatAdmin).exit(completion);
          },
        });
        zcfSeatToSeatHandle.init(zcfSeat, seatHandle);
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
          creatorFacet = Far('emptyCreatorFacet', {}),
          publicFacet = Far('emptyPublicFacet', {}),
          creatorInvitation = undefined,
        }) => {
          return harden({
            creatorFacet,
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
