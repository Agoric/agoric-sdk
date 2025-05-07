import { AmountMath, type Brand } from '@agoric/ertp';
import type { CaipChainId } from '@agoric/orchestration';
import type { HostForGuest } from '@agoric/orchestration/src/facade.js';
import { type RouteHealth } from './route-health.ts';

import type { StatusManager } from '../exos/status-manager.ts';
import type * as flows from '../fast-usdc.flows.ts';
import type { ForwardFailedTx } from '../typeGuards.ts';

type ForwardFundsFlow = HostForGuest<typeof flows.forwardFunds>;

export const startForwardRetrier = ({
  getForwardsToRetry,
  forwardFunds,
  log = () => {},
  routeHealth,
  USDC,
}: {
  getForwardsToRetry: StatusManager['getForwardsToRetry'];
  forwardFunds: ForwardFundsFlow;
  log?: Console['log'];
  routeHealth: RouteHealth;
  USDC: Brand<'nat'>;
}): void => {
  const forwardFailed = (failedForward: ForwardFailedTx) => {
    const { txHash, amount: amtValue, destination } = failedForward;
    // TODO refactor amount types to avoid ERTP and have consistent naming
    // UNTIL https://github.com/Agoric/agoric-sdk/issues/11357
    const amount = AmountMath.make(USDC, amtValue);
    // This synchronously returns a Vow that has its own resolution handling.
    void forwardFunds({
      txHash,
      amount,
      destination,
    });
  };
  /** Retry failed transactions on the destination chain as long as it's working */
  const attemptToClear = (chain: CaipChainId) => {
    const failedForwards = getForwardsToRetry(chain);
    if (!failedForwards.length) {
      log(`No failed forwards to clear for ${chain}`);
      return;
    }
    log(
      `Attempting to clear ${failedForwards.length} failed forwards for ${chain}`,
    );
    for (const failedForward of failedForwards) {
      if (!routeHealth.isWorking(chain)) {
        // stop trying
        break;
      }
      forwardFailed(failedForward);
    }
  };

  /**
   * Try just one because we don't know if the chain is working yet
   * and if it isn't we don't want congestion with so many attempts.
   */
  const attemptOne = (chain: CaipChainId) => {
    const failedForwards = getForwardsToRetry(chain);
    if (!failedForwards.length) {
      log(`No failed forwards to try for ${chain}`);
      return;
    }
    log(
      `Retrying one of ${failedForwards.length} failed forwards for ${chain}`,
    );
    // XXX assumes the first is as good as any other to retry
    forwardFailed(failedForwards[0]);
  };

  const onEachFailure = (chain: CaipChainId) => {
    log(`Route ${chain} failed.`);
    // If the route is still working, retry one of the failed forwards
    // to see if it succeeds. When too many failures occur, the route
    // becomes derelict and we stop retrying.
    if (routeHealth.isWorking(chain)) {
      attemptOne(chain);
    }
  };
  const onWorking = (chain: CaipChainId) => {
    log(`Route ${chain} is working again.`);
    attemptToClear(chain);
  };
  const onDerelict = (chain: CaipChainId) =>
    log(
      `Route ${chain} is derelict. A successful transfer must be observed for failed forwards to be reattempted.`,
    );
  routeHealth.setEventHandlers({
    onEachFailure,
    onWorking,
    onDerelict,
  });
};
