import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForReplaceElectorate } from '@agoric/inter-protocol/src/proposals/replaceElectorate.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }, opts) => {
  return harden({
    sourceSpec: '@agoric/inter-protocol/src/proposals/replaceElectorate.js',
    getManifestCall: [
      getManifestForReplaceElectorate.name,
      {
        ...opts,
        economicCommitteeRef: publishRef(
          install(
            '@agoric/governance/src/committee.js',
            '../bundles/bundle-committee.js',
          ),
        ),
      },
    ],
  });
};

const configurations = {
  MAINNET: {
    committeeName: 'Economic Committee',
    // TODO: Update the addresses after confirmation
    voterAddresses: {
      gov1: 'agoric1gx9uu7y6c90rqruhesae2t7c2vlw4uyyxlqxrx',
      gov2: 'agoric1d4228cvelf8tj65f4h7n2td90sscavln2283h5',
      gov3: 'agoric14543m33dr28x7qhwc558hzlj9szwhzwzpcmw6a',
    },
    highPrioritySendersConfig: {
      addressesToAdd: [],
      addressesToRemove: [
        'agoric13p9adwk0na5npfq64g22l6xucvqdmu3xqe70wq',
        'agoric1el6zqs8ggctj5vwyukyk4fh50wcpdpwgugd5l5',
        'agoric1zayxg4e9vd0es9c9jlpt36qtth255txjp6a8yc',
      ],
    },
  },
  DEVNET: {
    committeeName: 'Economic Committee',
    // TODO: Update the addresses after confirmation
    voterAddresses: {
      gov1: 'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
      gov2: 'agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang',
    },
    highPrioritySendersConfig: {
      addressesToAdd: [],
      addressesToRemove: ['agoric1w8wktaur4zf8qmmtn3n7x3r0jhsjkjntcm3u6h'],
    },
  },
  A3P_INTEGRATION: {
    committeeName: 'Economic Committee',
    voterAddresses: {
      gov1: 'agoric1ee9hr0jyrxhy999y755mp862ljgycmwyp4pl7q',
    },
    highPrioritySendersConfig: {
      addressesToAdd: [],
      addressesToRemove: [],
    },
  },
  BOOTSTRAP_TEST: {
    committeeName: 'Economic Committee',
    voterAddresses: {
      gov1: 'agoric1gx9uu7y6c90rqruhesae2t7c2vlw4uyyxlqxrx',
      gov2: 'agoric1d4228cvelf8tj65f4h7n2td90sscavln2283h5',
      gov3: 'agoric14543m33dr28x7qhwc558hzlj9szwhzwzpcmw6a',
    },
    highPrioritySendersConfig: {
      addressesToAdd: [],
      addressesToRemove: [
        'agoric13p9adwk0na5npfq64g22l6xucvqdmu3xqe70wq',
        'agoric1el6zqs8ggctj5vwyukyk4fh50wcpdpwgugd5l5',
        'agoric1zayxg4e9vd0es9c9jlpt36qtth255txjp6a8yc',
      ],
    },
  },
};

const { keys } = Object;
const Usage = `agoric run replace-electorate-core.js ${keys(configurations).join(' | ')}`;
export default async (homeP, endowments) => {
  const { scriptArgs } = endowments;
  const config = configurations[scriptArgs?.[0]];
  if (!config) {
    console.error(Usage);
    process.exit(1);
  }
  console.log('replace-committee', scriptArgs, config);

  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval('replace-committee', (utils, opts) =>
    defaultProposalBuilder(utils, { ...opts, ...config }),
  );
};
