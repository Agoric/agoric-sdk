// @ts-check
import { AmountMath } from '@agoric/ertp';
import { E, Far } from '@endo/far';

const { details: X } = assert;

/**
 * per golang/cosmos/x/lien/lien.go
 *
 * @typedef { 'bonded' | 'liened' | 'locked' | 'total' | 'unbonding' } AccountProperty
 */
const XLien = /** @type { const } */ ({
  name: 'lien',
  LIEN_GET_ACCOUNT_STATE: 'LIEN_GET_ACCOUNT_STATE',
  LIEN_SET_LIENED: 'LIEN_SET_LIENED',
});

/**
 * @typedef { Record<AccountProperty, T> & { currentTime: bigint } } AccountState<T>
 * @template T
 */

/**
 * @param {ERef<BridgeManager>} bridgeManager
 * @param {Brand<'nat'>} stake
 * @param {string} [denom]
 * @returns {StakingAuthority}
 */
export const makeStakeReporter = (bridgeManager, stake, denom = 'ubld') => {
  const { make: makeAmt } = AmountMath;
  /** @param {string} numeral */
  const toStake = numeral => makeAmt(stake, BigInt(numeral));

  /** @type {StakingAuthority} */
  const stakeReporter = Far('stakeReporter', {
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
        denom,
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
    setLiened: async (address, previous, target) => {
      assert.typeof(address, 'string');
      AmountMath.coerce(stake, previous); // TODO
      const amount = AmountMath.getValue(stake, target);
      const success = await E(bridgeManager).toBridge(XLien.name, {
        type: XLien.LIEN_SET_LIENED,
        address,
        denom,
        amount: `${amount}`,
      });
      assert(success);
    },
  });

  return stakeReporter;
};
