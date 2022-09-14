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
  LIEN_CHANGE_LIENED: 'LIEN_CHANGE_LIENED',
  LIEN_GET_ACCOUNT_STATE: 'LIEN_GET_ACCOUNT_STATE',
});

/**
 * @typedef { Record<AccountProperty, T> & { currentTime: bigint } } AccountState<T>
 * @template T
 */

/**
 * @param {ERef<BridgeManager>} bridgeManager
 * @param {Brand<'nat'>} brand
 * @param {string} [denom]
 * @returns {StakingAuthority}
 */
export const makeStakeReporter = (bridgeManager, brand, denom = 'ubld') => {
  const { make: makeAmt } = AmountMath;
  /** @param {string} numeral */
  const toStake = numeral => makeAmt(brand, BigInt(numeral));
  /**
   * @param {string} address
   * @param {bigint} delta
   * @returns {Promise<Amount<`nat`>>}
   */
  const changeLiened = async (address, delta) => {
    assert.typeof(address, 'string');
    const newAmount = await E(bridgeManager).toBridge(XLien.name, {
      type: XLien.LIEN_CHANGE_LIENED,
      address,
      denom,
      delta: `${delta}`,
    });
    return harden(toStake(newAmount));
  };

  /** @type {StakingAuthority} */
  const stakeReporter = Far('stakeReporter', {
    increaseLiened: async (address, increase) => {
      const delta = AmountMath.getValue(brand, increase);
      return changeLiened(address, delta);
    },
    decreaseLiened: async (address, decrease) => {
      const delta = -1n * AmountMath.getValue(brand, decrease);
      return changeLiened(address, delta);
    },
    getAccountState: async (address, wantedBrand) => {
      wantedBrand === brand ||
        assert.fail(
          X`Cannot getAccountState for ${wantedBrand}. Expected ${brand}.`,
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
  });

  return stakeReporter;
};
