import { makeHelpers } from '@agoric/deploy-script-support';
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
  // TODO(CTH): fill in something for DEVNET and EMERYNET
  DEVNET: {},
  EMERYNET: {},
};

const { keys } = Object;
const knownVariants = keys(configurations);

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async (_, opts) => {
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
    getManifestCall: [getManifestForReplaceFeeDistributor.name, { ...params }],
  });
};

const Usage = `agoric run replace-feedDistributor-combo.js ${[...knownVariants, '<json-config>'].join(' | ')}`;

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { scriptArgs } = endowments;
  const variantOrConfig = scriptArgs?.[0];
  console.log('replace-feeDistributor-combo', variantOrConfig);

  const opts = {};

  if (typeof variantOrConfig === 'string') {
    if (variantOrConfig[0] === '{') {
      try {
        opts.config = JSON.parse(variantOrConfig);
      } catch (err) {
        throw Error(`Failed to parse config argument ${variantOrConfig}`);
      }
    } else {
      opts.variant = variantOrConfig;
    }
  } else {
    console.error(Usage);
    throw Error(Usage);
  }

  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval('replace-feeDistributor', utils =>
    defaultProposalBuilder(utils, opts),
  );
};
