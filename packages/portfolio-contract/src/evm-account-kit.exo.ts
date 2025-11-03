/**
 * @file Durable kit managing EVM account provisioning per Axelar chain.
 */
import { makeTracer } from '@agoric/internal';
import { Fail } from '@endo/errors';
import { M } from '@endo/patterns';
import { VowShape } from '@agoric/vow';
import type { MapStore } from '@agoric/store';
import type { Vow, VowKit, VowTools } from '@agoric/vow';
import type { Zone } from '@agoric/zone';
import type { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import type { CaipChainId } from '@agoric/orchestration';
import type { Passable } from '@endo/marshal';
import type { GMPAccountInfo } from './portfolio.exo.ts';

const trace = makeTracer('EvmAccountKit');

const nowIso = () => new Date().toISOString();

type ReadyMap = MapStore<string, GMPAccountInfo>;
type PendingMap = MapStore<string, PendingRequestState>;

type PendingRequestState = {
  label: string;
  requestedAt: string;
};

export type WaiterEntry = {
  label: string;
  vowKit: VowKit<GMPAccountInfo>;
};

export type ReserveResult =
  | { status: 'ready'; vow: Vow<GMPAccountInfo> }
  | { status: 'waiting'; vow: Vow<GMPAccountInfo> }
  | { status: 'provision'; vow: Vow<GMPAccountInfo>; requestId: string };

type LastFailure = {
  reason: Passable;
  at: string;
};

export type EvmAccountKitState = {
  readonly chainName: AxelarChain;
  readonly statusPath: readonly string[];
  chainId?: CaipChainId;
  factoryAddress?: `0x${string}`;
  lastFailure?: LastFailure;
  waiters: WaiterEntry[];
  ready: ReadyMap;
  pending: PendingMap;
};

export type EvmAccountKit = ReturnType<ReturnType<typeof prepareEvmAccountKit>>;

const EvmAccountStatusShape = M.splitRecord(
  {
    chainName: M.string(),
    pendingCount: M.number(),
    readyCount: M.number(),
    waiterCount: M.number(),
  },
  {
    lastFailure: M.opt(M.record()),
    chainId: M.opt(M.string()),
    factoryAddress: M.opt(M.string()),
  },
);

const makeStatusPayload = (state: EvmAccountKitState) => {
  const pendingCount = [...state.pending.keys()].length;
  const readyCount = [...state.ready.keys()].length;
  const waiterCount = state.waiters.length;
  const payload = {
    chainName: state.chainName,
    pendingCount,
    readyCount,
    waiterCount,
    ...(state.chainId && { chainId: state.chainId }),
    ...(state.factoryAddress && { factoryAddress: state.factoryAddress }),
    ...(state.lastFailure && { lastFailure: state.lastFailure }),
  };
  return harden(payload);
};

const initWaiters = (): WaiterEntry[] => harden([]);

const addWaiter = (waiters: WaiterEntry[], entry: WaiterEntry) =>
  harden([...waiters, entry]);

const takeWaiter = (waiters: WaiterEntry[]) => {
  if (waiters.length === 0) {
    return harden({ remaining: waiters, next: undefined });
  }
  const [next, ...rest] = waiters;
  return harden({ remaining: harden(rest), next });
};

const safeReason = (reason: unknown): Passable => {
  if (typeof reason === 'string') {
    return reason;
  }
  if (reason && typeof reason === 'object') {
    const { message } = reason as { message?: unknown };
    if (typeof message === 'string') {
      return harden({ message });
    }
  }
  return String(reason ?? 'unknown');
};

const clearPending = (pending: PendingMap) => {
  for (const key of pending.keys()) {
    pending.delete(key);
  }
};

const firstEntry = <K, V>(store: MapStore<K, V>): [K, V] | undefined => {
  const iterator = store.entries()[Symbol.iterator]();
  const { value, done } = iterator.next();
  return done ? undefined : (value as [K, V]);
};

export const prepareEvmAccountKit = (
  zone: Zone,
  {
    publishStatus,
    vowTools,
  }: {
    publishStatus: (path: string[], status: unknown) => void;
    vowTools: Pick<VowTools, 'makeVowKit' | 'asVow'>;
  },
) =>
  zone.exoClassKit(
    'EvmAccountKit',
    {
      account: M.interface('EvmAccountFacet', {
        getInfo: M.call().returns(VowShape),
        getStatus: M.call().returns(EvmAccountStatusShape),
      }),
      manager: M.interface('EvmAccountManagerFacet', {
        reserve: M.call(M.string()).returns(M.any()),
        markReady: M.call(M.record()).returns(M.undefined()),
        markFailed: M.call(M.any()).returns(M.undefined()),
        consumeReady: M.call().returns(M.opt(M.record())),
        setChainMetadata: M.call(M.opt(M.string()), M.opt(M.string())).returns(
          M.undefined(),
        ),
        publish: M.call().returns(M.undefined()),
      }),
    },
    (
      chainName: AxelarChain,
      ready: ReadyMap,
      pending: PendingMap,
      statusPath: readonly string[],
    ): EvmAccountKitState => ({
      chainName,
      statusPath,
      waiters: initWaiters(),
      ready,
      pending,
    }),
    {
      account: {
        getInfo() {
          const { waiters, ready } = this.state;
          if (waiters.length > 0) {
            return waiters[0].vowKit.vow;
          }
          const entry = firstEntry(ready);
          if (entry) {
            const [, info] = entry;
            return vowTools.asVow(() => info);
          }
          return vowTools.asVow(() => Fail`no account info available`);
        },
        getStatus() {
          return makeStatusPayload(this.state);
        },
      },
      manager: {
        reserve(label: string): ReserveResult {
          const { state } = this;
          trace(state.chainName, 'reserve', label);
          const existing = firstEntry(state.ready);
          if (existing) {
            const [key, info] = existing;
            state.ready.delete(key);
            this.facets.manager.publish();
            return { status: 'ready', vow: vowTools.asVow(() => info) };
          }
          const waiter = vowTools.makeVowKit<GMPAccountInfo>();
          state.waiters = addWaiter(state.waiters, { label, vowKit: waiter });
          if ([...state.pending.keys()].length === 0) {
            const requestId = `${label}:${state.waiters.length}`;
            state.pending.init(requestId, {
              label,
              requestedAt: nowIso(),
            });
            this.facets.manager.publish();
            return { status: 'provision', vow: waiter.vow, requestId };
          }
          this.facets.manager.publish();
          return { status: 'waiting', vow: waiter.vow };
        },
        markReady(info: GMPAccountInfo) {
          const { state } = this;
          trace(state.chainName, 'markReady', info.remoteAddress);
          state.chainId = info.chainId;
          const { remaining, next } = takeWaiter(state.waiters);
          state.waiters = remaining;
          if (next) {
            next.vowKit.resolver.resolve(info);
          } else {
            state.ready.init(info.remoteAddress, info);
          }
          clearPending(state.pending);
          state.lastFailure = undefined;
          this.facets.manager.publish();
        },
        markFailed(reason: unknown) {
          const { state } = this;
          trace(state.chainName, 'markFailed', reason);
          for (const waiter of state.waiters) {
            waiter.vowKit.resolver.reject(reason);
          }
          state.waiters = initWaiters();
          clearPending(state.pending);
          state.lastFailure = harden({
            reason: safeReason(reason),
            at: nowIso(),
          });
          this.facets.manager.publish();
        },
        consumeReady() {
          const { state } = this;
          const entry = firstEntry(state.ready);
          if (!entry) {
            return undefined;
          }
          const [key, info] = entry;
          state.ready.delete(key);
          this.facets.manager.publish();
          return info;
        },
        setChainMetadata(
          chainId?: CaipChainId,
          factoryAddress?: `0x${string}`,
        ) {
          const { state } = this;
          if (chainId) state.chainId = chainId;
          if (factoryAddress) state.factoryAddress = factoryAddress;
          this.facets.manager.publish();
        },
        publish() {
          const payload = makeStatusPayload(this.state);
          publishStatus(
            [...this.state.statusPath, this.state.chainName],
            payload,
          );
        },
      },
    },
  );
