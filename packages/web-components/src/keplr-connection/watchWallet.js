// @ts-check
import { makeFollower, iterateLatest } from '@agoric/casting';
import { makeNotifierKit } from '@agoric/notifier';
import { AmountMath } from '@agoric/ertp';
import { assertHasData } from '@agoric/smart-wallet/src/utils';
import { Errors } from './errors';
import { queryBankBalances } from './queryBankBalances';

/** @typedef {import('./fetchCurrent').PurseInfo} PurseInfo */

const POLL_INTERVAL_MS = 6000;

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

  const currentFollower = await followPublished(`wallet.${address}.current`);
  try {
    // eslint-disable-next-line @jessie.js/no-nested-await
    await assertHasData(currentFollower);
  } catch {
    throw new Error(Errors.noSmartWallet);
  }

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

  watchChainBalances();

  return {
    pursesNotifier: pursesNotifierKit.notifier,
  };
};
