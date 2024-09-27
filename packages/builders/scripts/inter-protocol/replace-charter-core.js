import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForReplaceElectorate } from '@agoric/inter-protocol/src/proposals/replaceCharter.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }, opts) => {
  return harden({
    sourceSpec: '@agoric/inter-protocol/src/proposals/replaceCharter.js',
    getManifestCall: [
      getManifestForReplaceElectorate.name,
      {
        ...opts,
        economicCharterRef: publishRef(
          install(
            '@agoric/inter-protocol/src/econCommitteeCharter.js',
            '../bundles/bundle-econCommitteeCharter.js',
          ),
        ),
      },
    ],
  });
};

const configurations = {
  A3P_INTEGRATION: {
    addresses: {
      gov1: 'agoric1ee9hr0jyrxhy999y755mp862ljgycmwyp4pl7q',
    },
  },
  BOOTSTRAP_TEST: {
    addresses: {
      gov1: 'agoric1gx9uu7y6c90rqruhesae2t7c2vlw4uyyxlqxrx',
      gov2: 'agoric1d4228cvelf8tj65f4h7n2td90sscavln2283h5',
      gov3: 'agoric14543m33dr28x7qhwc558hzlj9szwhzwzpcmw6a',
    },
  },
};

const { keys } = Object;
const Usage = `agoric run replace-charter-core.js ${keys(configurations).join(' | ')}`;
export default async (homeP, endowments) => {
  const { scriptArgs } = endowments;
  const config = configurations[scriptArgs?.[0]];
  if (!config) {
    console.error(Usage);
    process.exit(1);
  }
  console.log('replace-charter', scriptArgs, config);

  const { writeCoreEval } = await makeHelpers(homeP, endowments);

  await writeCoreEval('replace-charter', (utils, opts) =>
    defaultProposalBuilder(utils, { ...opts, ...config }),
  );
};
