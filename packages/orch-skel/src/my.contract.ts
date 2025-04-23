import {
  OrchestrationPowersShape,
  withOrchestration,
  type OrchestrationTools,
} from '@agoric/orchestration';
import { type VTransferIBCEvent } from '@agoric/vats';
import type { Zone } from '@agoric/zone';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import * as flows from './my.flows.ts';

const interfaceTODO = undefined;

export const meta = M.splitRecord({
  privateArgsShape: {
    // @ts-expect-error TypedPattern not recognized as record
    ...OrchestrationPowersShape,
    marshaller: M.remotable('marshaller'),
  },
});
harden(meta);

export const contract = async (
  _zcf,
  _privateArgs,
  zone: Zone,
  tools: OrchestrationTools,
) => {
  const { orchestrateAll } = tools;
  const { makeHookAccount, makePosition } = orchestrateAll(flows, {});

  const { when } = tools.vowTools;

  const tap = zone.makeOnce('tapPosition', _key => {
    console.log('making tap');
    return zone.exo('tap', interfaceTODO, {
      async receiveUpcall(event: VTransferIBCEvent) {
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
