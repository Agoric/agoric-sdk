import { E } from '@endo/eventual-send';
import { makeTracer } from '@agoric/internal';

const trace = makeTracer('CGExec', false);

/** @type {ContractMeta} */
export const meta = {
  upgradability: 'canUpgrade',
};
harden(meta);

/**
 * Start an instance of a governor, governing a "governed" contract specified in terms.
 *
 * @param {ZCF<{}>} zcf
 * @param {{}} _privateArgs
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export const start = async (zcf, _privateArgs, baggage) => {
  trace('start');
  const contractInstanceAdminFacet = baggage.get('creatorFacet');
  const terminationData = harden(Error(`termination of contract by executor governor`));
  await E(contractInstanceAdminFacet).terminateContract(terminationData);
  zcf.shutdown(`self-termination of executor governor`);
};
harden(start);
