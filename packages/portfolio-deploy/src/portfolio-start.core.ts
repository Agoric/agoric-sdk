import type { start } from '@aglocal/portfolio-contract/src/portfolio.contract.js';
import { meta } from '@aglocal/portfolio-contract/src/portfolio.contract.meta.js';
import type { PortfolioConfig } from '@aglocal/portfolio-contract/src/type-guards.js';
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
import { permit } from './portfolio.contract.permit.js';

const trace = makeTracer(`YMX-Start`, true);

export const makePrivateArgs = async (
  orchestrationPowers: OrchestrationPowers,
  marshaller: Marshaller,
  _config: PortfolioConfig,
): Promise<Parameters<typeof start>[1]> => {
  const { agoricNames } = orchestrationPowers;
  const { chainInfo, assetInfo } = await lookupInterchainInfo(agoricNames, {
    agoric: ['ubld'],
    noble: ['uusdc'],
  });
  trace('@@@@assetInfo', JSON.stringify(assetInfo, null, 2));
  return harden({
    ...orchestrationPowers,
    marshaller,
    chainInfo,
    assetInfo,
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

// XXX grr... esbuild is garbling to '$c͏_startPortfolio'
const startName = 'startPortfolio';

// XXX hm... we need to preserve the function name.
export const getManifestForPortfolio = (u, d) =>
  makeGetManifest({ name: startName }, permit, meta.name)(u, d);
