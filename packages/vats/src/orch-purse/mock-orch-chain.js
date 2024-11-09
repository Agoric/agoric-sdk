import { M } from '@endo/patterns';

import { AmountMath, AmountShape } from '@agoric/ertp';

import {
  MinOrchAccountAddressI,
  MinOrchAccountI,
  MinOrchChainI,
} from './typeGuards.js';

/**
 * @import {Zone} from '@agoric/zone'
 *
 * @import {MinOrchAccountAddress} from './types.js'
 */

/**
 * @param {Zone} zone
 */
export const prepareMockOrchChain = zone => {
  let amp;
  const makeAccountKit = zone.exoClassKit(
    'MockOrchAccount',
    {
      account: MinOrchAccountI,
      address: MinOrchAccountAddressI,
      incrFacet: M.interface('Incr', {
        incr: M.call(AmountShape).returns(),
      }),
    },
    brand => ({
      fullBalance: AmountMath.makeEmpty(brand),
    }),
    {
      account: {
        async getFullBalance() {
          return this.state.fullBalance;
        },
        /**
         * @param {MinOrchAccountAddress} dest
         * @param {Amount} depositAmount
         */
        async transfer(dest, depositAmount) {
          const destIncrFacet = amp(dest).incrFacet;
          this.state.fullBalance = AmountMath.subtract(
            this.state.fullBalance,
            depositAmount,
          );
          destIncrFacet.incr(depositAmount);
        },
        getAddress() {
          return this.facets.address;
        },
      },
      address: {},
      incrFacet: {
        incr(amount) {
          this.state.fullBalance = AmountMath.add(
            this.state.fullBalance,
            amount,
          );
        },
      },
    },
    {
      receiveAmplifier(a) {
        amp = a;
      },
    },
  );

  return zone.exo('MockOrchChain', MinOrchChainI, {
    makeAccount(brand) {
      return Promise.resolve(makeAccountKit(brand).account);
    },
  });
};
