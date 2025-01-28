import { M } from '@endo/patterns';
import { OrchestrationPowersShape } from '../typeGuards.js';
import { withOrchestration } from '../utils/start-helper.js';
import * as flows from './my.flows.js';
import { E } from '@endo/far';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationTools} from '../types.js';
 */

export const meta = M.splitRecord({
  privateArgsShape: {
    // @ts-expect-error TypedPattern not recognized as record
    ...OrchestrationPowersShape,
    marshaller: M.remotable('marshaller'),
  },
});
harden(meta);

/**
 * @param {any} _zcf
 * @param {any} _privateArgs
 * @param {Zone} zone
 * @param {OrchestrationTools} tools
 * @returns
 */
export const contract = async (_zcf, _privateArgs, zone, tools) => {
  const { orchestrateAll } = tools;
  const { makeHookAccount } = orchestrateAll(flows, {});

  const hookAccountV = zone.makeOnce('hookAccount', _key => makeHookAccount());

  const { when } = tools.vowTools;

  return {
    publicFacet: zone.exo('MyPub', undefined, {
      getHookAddress: () => E(when(hookAccountV)).getAddress(),
    }),
    creatorFacet: zone.exo('MyCreator', undefined, {}),
  };
};

export const start = withOrchestration(contract);
harden(start);
