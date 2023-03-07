// @ts-check
import { makeFollower, iterateLatest } from '@agoric/casting';
import { makeNotifierKit } from '@agoric/notifier';
import { AmountMath } from '@agoric/ertp';
import { assertHasData } from '@agoric/smart-wallet/src/utils';
import { Errors } from './errors';
import { queryBankBalances } from './queryBankBalances';

/** @typedef {import('@agoric/smart-wallet/src/types.js').Petname} Petname */

/**
 * @typedef {{
 *  brand?: Brand,
 *  brandPetname?: Petname,
 *  currentAmount: Amount,
 *  pursePetname?: Petname,
 *  displayInfo?: DisplayInfo,
 * }} PurseInfo
 */

const POLL_INTERVAL_MS = 6000;

/**
 *
 * @param {ERef<import('@agoric/casting').Leader>} leader
 * @param {string} address
 * @param {import('@agoric/smart-wallet/src/marshal-contexts.js').ImportContext} context
 * @param {string[]} rpcs
 */
export const watchWallet = async (leader, address, context, rpcs) => {
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

  /** @type {import('@agoric/casting').ValueFollower<import('@agoric/smart-wallet/src/smartWallet.js').CurrentWalletRecord>} */
  const currentFollower = await followPublished(`wallet.${address}.current`);
  try {
    // eslint-disable-next-line @jessie.js/no-nested-await
    await assertHasData(currentFollower);
  } catch {
    // XXX: We can technically show vbank purses without a smart wallet
    // existing, maybe don't throw but indicate no smart wallet in the result?
    throw new Error(Errors.noSmartWallet);
  }

  const publicSubscriberPathsNotifierKit = makeNotifierKit(
    /** @type {  import('@agoric/smart-wallet/src/smartWallet.js').CurrentWalletRecord['offerToPublicSubscriberPaths'] | null } */ (
      null
    ),
  );

  // NB: this watches '.current' but only notifies of changes to offerToPublicSubscriberPaths
  const watchCurrent = async () => {
    let lastPaths;
    for await (const { value } of iterateLatest(currentFollower)) {
      const { offerToPublicSubscriberPaths: currentPaths } = value;
      // eslint-disable-next-line no-continue
      if (currentPaths === lastPaths) continue;

      publicSubscriberPathsNotifierKit.updater.updateState(
        harden(currentPaths),
      );
    }
  };

  const watchChainBalances = () => {
    const brandToPurse = new Map();
    let vbankAssets;
    let bank;

    const possiblyUpdateBankPurses = () => {
      if (!vbankAssets || !bank) return;

      const bankMap = new Map(bank.map(({ denom, amount }) => [denom, amount]));

      vbankAssets.forEach(([denom, info]) => {
        const amount = bankMap.get(denom) ?? 0n;
        const purseInfo = {
          brand: info.brand,
          currentAmount: AmountMath.make(info.brand, BigInt(amount)),
          brandPetname: info.issuerName,
          pursePetname: info.issuerName,
          displayInfo: info.displayInfo,
        };
        brandToPurse.set(info.brand, purseInfo);
      });

      updatePurses(brandToPurse);
    };

    const watchBank = async () => {
      const balances = await queryBankBalances(address, rpcs[0]);
      bank = balances;
      possiblyUpdateBankPurses();
      setTimeout(watchBank, POLL_INTERVAL_MS);
    };

    const watchVbankAssets = async () => {
      const vbankAssetsFollower = followPublished('agoricNames.vbankAsset');
      for await (const { value } of iterateLatest(vbankAssetsFollower)) {
        vbankAssets = value;
        possiblyUpdateBankPurses();
      }
    };

    void watchVbankAssets();
    void watchBank();
  };

  watchCurrent();
  watchChainBalances();

  return {
    pursesNotifier: pursesNotifierKit.notifier,
    publicSubscribersNotifier: publicSubscriberPathsNotifierKit.notifier,
  };
};
