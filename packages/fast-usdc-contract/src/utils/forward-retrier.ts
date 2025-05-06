import { AmountMath, type Brand } from '@agoric/ertp';
import type { CaipChainId } from '@agoric/orchestration';
import type { HostForGuest } from '@agoric/orchestration/src/facade.js';
import { type RouteHealth } from './route-health.ts';

import type { StatusManager } from '../exos/status-manager.ts';
import type * as flows from '../fast-usdc.flows.ts';

type ForwardFundsFlow = HostForGuest<typeof flows.forwardFunds>;

export const startForwardRetrier = ({
  dequeueForwardFailedTx,
  forwardFunds,
  log = () => {},
  routeHealth,
  USDC,
}: {
  dequeueForwardFailedTx: StatusManager['dequeueForwardFailedTx'];
  forwardFunds: ForwardFundsFlow;
  log?: Console['log'];
  routeHealth: RouteHealth;
  USDC: Brand<'nat'>;
}): void => {
  /** Retry failed transactions on the destination chain as long as it's working */
  const attemptToClear = (chain: CaipChainId) => {
    if (!routeHealth.isWorking(chain)) {
      // route is not healthy; do not attempt to clear
      return;
    }
    const failedForward = dequeueForwardFailedTx(chain);
    if (!failedForward) {
      log(`No failed forwards to clear for ${chain}`);
      return;
    }
    log(
      `Attempting to clear ${failedForward.txHash} failed forward for ${chain}`,
    );

    const { txHash, amount: amtValue, destination } = failedForward;
    // TODO refactor amount types to avoid ERTP and have consistent naming
    const amount = AmountMath.make(USDC, amtValue);
    // XXX do we need to `watch()` ?
    void forwardFunds({
      txHash,
      amount,
      destination,
    });
  };

  const onFailure = (chain: CaipChainId) => {
    log(`Route ${chain} failed.`);
    attemptToClear(chain);
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
    onFailure,
    onWorking,
    onDerelict,
  });
};
