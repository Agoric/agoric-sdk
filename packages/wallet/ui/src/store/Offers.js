import {
  maybeLoad,
  maybeSave,
  watchKey,
  OFFERS_STORAGE_KEY,
} from '../util/storage.js';

export const loadOffers = (chainId, address) =>
  maybeLoad([OFFERS_STORAGE_KEY, chainId, address]) ?? [];

export const addOffer = (chainId, address, offer) => {
  const offers = loadOffers(chainId, address) ?? [];
  maybeSave(
    [OFFERS_STORAGE_KEY, chainId, address],
    [...offers.filter(o => o.id !== offer.id), offer],
  );
};

export const removeOffer = (chainId, address, id) => {
  const offers = loadOffers(chainId, address) ?? [];
  maybeSave(
    [OFFERS_STORAGE_KEY, chainId, address],
    offers.filter(o => o.id !== id),
  );
};

export const watchOffers = (chainId, address, onChange) => {
  watchKey([OFFERS_STORAGE_KEY, chainId, address], newOffers =>
    onChange(newOffers ?? []),
  );
};
