import { parseScriptArgs, makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForReplaceFeeDistributor } from '@agoric/inter-protocol/src/proposals/replace-fee-distributor.js';
import { SECONDS_PER_HOUR } from '@agoric/inter-protocol/src/proposals/econ-behaviors.js';

const configurations = {
  A3P_INTEGRATION: {
    params: {
      collectionInterval: 30n,
      keywordShares: {
        RewardDistributor: 0n,
        Reserve: 1n,
      },
    },
  },
  MAINNET: {
    params: {
      collectionInterval: 1n * SECONDS_PER_HOUR,
      keywordShares: {
        RewardDistributor: 0n,
        Reserve: 1n,
      },
    },
  },
  DEVNET: {
    params: {
      collectionInterval: 1n * SECONDS_PER_HOUR,
      keywordShares: {
        RewardDistributor: 0n,
        Reserve: 1n,
      },
    },
  },
  EMERYNET: {
    params: {
      collectionInterval: 1n * SECONDS_PER_HOUR,
      keywordShares: {
        RewardDistributor: 0n,
        Reserve: 1n,
      },
    },
  },
};

const { keys } = Object;
const knownVariants = keys(configurations);

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }, opts) => {
  const config = opts.config || configurations[opts.variant];
  console.log('feeDist OPTS', opts, config);
  if (!config) {
    const error = `Unknown variant "${opts.variant}". Expected one of ${knownVariants.join(', ')}`;
    console.error(error);
    throw Error(error);
  }
  const { params } = config;

  return harden({
    sourceSpec:
      '@agoric/inter-protocol/src/proposals/replace-fee-distributor.js',
    getManifestCall: [
      getManifestForReplaceFeeDistributor.name,
      {
        feeDistributorRef: publishRef(
          install('@agoric/inter-protocol/src/feeDistributor.js'),
        ),
        ...params,
      },
    ],
  });
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const name = 'replace-feeDistributor-combo';
  const opts = parseScriptArgs(endowments, name, knownVariants);
  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval('replace-feeDistributor', utils =>
    defaultProposalBuilder(utils, opts),
  );
};
