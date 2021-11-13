// @ts-check

import { Far } from '@agoric/marshal';
import { E } from '@agoric/eventual-send';

import { evalContractBundle } from './evalContractCode';

/**
 * @param {VatPowers} powers
 */
export function buildRootObject(powers) {
  const executeContract = (
    bundle,
    makeInvitation,
    terms,
    privateArgs = undefined,
  ) => {
    const contractCode = evalContractBundle(bundle);
    // TODO pass in power to shutdown the vat
    return E(contractCode).start(makeInvitation, terms, privateArgs);
  };

  return Far('executeContract', { executeContract });
}

harden(buildRootObject);
