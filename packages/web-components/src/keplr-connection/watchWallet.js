// @ts-check
import { makeFollower } from '@agoric/casting';
import { makeNotifierKit } from '@agoric/notifier';

import { fetchCurrent } from './fetchCurrent';
import { followLatest } from './followLatest';
import { Errors } from './errors';

/** @typedef {import('./fetchCurrent').PurseInfo} PurseInfo */

/**
 * @typedef {{
 *   [offerId: string]: {
 *     [subscriberName: string]: VStorageKey
 *   }
 * }} OfferToPublicSubscriberPaths
 */

export const watchWallet = async (leader, address, context) => {
  const followPublished = path =>
    makeFollower(`:published.${path}`, leader, {
      unserializer: context.fromMyWallet,
    });

  const pursesNotifierKit = makeNotifierKit(
    /** @type {PurseInfo[] | null} */ (null),
  );

  const updatePurses = brandToPurse => {
    /** @type {PurseInfo[]} */
    const purses = [];
    for (const [_brand, purse] of brandToPurse.entries()) {
      if (purse.currentAmount && purse.brandPetname) {
        assert(purse.pursePetname, 'missing purse.pursePetname');
        purses.push(purse);
      }
    }
    pursesNotifierKit.updater.updateState(harden(purses));
  };

  const publicSubscriberPathsNotifierKit = makeNotifierKit(
    /** @type {  OfferToPublicSubscriberPaths | null } */ (null),
  );

  const updatePublicSubscriberPaths =
    publicSubscriberPathsNotifierKit.updater.updateState;

  const currentFollower = followPublished(`wallet.${address}.current`);
  const { blockHeight, brandToPurse, offerToPublicSubscriberPaths } =
    await fetchCurrent(currentFollower).catch(() => {
      throw new Error(Errors.noSmartWallet);
    });
  updatePurses(brandToPurse);
  updatePublicSubscriberPaths(harden(offerToPublicSubscriberPaths));

  const latestFollower = followPublished(`wallet.${address}`);
  followLatest({
    startingHeight: blockHeight,
    latestFollower,
    updatePurses,
    brandToPurse,
  });

  return {
    pursesNotifier: pursesNotifierKit.notifier,
    publicSubscribersNotifier: publicSubscriberPathsNotifierKit.notifier,
  };
};
