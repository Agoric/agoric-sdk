import { deeplyFulfilledObject } from '@agoric/internal';
import { E } from '@endo/far';

/**
 * @import {CoreEvalBuilder, DeployScriptFunction} from '@agoric/deploy-script-support/src/externalTypes.js'
 */

const trace = (...args) => console.log('ICAPd', ...args);

export const startICAProbe = async powers => {
  trace('startICAProbe');
  const {
    agoricNames,
    localchain,
    board,
    cosmosInterchainService,
    chainStorage,
    chainTimerService,
  } = powers.consume;
  const marshaller = await E(board).getReadonlyMarshaller();
  const privateArgs = await deeplyFulfilledObject(
    harden({
      agoricNames,
      localchain,
      marshaller,
      orchestrationService: cosmosInterchainService,
      storageNode: E(chainStorage).makeChildNode('StkC'),
      timerService: chainTimerService,
    }),
  );
  trace('privateArgs', Object.keys(privateArgs));
  const { startUpgradable } = powers.consume;
  const { ICAProbe: installation } = powers.installation.consume;
  const kit = E(startUpgradable)({
    label: 'ICAProbe',
    installation,
    privateArgs,
  });
  trace('started ICAProbe', Object.keys(kit));
  powers.instance.ICAProbe.produce(kit.instance);
  trace('done');
};

const orchPermit = {
  consume: {
    agoricNames: true,
    chainTimerService: true,
    chainStorage: true,
    cosmosInterchainService: true,
    localchain: true,
  },
};

export const getManifest = ({ restoreRef }, { installationRef, options }) => {
  return {
    manifest: {
      [startICAProbe.name]: {
        consume: { ...orchPermit.consume, board: true, startUpgradable: true },
        installation: { consume: { ICAProbe: true } },
        instance: { produce: { ICAProbe: true } },
      },
    },
    installations: { ICAProbe: restoreRef(installationRef) },
    options,
  };
};

/** @satisfies {CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  options,
) =>
  harden({
    sourceSpec: './ica-probe.deploy.js',
    getManifestCall: [
      getManifest.name,
      {
        installationRef: publishRef(install('./ica-probe.contract.js')),
        options,
      },
    ],
  });

export default async (homeP, endowments) => {
  // import dynamically so the module can work in CoreEval environment
  const dspModule = await import('@agoric/deploy-script-support');
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(startICAProbe.name, defaultProposalBuilder);
};
