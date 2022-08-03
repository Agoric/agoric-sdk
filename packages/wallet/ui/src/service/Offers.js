import { makeNotifierKit } from '@agoric/notifier';
import {
  loadOffers as load,
  removeOffer as remove,
  addOffer as add,
} from '../store/Offers.js';

export const getOfferService = (publicAddress, signSpendAction) => {
  const offers = new Map();
  const { notifier, updater } = makeNotifierKit();
  const broadcastUpdates = () => updater.updateState([...offers.values()]);

  const upsertOffer = offer => {
    offers.set(offer.id, offer);
    add(publicAddress, offer);
    broadcastUpdates();
  };

  const declineOffer = id => {
    offers.delete(id);
    remove(publicAddress, id);
    broadcastUpdates();
  };

  const acceptOffer = async id => {
    const offer = offers.get(id);
    assert(offer, `Tried to accept undefined offer ${id}`);
    const action = JSON.stringify({ type: 'acceptOffer', data: offer });
    await signSpendAction(action);
  };

  const cancelOffer = _id => {
    console.log('TODO: cancel offer');
  };

  const storedOffers = load(publicAddress);
  storedOffers.forEach(o => {
    offers.set(o.id, {
      ...o,
    });
  });
  broadcastUpdates();

  return {
    offers,
    notifier,
    addOffer: upsertOffer,
    acceptOffer,
    cancelOffer,
    declineOffer,
  };
};
