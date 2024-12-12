/**
 * @file Create a Map that would normally be provided by replaceElectorate.js
 */

import { makeTracer } from '@agoric/internal';
import { makeScalarBigMapStore } from '@agoric/vat-data';

const trace = makeTracer('RecordedRetired', true);

/**
 * @param {BootstrapPowers &
 *   PromiseSpaceOf<{ retiredContractInstances: MapStore<string, Instance>;
 *   }>
 * } powers
 */
export const provideRetiredInstances = async ({
  produce: { retiredContractInstances },
}) => {
  trace('Start');
  const contractInstanceMap = makeScalarBigMapStore(
    'retiredContractInstances',
    { durable: true },
  );
  retiredContractInstances.resolve(contractInstanceMap);
  trace('done');
};
harden(provideRetiredInstances);

export const getManifestForProvideRetiredInstances = () => {
  return {
    manifest: {
      [provideRetiredInstances.name]: {
        produce: {
          retiredContractInstances: true,
        },
      },
    },
  };
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async () =>
  harden({
    sourceSpec: '@agoric/builders/scripts/testing/provide-retired-instances.js',
    getManifestCall: ['getManifestForProvideRetiredInstances', {}],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  // import dynamically so the module can work in CoreEval environment
  const dspModule = await import('@agoric/deploy-script-support');
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('recorded-retired', defaultProposalBuilder);
};
