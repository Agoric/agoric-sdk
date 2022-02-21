// @ts-check
import { AmountMath } from '@agoric/ertp';
import { E, Far } from '@endo/far';

const { details: X } = assert;

/**
 * per golang/cosmos/x/lien/lien.go
 *
 * @typedef { 'bonded' | 'liened' | 'locked' | 'total' | 'unbonding' } AccountProperty
 */
const XLien = {
  name: 'lien',
  LIEN_GET_ACCOUNT_STATE: 'LIEN_GET_ACCOUNT_STATE',
  denom: 'ubld', // @@err...
};

/**
 * @typedef { Record<AccountProperty, T> & { currentTime: bigint } } AccountState<T>
 * @template T
 */

/**
 * @param {ERef<import('./bridge').BridgeManager>} bridgeManager
 * @param {Brand} stake
 * @returns {StakingAuthority}
 */
export const makeStakeReporter = (bridgeManager, stake) => {
  const { make: makeAmt } = AmountMath;
  /** @param {string} numeral */
  const toStake = numeral => makeAmt(stake, BigInt(numeral));

  /** @type {StakingAuthority} */
  const stakeReporter = Far('stakeReporter', {
    setLiened: async (address, amount) => {
      assert(
        amount.brand === stake,
        X`Cannot setLiened for ${amount.brand}. Expected ${stake}.`,
      );
      await E(bridgeManager).toBridge(XLien.name, {
        type: 'LIEN_SET_LIENED',
        address,
        denom: XLien.denom,
        amount: `${amount.value}`,
      });
    },
    getAccountState: async (address, wantedBrand) => {
      assert(
        wantedBrand === stake,
        X`Cannot getAccountState for ${wantedBrand}. Expected ${stake}.`,
      );
      /** @type { AccountState<string> } */
      const { currentTime, bonded, liened, locked, total, unbonding } = await E(
        bridgeManager,
      ).toBridge(XLien.name, {
        type: XLien.LIEN_GET_ACCOUNT_STATE,
        address,
        denom: XLien.denom,
        amount: '0',
      });
      return harden({
        bonded: toStake(bonded),
        liened: toStake(liened),
        locked: toStake(locked),
        total: toStake(total),
        unbonding: toStake(unbonding),
        currentTime: BigInt(currentTime),
      });
    },
  });

  return stakeReporter;
};
