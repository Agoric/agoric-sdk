/**
 * @file Durable exo managing EVM chain account provisioning.
 * @see {prepareEvmChainKit}
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

// Waiters are stored in a durable queue. The resolver (part of a VowKit) is
// supported by our durable layer, so each WaiterEntry can be safely enqueued
// durably. Ready accounts are stored as a simple array of passable
// GMPAccountInfo records inside durable state (the `ready` field), not merely
// ephemeral.

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
  /**
   * Monotonically increasing attempt counter. It is consumed ONLY when a
   * provisioning attempt is scheduled (admin.provisionMany), including retries.
   *
   * Usage patterns:
   *  - account.requestAccount() uses the CURRENT value (without increment) to
   *    form the waiter tag so the first attempt's label and its waiter share
   *    the same numeric suffix.
   *  - admin.provisionMany() then uses that same suffix for the attempt label
   *    and increments the counter afterwards.
   *  - Retries (manager.handleFailure → admin.provisionMany) consume a NEW
   *    suffix even if no additional waiter was enqueued, ensuring each attempt
   *    is uniquely traceable.
   *
   * Rationale: We want 1:1 pairing of initial waiter tag and first attempt
   * label for readability, while keeping subsequent retry labels unique. If we
   * increment during waiter enqueue we would lose that pairing. If distinct
   * counters for waiters vs attempts become desirable later, introduce
   * nextWaiterSuffix; current scheme is sufficient for tracing and tests.
   */
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
// Receives the shared immutable base context and a per-attempt unique label.
const internalProvisionOne = async (
  context: ProvisionContext,
  label: string,
) => {
  const feeAccount = await context.feeAccountP;
  const fee = context.fee;
  fee.value > 0n || Fail`axelar makeAccount requires > 0 fee`;
  const src = feeAccount.getAddress();
  trace.sub(context.gmpChain).sub(label)(
    'send makeAccountCall Axelar fee from',
    src.value,
  );
  // TODO DT remove the lcaAccount usage
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
     * Receives the shared base context and a unique per-attempt label.
     */
    provisionOneImpl?: (base: ProvisionContext, label: string) => Promise<void>;
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
        getStateSnapshot: M.call().returns(M.record()),
      }),
      manager: M.interface('EvmChainManagerFacet', {
        handleReady: M.call(M.any()).returns(M.undefined()),
        handleFailure: M.call(M.any()).returns(M.undefined()),
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
            state.nextLabelSuffix = suffix + 1;
            const label = `${state.provisionBase.label}.${suffix}`;
            state.outstanding += 1;
            // Assume promise-returning implementation; attach failure handler.
            void provisionOneImpl(state.provisionBase, label).catch(reason => {
              trace('provisionOneImpl failed', reason);
              facets.manager.handleFailure(reason);
            });
          }
          facets.helper.publishState();
        },
        getStateSnapshot() {
          const { state } = this;
          return harden({
            ready: [...state.ready],
            waiterCount: Number(state.waiters.size()),
            outstanding: state.outstanding,
            nextLabelSuffix: state.nextLabelSuffix,
          });
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
    },
  );
};
