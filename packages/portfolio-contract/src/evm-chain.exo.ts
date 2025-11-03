/**
 * @file Durable exo managing EVM chain account provisioning.
 */
import { makeTracer } from '@agoric/internal';
import { Fail } from '@endo/errors';
import { M } from '@endo/patterns';
import type { Passable } from '@endo/marshal';
import type { Vow, VowTools, VowResolver } from '@agoric/vow';
import { VowShape } from '@agoric/vow';
import type { Zone } from '@agoric/zone';
import type { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import type { Chain, DenomAmount } from '@agoric/orchestration';
import type { GMPAccountInfo } from './portfolio.exo.ts';
import type { GmpAddresses } from './portfolio.contract.ts';
import type { LocalAccount } from './portfolio.flows.ts';
import { prepareDurableQueue, type DurableQueue } from './durable-queue.exo.ts';
import { sendMakeAccountCall } from './pos-gmp.flows.ts';

const trace = makeTracer('EvmChain');

export type ProvisionContext = {
  label: string;
  lca: LocalAccount;
  feeAccountP: Promise<LocalAccount>;
  fee: DenomAmount;
  target: { axelarId: string; remoteAddress: `0x${string}` };
  gmpChain: Chain<{ chainId: string }>;
  gmpAddresses: GmpAddresses;
  evmGas: bigint;
};

// Waiters remain an in-memory array (VowKit is not Passable); ready becomes simple array.

type WaiterEntry = { tag: string; resolver: VowResolver<GMPAccountInfo> };
type EvmChainState = {
  readonly chainName: AxelarChain;
  readonly statusPath: readonly string[];
  readonly storePrefix: string;
  ready: GMPAccountInfo[];
  /**
   * Shared provisioning configuration. The same fee account and Axelar routing
   * settings are reused for every makeAccount attempt; we only derive a fresh
   * label per request when the work is dispatched.
   */
  readonly provisionBase: ProvisionContext;
  /** Durable queue of waiter entries including resolver. */
  waiters: DurableQueue<WaiterEntry>;
  nextLabelSuffix: number;
  outstanding: number;
  factoryAddress?: `0x${string}`;
};

const makeStatusPayload = (state: EvmChainState): Passable => {
  return harden({
    chainName: state.chainName,
    readyCount: state.ready.length,
    waiterCount: state.waiters.size(),
    outstandingCount: state.outstanding,
  });
};

export type EvmChainKit = ReturnType<ReturnType<typeof prepareEvmChainKit>>;

// Internal default implementation performing the actual Axelar make-account flow.
const internalProvisionOne = async (context: ProvisionContext) => {
  const feeAccount = await context.feeAccountP;
  const fee = context.fee;
  fee.value > 0n || Fail`axelar makeAccount requires > 0 fee`;
  const src = feeAccount.getAddress();
  trace.sub(context.gmpChain).sub(context.label)(
    'send makeAccountCall Axelar fee from',
    src.value,
  );
  await feeAccount.send(context.lca.getAddress(), fee);
  await sendMakeAccountCall(
    context.target,
    fee,
    context.lca,
    context.gmpChain,
    context.gmpAddresses,
    context.evmGas,
  );
};

export const prepareEvmChainKit = (
  zone: Zone,
  {
    publishStatus,
    vowTools,
    provisionOneImpl = internalProvisionOne,
  }: {
    publishStatus: (path: string[], status: Passable) => void;
    vowTools: Pick<VowTools, 'makeVowKit' | 'asVow'>;
    /**
     * Implementation of a single provisioning attempt. Must return a Promise.
     * Rejection triggers retry via manager.handleFailure.
     */
    provisionOneImpl?: (ctx: ProvisionContext) => Promise<void>;
  },
) => {
  const makeWaitersQueue = prepareDurableQueue<WaiterEntry>(
    zone,
    'EvmChainWaitersQueue',
    { valueShape: M.any() },
  );

  return zone.exoClassKit(
    'EvmChainKit',
    {
      helper: M.interface('EvmChainHelperFacet', {
        publishState: M.call().returns(M.undefined()),
      }),
      account: M.interface('EvmChainAccountFacet', {
        requestAccount: M.call().returns(VowShape),
      }),
      admin: M.interface('EvmChainAdminFacet', {
        provisionMany: M.call(M.number()).returns(M.undefined()),
      }),
      manager: M.interface('EvmChainManagerFacet', {
        handleReady: M.call(M.any()).returns(M.undefined()),
        handleFailure: M.call(M.any()).returns(M.undefined()),
      }),
      tester: M.interface('EvmChainDebugFacet', {
        getStateSnapshot: M.call().returns(M.record()),
        dequeueWaiter: M.call().returns(M.opt(M.record())),
      }),
    },
    (
      chainName: AxelarChain,
      statusPath: readonly string[],
      storePrefix: string,
      provisionBase: ProvisionContext,
    ): EvmChainState => ({
      chainName,
      statusPath,
      storePrefix,
      ready: [],
      provisionBase,
      waiters: makeWaitersQueue(`${storePrefix}-waitersQ`),
      nextLabelSuffix: 0,
      outstanding: 0,
      factoryAddress: provisionBase.target.remoteAddress,
    }),
    {
      helper: {
        /**
         * Publish the current queue and provisioning status for external observers.
         */
        publishState() {
          const { state } = this;
          publishStatus(
            [...state.statusPath, state.chainName],
            makeStatusPayload(state),
          );
        },
      },
      account: {
        requestAccount(): Vow<GMPAccountInfo> {
          const { state, facets } = this;
          const [readyInfo, ...rest] = state.ready;
          if (readyInfo) {
            state.ready = rest;
            facets.helper.publishState();
            return vowTools.asVow(() => readyInfo);
          }
          const kit = vowTools.makeVowKit<GMPAccountInfo>();
          const tag = `${state.provisionBase.label}-waiter-${state.nextLabelSuffix}`;
          state.waiters.enqueue(harden({ tag, resolver: kit.resolver }));
          facets.admin.provisionMany(1);
          return kit.vow;
        },
      },
      admin: {
        provisionMany(count: number) {
          const { state, facets } = this;
          for (let i = 0; i < count; i += 1) {
            const suffix = state.nextLabelSuffix;
            state.nextLabelSuffix += 1;
            const ctx = harden({
              ...state.provisionBase,
              label: `${state.provisionBase.label}#${suffix}`,
            });
            state.outstanding += 1;
            // Assume promise-returning implementation; attach failure handler.
            void provisionOneImpl(ctx).catch(reason => {
              trace('provisionOneImpl failed', reason);
              facets.manager.handleFailure(reason);
            });
          }
          facets.helper.publishState();
        },
      },
      manager: {
        handleReady(info: GMPAccountInfo) {
          const { state, facets } = this;
          if (state.outstanding > 0) {
            state.outstanding -= 1;
          }
          const entry = state.waiters.dequeue();
          if (entry) {
            entry.resolver.resolve(info);
          } else {
            state.ready = [...state.ready, info];
          }
          facets.helper.publishState();
        },
        handleFailure(reason: unknown) {
          const { state, facets } = this;
          if (state.outstanding > 0) {
            state.outstanding -= 1;
          }
          trace('provision failure; retrying', reason);
          facets.admin.provisionMany(1);
        },
      },
      tester: {
        getStateSnapshot() {
          const { state } = this;
          return harden({
            ready: [...state.ready],
            waiterCount: Number(state.waiters.size()),
            outstanding: state.outstanding,
            nextLabelSuffix: state.nextLabelSuffix,
          });
        },
        dequeueWaiter() {
          return this.state.waiters.dequeue();
        },
      },
    },
  );
};
