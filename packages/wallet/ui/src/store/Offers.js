import { maybeLoad, maybeSave } from '../util/storage.js';

const OFFERS_KEY_PREFIX = 'OFFERS';

export const loadOffers = publicAddress =>
  maybeLoad([OFFERS_KEY_PREFIX, publicAddress]) ?? [];

export const addOffer = (publicAddress, offer) => {
  const offers = loadOffers(publicAddress) ?? [];
  maybeSave(
    [OFFERS_KEY_PREFIX, publicAddress],
    [...offers.filter(o => o.id !== offer.id), offer],
  );
};

export const removeOffer = (publicAddress, id) => {
  const offers = loadOffers(publicAddress) ?? [];
  maybeSave(
    [OFFERS_KEY_PREFIX, publicAddress],
    offers.filter(o => o.id !== id),
  );
};
