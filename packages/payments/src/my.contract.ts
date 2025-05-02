import {
  OrchestrationPowersShape,
  registerChainsAndAssets,
  withOrchestration,
  type OrchestrationTools,
  type OrchestrationPowers,
  type CosmosChainInfo,
  type Denom,
  type DenomDetail,
  CosmosChainInfoShape,
  DenomDetailShape,
  DenomShape,
} from '@agoric/orchestration';
import { makeTracer, NonNullish } from '@agoric/internal';
import { type VTransferIBCEvent } from '@agoric/vats';
import type { Zone } from '@agoric/zone';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { decodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import type { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
import type { Marshaller } from '@agoric/internal/src/lib-chainStorage.js';
import * as flows from './my.flows.ts';

const trace = makeTracer('PaymentsContract');

export type PrivateArgs = OrchestrationPowers & {
  chainInfo?: Record<string, CosmosChainInfo>;
  assetInfo?: [Denom, DenomDetail & { brandKey?: string }][];
  marshaller: Marshaller;
};

const interfaceTODO = undefined;

export const meta = M.splitRecord({
  privateArgsShape: M.splitRecord(
    {
      // @ts-expect-error TypedPattern not recognized as record
      ...OrchestrationPowersShape,
      marshaller: M.remotable('marshaller'),
    },
    {
      chainInfo: M.recordOf(M.string(), CosmosChainInfoShape),
      assetInfo: M.arrayOf([
        DenomShape,
        M.and(DenomDetailShape, M.splitRecord({}, { brandKey: M.string() })),
      ]),
    },
  ),
});
harden(meta);

export const contract = async (
  zcf,
  privateArgs: PrivateArgs,
  zone: Zone,
  tools: OrchestrationTools,
) => {
  trace('Start contract');
  const { orchestrateAll, chainHub } = tools;
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

            /*
            // Extract the destination address and denomination.
            const addr = encodeAddressHook("agoric1blahblah", {
              DST: 'cosmos1taihetahieate',
              SWP: ''
            });
            // agoric10rchdaidideiadieeadiddaeadediad -> agoric1blahblah?DST=cosmos1&SWP=
            */
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

  void when(hookAccountV, async hookAccount => {
    const encoded = await E(privateArgs.marshaller).toCapData({
      hookAccount: hookAccount.getAddress(),
    });
    void E(NonNullish(privateArgs.storageNode)).setValue(
      JSON.stringify(encoded),
    );
  });

  registerChainsAndAssets(
    chainHub,
    zcf.getTerms().brands,
    privateArgs.chainInfo,
    privateArgs.assetInfo,
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
