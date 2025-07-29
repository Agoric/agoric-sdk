/**
 * @file Get a promise for a deposit facet without
 * access to all of namesByAddressAdmin.
 */

import { E } from '@endo/eventual-send';

const trace = (...args) => console.log('---- AttD', ...args);

/**
 * @import {DepositFacet} from '@agoric/ertp';
 */
const depositFacetKey = 'depositFacet';

/**
 * XXX move this into BootstrapPowers
 * @typedef {PromiseSpaceOf<{
 *   getDepositFacet: (addr: string, debugName?: string) => Promise<DepositFacet>
 * }>} AttenuatedDepositPowers
 */

/**
 * @param {BootstrapPowers & AttenuatedDepositPowers} powers
 */
export const produceAttenuatedDeposit = powers => {
  const { namesByAddress, namesByAddressAdmin } = powers.consume;
  /**
   *
   * @param {string} addr
   * @param {string} [debugName]
   */
  const getDepositFacet = async (addr, debugName = 'party') => {
    trace('reserve nameHub for', debugName, addr);
    await E(namesByAddressAdmin).reserve(addr);
    trace('lookup depositFacet for', debugName, addr);
    const df = await E(namesByAddress).lookup(addr, depositFacetKey);
    trace('got depositFacet for', debugName, addr);
    return df;
  };
  harden(getDepositFacet);

  powers.produce.getDepositFacet.resolve(getDepositFacet);
};
