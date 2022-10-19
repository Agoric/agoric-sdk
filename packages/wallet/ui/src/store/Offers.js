import {
  maybeLoad,
  maybeSave,
  watchKey,
  OFFERS_STORAGE_KEY,
} from '../util/storage.js';

/**
 * @enum {string}
 */
export const OfferUIStatus = {
  proposed: 'proposed',
  accepted: 'accept',
  rejected: 'rejected',
  pending: 'pending',
  declined: 'decline',
};

/**
 * @typedef {{
 *   id: number;
 *   meta: {
 *    id: number,
 *    creationStamp: number,
 *   };
 *   requestContext: {
 *    origin: string,
 *   };
 *   status: OfferUIStatus;
 *   instancePetname?: string;
 *   spendAction?: string
 * }} Offer
 */

export const loadOffers = (
  /** @type {string} */ chainId,
  /** @type {string} */ address,
) => maybeLoad([OFFERS_STORAGE_KEY, chainId, address]) ?? [];

export const addOffer = (
  /** @type {string} */ chainId,
  /** @type {string} */ address,
  /** @type {Offer} */ offer,
) => {
  const offers = loadOffers(chainId, address) ?? [];
  maybeSave(
    [OFFERS_STORAGE_KEY, chainId, address],
    [...offers.filter(o => o.id !== offer.id), offer],
  );
};

export const removeOffer = (
  /** @type {string} */ chainId,
  /** @type {string} */ address,
  /** @type {number} */ id,
) => {
  const offers = loadOffers(chainId, address) ?? [];
  maybeSave(
    [OFFERS_STORAGE_KEY, chainId, address],
    offers.filter(o => o.id !== id),
  );
};

export const watchOffers = (
  /** @type {string} */ chainId,
  /** @type {string} */ address,
  /** @type {(newOffers: Offer[]) => void} */ onChange,
) => {
  watchKey([OFFERS_STORAGE_KEY, chainId, address], newOffers =>
    onChange(newOffers ?? []),
  );
};
