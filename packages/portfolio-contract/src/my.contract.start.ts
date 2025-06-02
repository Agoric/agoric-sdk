/** ContractMeta, Permit for Fast USDC */
import { E, passStyleOf } from '@endo/far';
import { makeTracer } from '@agoric/internal/src/debug.js';
import { meta, permit } from './my.contract.meta.js';
import {
  makeGetManifest,
  startOrchContract,
  type CorePowersG,
} from './orch.start.js';
import type { StartMy } from './my.contract.js';
import type { LegibleCapData } from './config-marshal.js';
import type { OrchestrationPowers } from '@agoric/orchestration';
import { objectMap } from '@endo/patterns';

const trace = makeTracer(`My-Start`, true);

export const makePrivateArgs = async (
  orchestrationPowers: OrchestrationPowers,
  marshaller: Marshaller,
  config: {},
): Promise<Parameters<StartMy>[1]> => {
  return harden({
    ...orchestrationPowers,
    marshaller,
    // TODO:
    // chainInfo,
    // assetInfo,
  });
};
harden(makePrivateArgs);

type MyConfig = {};

export const startMy = async (
  permitted: BootstrapPowers &
    CorePowersG<(typeof meta)['name'], StartMy, typeof permit>,
  configStruct: { options: LegibleCapData<MyConfig> },
) => {
  trace('startMy');
  const { config, kit } = await startOrchContract(
    meta,
    permit,
    makePrivateArgs,
    permitted,
    configStruct,
  );

  trace('startMy done', {
    config: objectMap(config, v => passStyleOf(v)),
    kit: objectMap(kit, v => passStyleOf(v)),
  });
};

// XXX hm... we need to preserve the function name.
export const getManifestForMy = (u, d) =>
  makeGetManifest(startMy, permit, meta.name)(u, d);
