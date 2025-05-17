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
    governedContractKits,
    retiredContractInstances: retiredContractInstancesP,
  },
}) => {
  trace('Start');
  const retiredContractInstances = await retiredContractInstancesP;

  const auctionIDs = Array.from(retiredContractInstances.keys()).filter(k =>
    k.startsWith('auction'),
  );
  assert(auctionIDs);
  assert(auctionIDs.length === 1);
  const auctionInstance = retiredContractInstances.get(auctionIDs[0]);
  trace({ auctionInstance });
  assert(await E(governedContractKits).get(auctionInstance));

  const committeeIDs = Array.from(retiredContractInstances.keys()).filter(k =>
    k.startsWith('economicCommittee'),
  );
  assert(committeeIDs);
  assert(committeeIDs.length === 1);
  trace('found committeeIDs', committeeIDs);

  const committeeInstance = retiredContractInstances.get(committeeIDs[0]);
  assert(await E(contractKits).get(committeeInstance));

  const charterIDs = [...retiredContractInstances.keys()].filter(k =>
    k.startsWith('econCommitteeCharter'),
  );
  assert(charterIDs);
  assert(charterIDs.length === 1);
  trace('found charterID', charterIDs);

  trace('done');
};
harden(testRecordedRetiredInstances);

export const getManifestForRecordedRetiredInstances = () => {
  return {
    manifest: {
      [testRecordedRetiredInstances.name]: {
        consume: {
          contractKits: true,
          governedContractKits: true,
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
