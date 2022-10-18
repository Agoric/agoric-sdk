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

export const OfferStatus = {
  proposed: 'proposed',
  accepted: 'accept',
  rejected: 'rejected',
  pending: 'pending',
  declined: 'decline',
};

/**
 * @param {string} chainId
 * @param {string} address
 * @param {(data: string) => Promise<any>} signSpendAction
 * @param {Notifier<any>} chainOffersNotifier
 * @param {Marshaller} boardIdMarshaller
 */
export const getOfferService = (
  chainId,
  address,
  signSpendAction,
  chainOffersNotifier,
  boardIdMarshaller,
) => {
  const offers = new Map();
  const { notifier, updater } = makeNotifierKit();
  const broadcastUpdates = () => updater.updateState([...offers.values()]);

  const unserializeAndAddSpendAction = async (pursePetnameToBrand, offer) => {
    const {
      id,
      instanceHandleBoardId,
      invitationMaker: { method },
      proposalTemplate: { give, want },
    } = offer;

    const mapPursePetnamesToBrands = entries =>
      Object.fromEntries(
        Object.entries(entries).map(([kw, { pursePetname, value }]) => [
          kw,
          {
            brand: pursePetnameToBrand.get(pursePetname),
            value: BigInt(value),
          },
        ]),
      );

    const instance = await E(boardIdMarshaller).unserialize(
      instanceHandleBoardId,
    );
    const {
      slots: [instanceBoardId],
    } = await E(boardIdMarshaller).serialize(instance);

    const offerForAction = {
      id,
      invitationSpec: {
        source: 'contract',
        instance,
        publicInvitationMaker: method,
      },
      proposal: {
        give: mapPursePetnamesToBrands(give),
        want: mapPursePetnamesToBrands(want),
      },
    };

    const spendAction = await E(boardIdMarshaller).serialize(
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
            status: OfferStatus.rejected,
            error: `${status.error}`,
          });
          remove(chainId, address, status.id);
        } else if ('numWantsSatisfied' in status) {
          offers.set(status.id, {
            ...oldOffer,
            id: status.id,
            status: OfferStatus.accepted,
          });
          remove(chainId, address, status.id);
        } else if (!('numWantsSatisfied' in status)) {
          offers.set(status.id, {
            ...oldOffer,
            id: status.id,
            status: OfferStatus.pending,
          });
          upsertOffer({ ...oldOffer, status: OfferStatus.pending });
        }
        broadcastUpdates();
      }
    }
  };

  const start = pursePetnameToBrand => {
    const storedOffers = load(chainId, address);
    const storedOffersP = Promise.all(
      storedOffers.map(o => {
        if (o.status === OfferStatus.declined) {
          remove(chainId, address, o.id);
        }
        return unserializeAndAddSpendAction(pursePetnameToBrand, o).then(ao => {
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
          return unserializeAndAddSpendAction(pursePetnameToBrand, o).then(
            ao => {
              const oldOffer = offers.get(ao.id);
              const status =
                oldOffer &&
                [OfferStatus.rejected, OfferStatus.accepted].includes(
                  oldOffer.status,
                )
                  ? oldOffer.status
                  : ao.status;
              offers.set(ao.id, {
                ...ao,
                status,
              });
            },
          );
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
