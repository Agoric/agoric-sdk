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
  type OrchestrationAccount,
} from '@agoric/orchestration';
import { swapAnythingViaHook } from '@agoric/orchestration/src/examples/swap-anything.flows.js';
import { makeTracer, NonNullish } from '@agoric/internal';
import { type VTransferIBCEvent } from '@agoric/vats';
import type { Zone } from '@agoric/zone';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { decodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';
import type { Marshaller } from '@agoric/internal/src/lib-chainStorage.js';
import * as flows from './my.flows.ts';

const trace = makeTracer('PaymentsContract');

export type OsmosiDex = {
  crosschainSwaps: {
    address: string;
  };
};

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
  const { orchestrateAll, chainHub, orchestrate } = tools;
  const { makeHookAccount } = orchestrateAll(flows, {});

  const { when } = tools.vowTools;

  let hookAccount: OrchestrationAccount<{ chainId: 'agoric' }>;

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
              extra: { receiver: origReceiver },
            } = await when(E(hookAccount).parseInboundTransfer(event.packet));

            const { query } = decodeAddressHook(origReceiver);
            const {
              finalReceiver,
              swapOutDenom,
              dex = 'osmo17p9rzwnnfxcjp32un9ug7yhhzgtkhvl9jfksztgw5uh69wac2pgs5yczr8',
            } = query;
            assert.typeof(dex, 'string');
            assert.typeof(finalReceiver, 'string');
            assert.typeof(swapOutDenom, 'string');

            // const dexSwapAndSend = swapAndSends[`${dex}SwapAndSend`];
            trace({
              amount,
              origReceiver,
              finalReceiver,
              swapOutDenom,
              dex,
            });

            // Invoke the flow to perform swap and end up at the final destination.
            return swapAnythingAddressHook(amount, {
              destAddr: dex,
              receiverAddr: finalReceiver,
              outDenom: swapOutDenom,
              onFailedDelivery: 'do_nothing',
              slippage: {
                slippagePercentage: '20',
                windowSeconds: 10,
              },
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

  const swapAnythingAddressHook = orchestrate(
    'swapAnythingViaHook',
    {
      chainHub,
      sharedLocalAccountP: hookAccountV,
      log: trace,
    },
    swapAnythingViaHook,
  );

  void when(hookAccountV, async lca => {
    hookAccount = lca;
    const encoded = await E(privateArgs.marshaller).toCapData({
      hookAccount: lca.getAddress(),
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
