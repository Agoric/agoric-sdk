// @ts-check
import { makeFollower } from '@agoric/casting';
import { makeNotifierKit } from '@agoric/notifier';

import { fetchCurrent } from './fetchCurrent';
import { followLatest } from './followLatest';
import { Errors } from './errors';

/** @typedef {import('./fetchCurrent').PurseInfo} PurseInfo */

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

  const currentFollower = followPublished(`wallet.${address}.current`);
  const { blockHeight, brandToPurse } = await fetchCurrent(
    currentFollower,
  ).catch(() => {
    throw new Error(Errors.noSmartWallet);
  });
  updatePurses(brandToPurse);

  const latestFollower = followPublished(`wallet.${address}`);
  followLatest({
    startingHeight: blockHeight,
    latestFollower,
    updatePurses,
    brandToPurse,
  });

  return {
    getPursesNotifier: () => pursesNotifierKit.notifier,
  };
};
