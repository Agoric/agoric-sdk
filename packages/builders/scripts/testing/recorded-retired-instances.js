import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';

const trace = makeTracer('RecordedRetired', true);

/**
 * @param {BootstrapPowers &
 *   PromiseSpaceOf<{ retiredContractInstances: MapStore<string, Instance>;
 *   }>
 * } powers
 */
export const testRecordedRetiredInstances = async ({
  consume: {
    contractKits,
    retiredContractInstances: retiredContractInstancesP,
  },
}) => {
  trace('Start');
  const retiredContractInstances = await retiredContractInstancesP;

  trace(Array.from(retiredContractInstances.keys()));

  const auctionID = Array.from(retiredContractInstances.keys()).find(k =>
    k.startsWith('auction'),
  );
  assert(auctionID);
  assert(auctionID.length === 1);
  assert(await E(contractKits).has(retiredContractInstances.get(auctionID[0])));

  const committeeID = Array.from(retiredContractInstances.keys()).find(k =>
    k.startsWith('economicCommittee'),
  );
  assert(committeeID);
  assert(committeeID.length === 1);
  assert(await E(contractKits).has(retiredContractInstances.get(committeeID)));

  trace('done');
};
harden(testRecordedRetiredInstances);

export const getManifestForRecordedRetiredInstances = () => {
  return {
    manifest: {
      [testRecordedRetiredInstances.name]: {
        consume: {
          contractKits: true,
          retiredContractInstances: true,
        },
      },
    },
  };
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async () =>
  harden({
    sourceSpec:
      '@agoric/builders/scripts/testing/recorded-retired-instances.js',
    getManifestCall: ['getManifestForRecordedRetiredInstances', {}],
  });

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  // import dynamically so the module can work in CoreEval environment
  const dspModule = await import('@agoric/deploy-script-support');
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('recorded-retired', defaultProposalBuilder);
};
