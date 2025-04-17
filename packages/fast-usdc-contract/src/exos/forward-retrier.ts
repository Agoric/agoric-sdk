/**
 * @file Exo used to retried forward attempts that have failed more than once.
 *
 * Forward indicates the original advance failed and we are attempting to send
 * the end user their funds without requesting a fee.
 */

import type { HostInterface } from '@agoric/async-flow';
import type { ForwardFailedTx, LogFn } from '@agoric/fast-usdc/src/types.ts';
import type {
  AccountId,
  CaipChainId,
  ChainHub,
  Denom,
  OrchestrationAccount,
} from '@agoric/orchestration';
import type { Zone } from '@agoric/zone';
import type { Brand } from '@agoric/ertp';
import type { VowTools } from '@agoric/vow';
import { makeTracer } from '@agoric/internal';
import { M } from '@endo/patterns';
import { chainOfAccount } from '@agoric/orchestration/src/utils/address.js';
import { appendToStoredArray } from '@agoric/store/src/stores/store-utils.js';
import type { StatusManager } from './status-manager.ts';

type ForwardRetrierKitPowers = {
  // chainHub: ChainHub;
  getNobleICA: () => HostInterface<
    OrchestrationAccount<{ chainId: 'noble-1' }>
  >;
  getSettlementAccount: () => HostInterface<
    OrchestrationAccount<{ chainId: 'agoric-any' }>
  >;
  log?: LogFn;
  // FIXME: async flow fn
  retryForward: any;
  statusManager: StatusManager;
  // usdc: { brand: Brand<'nat'>; denom: Denom };
  vowTools: VowTools;
};

type ForwardRetrierConfig =
  | {
      /**
       * The maximum number of times to retry Forwards to a destination before
       * waiting for a healthy signal.
       * Defaults to `6n`, which intends to capture ~1 hour window assuming a 10
       * min timeout per forward attempt.
       */
      maxAttempts?: bigint;
    }
  | undefined;

/** The string template is for developer visibility but not meant to ever be parsed. */
type ForwardFailedTxKey = `forwardFailedTx:${CaipChainId}`;

/**
 * Get the key for the forwardFailedTxs MapStore
 * @param chainId
 */
const forwardFailedTxKeyOf = (chainId: CaipChainId): ForwardFailedTxKey => {
  return `forwardFailedTx:${chainId}`;
};

const ForwardRetrierKitI = harden({
  notifier: M.interface('ForwardRetrierNotifierI', {
    initForwardFailedTx: M.call(M.record()).returns(),
    notifyDestinationHealthy: M.call(M.string()).returns(),
    notifyDestinationUnhealthy: M.call(M.string()).returns(),
  }),
  self: M.interface('ForwardRetrierSelfI', {
    attemptToClearDestination: M.call(M.string()).returns(),
  }),
});

export const prepareForwardRetrierKit = (
  zone: Zone,
  {
    getNobleICA,
    getSettlementAccount,
    log = makeTracer('ForwardRetrier', true),
    retryForward,
    statusManager,
    vowTools: { watch },
  }: ForwardRetrierKitPowers,
  { maxAttempts = 6n }: ForwardRetrierConfig = {},
) => {
  /**
   * Failed forwards that have yet to make it to the EUD. Keyed by destination
   * chain id to facilitate logic that retries forwards when the path is observed
   * to be healthy.
   */
  const forwardFailedTxs: MapStore<ForwardFailedTxKey, ForwardFailedTx[]> =
    zone.mapStore('ForwardFailedTxs', {
      keyShape: M.string(),
      // TODO narrow
      valueShape: M.arrayOf(M.record()),
    });

  /**
   * A map that contains unhealthy destinations and the number of retry attempts.
   *
   * Used in the RetryForward flow.
   */
  const unhealthyDestinations = zone.mapStore<CaipChainId, bigint>(
    'unhealthyDestinations',
    {
      keyShape: M.string(),
      /** number of retry attempts  */
      valueShape: M.bigint(),
    },
  );

  /**
   * Returns a `ForwardFailedTx` to retry for a destination or undefined.
   *
   * @param chainId
   */
  const dequeueForwardFailedTx = (
    chainId: CaipChainId,
  ): ForwardFailedTx | undefined => {
    const key = forwardFailedTxKeyOf(chainId);
    if (!forwardFailedTxs.has(key)) return undefined;

    const failedTxs = forwardFailedTxs.get(key);
    if (failedTxs.length === 0) {
      // unexpected, but lets clean up
      forwardFailedTxs.delete(key);
      return undefined;
    }
    const [first, ...remaining] = failedTxs;
    if (remaining.length) {
      forwardFailedTxs.set(key, harden(remaining));
    } else {
      forwardFailedTxs.delete(key);
    }

    return harden(first);
  };

  return zone.exoClassKit(
    'Fast USDC Forward Retrier',
    ForwardRetrierKitI,
    () => ({}),
    {
      notifier: {
        /**
         * Track a failed forward attempt in `forwardFailedTxs`.
         *
         * For safety, if the tx is is already presently in the MapStore, no
         * entry is added.
         */
        initForwardFailedTx(tx: ForwardFailedTx) {
          const chainId = chainOfAccount(tx.destination);
          const key = forwardFailedTxKeyOf(chainId);

          // already tracked, return early
          if (forwardFailedTxs.has(key)) {
            const txs = forwardFailedTxs.get(key);
            if (txs.some(t => t.txHash === tx.txHash)) return;
          }

          appendToStoredArray(forwardFailedTxs, key, tx);
        },
        /**
         * Called by the `StatusManager` when it observes a successful advance
         * or forward to a particular destination.
         *
         * Will reset `maxAttempts` if the path has accumulated failures and
         * call `.attemptToClearDestination` to clear ForwardFailed txs to
         * the same destination.
         * @param destination
         */
        notifyDestinationHealthy(destination: AccountId) {
          const chainId = chainOfAccount(destination);

          if (unhealthyDestinations.has(chainId)) {
            // mark the chain as healthy by deleting it from the store
            log(chainId, 'destination is now healthy');
            unhealthyDestinations.delete(chainId);

            const key = forwardFailedTxKeyOf(chainId);
            if (forwardFailedTxs.has(key)) {
              const count = forwardFailedTxs.get(key).length;
              log('found', count, 'failed forwards to retry');
            }
          }

          // attempt to clear
          this.facets.self.attemptToClearDestination(chainId);
        },
        /**
         * Called by the `StatusManager` when it observes a failed advance
         * or forward to a particular destination.
         *
         * Will attempt to retry accumulated transactions to the destination
         * if we haven't hit `maxAttempts`.
         * @param destination
         */
        notifyDestinationUnhealthy(destination: AccountId) {
          const chainId = chainOfAccount(destination);
          if (!unhealthyDestinations.has(chainId)) {
            unhealthyDestinations.init(chainId, 1n);

            // attempt to clear
            this.facets.self.attemptToClearDestination(chainId);
            return;
          }
          const attempts = unhealthyDestinations.get(chainId);
          if (attempts >= maxAttempts) {
            log(
              `${chainId} unhealthy. max attempts ${maxAttempts} reached. waiting for healthy signal`,
            );
            return;
          }
          log(
            `${chainId} unhealthy. incrementing attempts to ${attempts + 1n} and retrying`,
          );
          unhealthyDestinations.set(chainId, attempts + 1n);

          // attempt to clear
          this.facets.self.attemptToClearDestination(chainId);
        },
      },
      self: {
        attemptToClearDestination(chainId: CaipChainId) {
          const tx = dequeueForwardFailedTx(chainId);
          if (!tx) return;

          log('found failed forward to retry', tx);

          const nobleIca = getNobleICA();
          const settlementAccount = getSettlementAccount();

          // XXX best way to invoke? should we watch? or ensure the flow never errors?
          // Note: the flow has access to `ForwardRetrier.notifer`
          void watch(retryForward(tx, nobleIca, settlementAccount));
        },
      },
    },
  );
};

export type MakeForwardRetrierKit = ReturnType<typeof prepareForwardRetrierKit>;

export type ForwardRetrierNotifier = ReturnType<
  ReturnType<typeof prepareForwardRetrierNotifier>
>;

export const prepareForwardRetrierNotifier = (
  zone: Zone,
  powers: ForwardRetrierKitPowers,
  config?: ForwardRetrierConfig,
) => {
  const makeKit = prepareForwardRetrierKit(zone, powers, config);
  return (...args: Parameters<MakeForwardRetrierKit>) =>
    makeKit(...args).notifier;
};
