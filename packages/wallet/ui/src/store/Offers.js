// @ts-check
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

/** @typedef {import('@agoric/web-components/src/dapp-wallet-bridge/DappWalletBridge').OfferConfig} OfferConfig */
/** @typedef {import('./Dapps.js').SmartWalletKey} SmartWalletKey */
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
 * } & OfferConfig
 * } Offer
 */

export const loadOffers = (
  /** @type {SmartWalletKey} */ { chainId, address },
) => maybeLoad([OFFERS_STORAGE_KEY, chainId, address]) ?? [];

export const addOffer = (
  /** @type {SmartWalletKey} */ { chainId, address },
  /** @type {Offer} */ offer,
) => {
  const offers = loadOffers({ chainId, address }) ?? [];
  maybeSave(
    [OFFERS_STORAGE_KEY, chainId, address],
    [...offers.filter(o => o.id !== offer.id), offer],
  );
};

export const removeOffer = (
  /** @type {SmartWalletKey} */ { chainId, address },
  /** @type {number} */ id,
) => {
  const offers = loadOffers({ chainId, address }) ?? [];
  maybeSave(
    [OFFERS_STORAGE_KEY, chainId, address],
    offers.filter(o => o.id !== id),
  );
};

export const watchOffers = (
  /** @type {SmartWalletKey} */ { chainId, address },
  /** @type {(newOffers: Offer[]) => void} */ onChange,
) => {
  watchKey(
    [OFFERS_STORAGE_KEY, chainId, address],
    (/** @type {Offer[]} */ newOffers) => onChange(newOffers ?? []),
  );
};
