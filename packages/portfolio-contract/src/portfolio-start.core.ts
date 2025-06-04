import { makeTracer, objectMap } from '@agoric/internal';
import type { Marshaller } from '@agoric/internal/src/lib-chainStorage.js';
import type { OrchestrationPowers } from '@agoric/orchestration';
import { passStyleOf } from '@endo/pass-style';
import type { LegibleCapData } from './config-marshal.js';
import {
  lookupInterchainInfo,
  makeGetManifest,
  startOrchContract,
  type CorePowersG,
} from './orch.start.js';
import type { start } from './portfolio.contract.js';
import { meta } from './portfolio.contract.meta.js';
import { permit } from './portfolio.contract.permit.js';
import type { PortfolioConfig } from './type-guards.js';

const trace = makeTracer(`YMX-Start`, true);

export const makePrivateArgs = async (
  orchestrationPowers: OrchestrationPowers,
  marshaller: Marshaller,
  config: PortfolioConfig,
): Promise<Parameters<typeof start>[1]> => {
  const { agoricNames } = orchestrationPowers;
  const { chainInfo, assetInfo } = await lookupInterchainInfo(agoricNames, {
    agoric: ['ubld'],
    noble: ['uusdc'],
  });
  return harden({
    ...orchestrationPowers,
    marshaller,
    chainInfo,
    assetInfo,
    ...config,
  });
};
harden(makePrivateArgs);

export const startPortfolio = async (
  permitted: BootstrapPowers &
    CorePowersG<(typeof meta)['name'], typeof start, typeof permit>,
  configStruct: { options: LegibleCapData<PortfolioConfig> },
) => {
  trace('startPortfolio');
  const { config, kit } = await startOrchContract(
    meta,
    permit,
    makePrivateArgs,
    permitted,
    configStruct,
  );

  trace('startPortfolio done', {
    config: objectMap(config, v => passStyleOf(v)),
    kit: objectMap(kit, v => passStyleOf(v)),
  });
};

// XXX hm... we need to preserve the function name.
export const getManifestForPortfolio = (u, d) =>
  makeGetManifest(startPortfolio, permit, meta.name)(u, d);
