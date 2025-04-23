import {
  OrchestrationPowersShape,
  withOrchestration,
} from '@agoric/orchestration';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import * as flows from './my.flows.ts';

/**
 * @import {VTransferIBCEvent} from '@agoric/vats'
 */
const interfaceTODO = undefined;

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
  const { makeHookAccount, makePosition } = orchestrateAll(flows, {});

  const { when } = tools.vowTools;

  const tap = zone.makeOnce('tapPosition', _key => {
    console.log('making tap');
    return zone.exo('tap', interfaceTODO, {
      /** @param {VTransferIBCEvent} event */
      async receiveUpcall(event) {
        console.log(event);
        return when(makePosition());
      },
    });
  });

  const hookAccountV = zone.makeOnce('hookAccount', _key =>
    makeHookAccount(tap),
  );

  return {
    publicFacet: zone.exo('MyPub', interfaceTODO, {
      getHookAddress: () => E(when(hookAccountV)).getAddress(),
    }),
    creatorFacet: zone.exo('MyCreator', undefined, {}),
  };
};

export const start = withOrchestration(contract);
harden(start);
