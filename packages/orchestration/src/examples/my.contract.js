import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { OrchestrationPowersShape } from '../typeGuards.js';
import { withOrchestration } from '../utils/start-helper.js';
import * as flows from './my.flows.js';

/**
 * @import {VTransferIBCEvent} from '@agoric/vats'
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationTools} from '../types.js';
 */

const interfaceTODO = undefined;

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
  const { makeHookAccount, makeNobleAccount, sendToEth } = orchestrateAll(
    flows,
    {},
  );

  const tap = zone.makeOnce('tapPosition', _key => {
    console.log('making tap');
    /** @satisfies {import('@agoric/vats/src/bridge-target.js').TargetApp} */
    const tap = zone.exo('tap', interfaceTODO, {
      /** @param {VTransferIBCEvent & import('@endo/marshal').Passable} event */
      async receiveUpcall(event) {
        harden(event);
        console.log(event);

        // TODO: vowTools.watch(sendTo..., handler)
        await vowTools.when(sendToEth(event, accounts));
      },
    });
    return tap;
  });

  const { vowTools } = tools;
  const hookAccountV = zone.makeOnce('hookAccount', _key =>
    makeHookAccount(tap),
  );
  const nobleAccountV = zone.makeOnce('nobleAccount', _key =>
    makeNobleAccount(),
  );
  const accounts = {
    hook: await vowTools.when(hookAccountV),
    noble: await vowTools.when(nobleAccountV),
  };
  const hookAddress = await E(accounts.hook).getAddress();

  return {
    publicFacet: zone.exo('MyPub', undefined, {
      getHookAddress: () => hookAddress,
    }),
    creatorFacet: zone.exo('MyCreator', undefined, {}),
  };
};

export const start = withOrchestration(contract);
harden(start);
