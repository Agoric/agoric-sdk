// @ts-check

import {
  makeNotifierKit,
  makeAsyncIterableFromNotifier,
} from '@agoric/notifier';
import { E } from '@endo/eventual-send';

import {
  loadOffers as load,
  removeOffer as remove,
  addOffer as add,
  watchOffers,
} from '../store/Offers.js';

/** @typedef {import('@agoric/smart-wallet/src/types.js').Petname} Petname */

/**
 * @param {string} chainId
 * @param {string} address
 * @param {(data: string) => Promise<any>} signSpendAction
 * @param {Notifier<any>} chainOffersNotifier
 * @param {Marshaller} marshaller
 */
export const getOfferService = (
  chainId,
  address,
  signSpendAction,
  chainOffersNotifier,
  marshaller,
) => {
  let pursePetnameToBrand;
  const offers = new Map();
  const { notifier, updater } = makeNotifierKit();
  const broadcastUpdates = () => updater.updateState([...offers.values()]);

  const augmentOffer = async offer => {
    const {
      id,
      instanceHandleBoardId,
      invitationMaker: { method },
      proposalTemplate: { give, want },
    } = offer;

    const mapPurses = obj =>
      Object.fromEntries(
        Object.entries(obj).map(([kw, { pursePetname, value }]) => [
          kw,
          {
            brand: pursePetnameToBrand.get(pursePetname),
            value: BigInt(value),
          },
        ]),
      );

    const instance = await E(marshaller).unserialize(instanceHandleBoardId);
    const {
      slots: [instanceBoardId],
    } = await E(marshaller).serialize(instance);

    const offerForAction = {
      id,
      invitationSpec: {
        source: 'contract',
        instance,
        publicInvitationMaker: method,
      },
      proposal: {
        give: mapPurses(give),
        want: mapPurses(want),
      },
    };

    const spendAction = await E(marshaller).serialize(
      harden({
        method: 'executeOffer',
        offer: offerForAction,
      }),
    );

    return {
      ...offer,
      instancePetname: `instance@${instanceBoardId}`,
      spendAction: JSON.stringify(spendAction),
    };
  };

  const upsertOffer = offer => {
    offers.set(offer.id, offer);
    add(chainId, address, { ...offer, spendAction: undefined });
    broadcastUpdates();
  };

  const declineOffer = (/** @type {string} */ id) => {
    const offer = offers.get(id);
    assert(offer, `Tried to decline undefined offer ${id}`);
    upsertOffer({ ...offer, status: 'decline' });
    broadcastUpdates();
  };

  const acceptOffer = async id => {
    const offer = offers.get(id);
    assert(offer, `Tried to accept undefined offer ${id}`);
    return signSpendAction(offer.spendAction);
  };

  const cancelOffer = _id => {
    console.log('TODO: cancel offer');
  };

  const watchChainOffers = async () => {
    for await (const status of makeAsyncIterableFromNotifier(
      chainOffersNotifier,
    )) {
      console.log('offerStatus', { status, offers });
      const oldOffer = offers.get(status?.id);
      if (!oldOffer) {
        console.warn('Update for unknown offer, doing nothing.');
      } else {
        if ('error' in status) {
          offers.set(status.id, {
            ...oldOffer,
            id: status.id,
            status: 'rejected',
            error: `${status.error}`,
          });
          remove(chainId, address, status.id);
        } else if (
          oldOffer.status !== 'accept' &&
          'numWantsSatisfied' in status
        ) {
          offers.set(status.id, {
            ...oldOffer,
            id: status.id,
            status: 'accept',
          });
          remove(chainId, address, status.id);
        } else if (!('numWantsSatisfied' in status)) {
          offers.set(status.id, {
            ...oldOffer,
            id: status.id,
            status: 'pending',
          });
          upsertOffer({ ...oldOffer, status: 'pending' });
        }
        broadcastUpdates();
      }
    }
  };

  const start = purseMap => {
    pursePetnameToBrand = purseMap;
    const storedOffers = load(chainId, address);
    const storedOffersP = Promise.all(
      storedOffers.map(o => {
        if (o.status === 'decline') {
          remove(chainId, address, o.id);
        }
        return augmentOffer(o).then(ao => {
          offers.set(ao.id, {
            ...ao,
          });
        });
      }),
    );
    storedOffersP.then(() => broadcastUpdates());

    watchChainOffers();

    watchOffers(chainId, address, newOffers => {
      const newOffersP = Promise.all(
        newOffers.map(o => {
          return augmentOffer(o).then(ao => {
            offers.set(ao.id, {
              ...ao,
            });
          });
        }),
      );
      newOffersP.then(() => broadcastUpdates());
    });
  };

  return {
    start,
    offers,
    notifier,
    addOffer: upsertOffer,
    acceptOffer,
    cancelOffer,
    declineOffer,
  };
};
