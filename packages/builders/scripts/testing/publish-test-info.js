import { makeTracer } from '@agoric/internal';
import { E, Far } from '@endo/far';
import { makeMarshal } from '@endo/marshal';

/**
 * @import {CoreEvalBuilder} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import {BootstrapPowers} from '@agoric/vats/src/core/types.js';
 */

const trace = makeTracer('PublishTestInfo');
const { Fail } = assert;

/**
 * @param {BootstrapPowers} powers
 */
export const publishTestInfo = async powers => {
  const {
    consume: { agoricNamesAdmin, chainStorage: chainStorageP },
  } = powers;

  const chainStorage = await chainStorageP;
  if (!chainStorage) {
    trace('no chain storage, not registering chain info');
    return;
  }

  trace('publishing testInfo');
  const agoricNamesNode = E(chainStorage).makeChildNode('agoricNames');
  const testInfoNode = E(agoricNamesNode).makeChildNode('testInfo');
  const { nameAdmin } = await E(agoricNamesAdmin).provideChild('testInfo');

  trace('registering onUpdate...');
  await E(nameAdmin).onUpdate(
    Far('chain info writer', {
      write(entries) {
        const marshalData = makeMarshal(_val => Fail`data only`);
        const value = JSON.stringify(marshalData.toCapData(entries));
        void E(testInfoNode)
          .setValue(value)
          .catch(() =>
            console.log('cannot update vstorage after write to testInfo'),
          );
      },
    }),
  );

  trace('writing to testInfo...');
  await E(nameAdmin).update('agoric', {
    isAwesome: 'yes',
    tech: ['HardenedJs', 'Orchestration', 'Async_Execution'],
  });

  trace('Done.');
};

export const getManifestForPublishTestInfo = () => {
  return {
    manifest: {
      [publishTestInfo.name]: {
        consume: {
          agoricNamesAdmin: true,
          chainStorage: true,
        },
      },
    },
  };
};

/** @type {CoreEvalBuilder} */
export const defaultProposalBuilder = async () =>
  harden({
    // Somewhat unorthodox, source the exports from this builder module
    sourceSpec: '@agoric/builders/scripts/testing/publish-test-info.js',
    getManifestCall: ['getManifestForPublishTestInfo'],
  });

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  // import dynamically so the module can work in CoreEval environment
  const dspModule = await import('@agoric/deploy-script-support');
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('publish-test-info', defaultProposalBuilder);
};
