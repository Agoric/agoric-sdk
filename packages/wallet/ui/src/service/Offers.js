import {
  makeNotifierKit,
  makeAsyncIterableFromNotifier,
} from '@agoric/notifier';
import {
  loadOffers as load,
  removeOffer as remove,
  addOffer as add,
} from '../store/Offers.js';

/**
 * @param {string} publicAddress
 * @param {(data: string) => Promise<any>} signSpendAction
 * @param {Notifier<any>} chainOffersNotifier
 */
export const getOfferService = (
  publicAddress,
  signSpendAction,
  chainOffersNotifier,
) => {
  const offers = new Map();
  let chainOffers = [];
  const { notifier, updater } = makeNotifierKit();
  const broadcastUpdates = () =>
    updater.updateState([...offers.values(), ...chainOffers]);

  const upsertOffer = offer => {
    offers.set(offer.id, offer);
    add(publicAddress, offer);
    broadcastUpdates();
  };

  const declineOffer = id => {
    const offer = offers.get(id);
    assert(offer, `Tried to decline undefined offer ${id}`);
    upsertOffer({ ...offer, status: 'decline' });
    broadcastUpdates();
  };

  const acceptOffer = async id => {
    const offer = offers.get(id);
    assert(offer, `Tried to accept undefined offer ${id}`);
    const action = offer.spendAction;
    return signSpendAction(action);
  };

  const cancelOffer = _id => {
    console.log('TODO: cancel offer');
  };

  const storedOffers = load(publicAddress);
  storedOffers.forEach(o => {
    if (o.status === 'decline') {
      remove(publicAddress, o.id);
    }
    offers.set(o.id, {
      ...o,
    });
  });
  broadcastUpdates();

  const watchChainOffers = async () => {
    for await (const state of makeAsyncIterableFromNotifier(
      chainOffersNotifier,
    )) {
      state?.forEach(offer => {
        const splitId = offer.id.split('#');
        const rawId = splitId[splitId.length - 1];
        if (offers.has(rawId)) {
          offers.delete(rawId);
          remove(publicAddress, rawId);
        }
        chainOffers = state;
        broadcastUpdates();
      });
    }
  };
  watchChainOffers();

  return {
    offers,
    notifier,
    addOffer: upsertOffer,
    acceptOffer,
    cancelOffer,
    declineOffer,
  };
};
