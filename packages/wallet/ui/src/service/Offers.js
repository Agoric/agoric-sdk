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
  OfferUIStatus,
} from '../store/Offers.js';

/** @typedef {import('@agoric/smart-wallet/src/types.js').Petname} Petname */

/** @typedef {import('@agoric/smart-wallet/src/offers.js').OfferStatus} OfferStatus */

/** @typedef {import('../store/Offers').Offer} Offer */

/**
 * @param {string} chainId
 * @param {string} address
 * @param {(data: string) => Promise<any>} signSpendAction
 * @param {Notifier<OfferStatus>} chainOffersNotifier
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

  const addSpendActionAndInstancePetname = async (
    /** @type {Map<Petname, Brand>} */ pursePetnameToBrand,
    /** @type {} */ offer,
  ) => {
    const {
      id,
      instanceHandle,
      publicInvitationMaker,
      proposalTemplate: { give, want },
    } = offer;

    const mapPursePetnamesToBrands = paymentProposals =>
      Object.fromEntries(
        Object.entries(paymentProposals).map(
          ([kw, { pursePetname, value }]) => {
            const brand = pursePetnameToBrand.get(pursePetname);
            if (!brand) {
              return [];
            }
            return [
              kw,
              {
                brand,
                value: BigInt(value),
              },
            ];
          },
        ),
      );

    const instance = await E(boardIdMarshaller).unserialize(instanceHandle);
    const {
      slots: [instanceBoardId],
    } = await E(boardIdMarshaller).serialize(instance);

    /** @type {import('@agoric/smart-wallet/src/offers.js').OfferSpec} */
    const offerForAction = {
      id,
      invitationSpec: {
        source: 'contract',
        instance,
        publicInvitationMaker,
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

  const upsertOffer = (/** @type {Offer} */ offer) => {
    offers.set(offer.id, offer);
    add(chainId, address, offer);
    broadcastUpdates();
  };

  const declineOffer = (/** @type {string} */ id) => {
    const offer = offers.get(id);
    assert(offer, `Tried to decline undefined offer ${id}`);
    upsertOffer({ ...offer, status: OfferUIStatus.declined });
    broadcastUpdates();
  };

  const acceptOffer = async (/** @type {string} */ id) => {
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
        if (status.error !== undefined) {
          offers.set(status.id, {
            ...oldOffer,
            id: status.id,
            status: OfferUIStatus.rejected,
            error: `${status.error}`,
          });
          remove(chainId, address, status.id);
        } else if (status.numWantsSatisfied !== undefined) {
          offers.set(status.id, {
            ...oldOffer,
            id: status.id,
            status: OfferUIStatus.accepted,
          });
          remove(chainId, address, status.id);
        } else if (status.numWantsSatisfied === undefined) {
          offers.set(status.id, {
            ...oldOffer,
            id: status.id,
            status: OfferUIStatus.pending,
          });
          upsertOffer({ ...oldOffer, status: OfferUIStatus.pending });
        }
        broadcastUpdates();
      }
    }
  };

  /**
   * Call once to load the offers from storage, watch storage and chain for new
   * offers.
   *
   * @param {Map<Petname, Brand>} pursePetnameToBrand
   */
  const start = pursePetnameToBrand => {
    const storedOffers = load(chainId, address);
    const storedOffersP = Promise.all(
      storedOffers.map(o => {
        if (o.status === OfferUIStatus.declined) {
          remove(chainId, address, o.id);
        }
        return addSpendActionAndInstancePetname(pursePetnameToBrand, o).then(
          ao => {
            offers.set(ao.id, {
              ...ao,
            });
          },
        );
      }),
    );
    storedOffersP.then(() => broadcastUpdates());

    watchChainOffers();

    watchOffers(chainId, address, newOffers => {
      const newOffersP = Promise.all(
        newOffers.map(o => {
          return addSpendActionAndInstancePetname(pursePetnameToBrand, o).then(
            ao => {
              const oldOffer = offers.get(ao.id);
              const status =
                oldOffer &&
                [OfferUIStatus.rejected, OfferUIStatus.accepted].includes(
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
