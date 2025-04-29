import {
  OrchestrationPowersShape,
  withOrchestration,
  type OrchestrationTools,
} from '@agoric/orchestration';
import { type VTransferIBCEvent } from '@agoric/vats';
import type { Zone } from '@agoric/zone';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { decodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import type { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
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
  const { makeHookAccount, swapAndSend } = orchestrateAll(flows, {});

  const { when } = tools.vowTools;

  const tap = zone.makeOnce('tapPosition', _key => {
    console.log('making tap');
    return zone.exo('tap', interfaceTODO, {
      async receiveUpcall(event: VTransferIBCEvent) {
        await null;
        console.log('receiveUpcall', event);
        switch (event.event) {
          case 'writeAcknowledgement': {
            // Extract the incoming packet data.
            const {
              amount,
              denom,
              receiver: origReceiver,
            } = JSON.parse(event.packet.data) as FungibleTokenPacketData;

            // Extract the destination address and denomination.
            const { baseAddress, query } = decodeAddressHook(origReceiver);
            const { DST: receiver, SWP: swapDenom } = query;
            assert.typeof(receiver, 'string');
            assert.typeof(swapDenom, 'string');

            // Invoke the flow to perform swap and end up at the final destination.
            return swapAndSend({
              amount: BigInt(amount),
              denom,
              swapDenom,
              sender: baseAddress,
              receiver,
            });
          }

          default: {
            break;
          }
        }
      },
    });
  });

  const hookAccountV = zone.makeOnce('hookAccount', _key =>
    makeHookAccount(tap),
  );

  return {
    publicFacet: zone.exo('PaymentPub', interfaceTODO, {
      getHookAddress: () => E(when(hookAccountV)).getAddress(),
    }),
    creatorFacet: zone.exo('PaymentCreator', undefined, {}),
  };
};

export const start = withOrchestration(contract);
harden(start);
