import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import type { AccountId, CaipChainId } from '@agoric/orchestration';
import { spy, spyOn } from 'tinyspy';

import type { EvmHash } from '@agoric/fast-usdc/src/types.ts';
import type { ExecutionContext } from 'ava';
import type { StatusManager } from '../../src/exos/status-manager.js';
import { startForwardRetrier } from '../../src/utils/forward-retrier.js';
import { makeRouteHealth } from '../../src/utils/route-health.js';

const { brand: USDC } = makeIssuerKit('USDC');

const setup = (t: ExecutionContext) => {
  const log = spy(t.log); // Use t.log for test output
  const routeHealth = makeRouteHealth(2); // Derelict after 2 failures
  const forwardFunds = spy<any, any>();
  const failedForwardsMap = new Map<
    CaipChainId,
    ReturnType<StatusManager['getForwardsToRetry']>
  >();

  const getForwardsToRetry: StatusManager['getForwardsToRetry'] = chain =>
    failedForwardsMap.get(chain) ?? [];

  // Need to capture the handlers passed to routeHealth
  let routeHealthHandlers:
    | Parameters<typeof routeHealth.setEventHandlers>[0]
    | null = null;
  spyOn(routeHealth, 'setEventHandlers').willCall(handlers => {
    routeHealthHandlers = handlers;
  });

  startForwardRetrier({
    getForwardsToRetry,
    forwardFunds,
    log,
    routeHealth,
    USDC,
  });

  t.teardown(() => {
    log.reset();
    forwardFunds.reset();
  });

  return {
    log,
    routeHealth,
    forwardFunds,
    failedForwardsMap,
    getForwardsToRetry,
    // Helper to simulate route health events
    triggerRouteEvent: (
      type: 'onEachFailure' | 'onWorking' | 'onDerelict',
      route: CaipChainId,
    ) => {
      if (!routeHealthHandlers) {
        throw new Error('Route health handlers not set');
      }
      const handler = routeHealthHandlers[type];
      if (handler) {
        handler(route);
      } else {
        t.fail(`Handler for ${type} not provided or registered`);
      }
    },
  };
};

test('retries failed forwards when route becomes working', t => {
  const { forwardFunds, failedForwardsMap, triggerRouteEvent } = setup(t);
  const route: CaipChainId = 'cosmos:agoric-3';
  const failed1 = {
    txHash: 'tx1' as EvmHash,
    amount: 100n,
    destination: `${route}:addr1` as AccountId,
  };
  const failed2 = {
    txHash: 'tx2' as EvmHash,
    amount: 200n,
    destination: `${route}:addr2` as AccountId,
  };
  failedForwardsMap.set(route, [failed1, failed2]);

  // Simulate route becoming working (e.g., after being derelict)
  triggerRouteEvent('onWorking', route);

  t.is(forwardFunds.callCount, 2, 'forwardFunds should be called twice');
  t.deepEqual(
    forwardFunds.calls[0][0],
    {
      txHash: failed1.txHash,
      amount: AmountMath.make(USDC, failed1.amount),
      destination: failed1.destination,
    },
    'First failed forward should be retried',
  );
  t.deepEqual(
    forwardFunds.calls[1][0],
    {
      txHash: failed2.txHash,
      amount: AmountMath.make(USDC, failed2.amount),
      destination: failed2.destination,
    },
    'Second failed forward should be retried',
  );
});

test('stops retrying if route becomes derelict during clearing', t => {
  const { routeHealth, forwardFunds, failedForwardsMap, triggerRouteEvent } =
    setup(t);
  const route: CaipChainId = 'cosmos:osmosis-1';
  const failed1 = {
    txHash: 'txA' as EvmHash,
    amount: 50n,
    destination: `${route}:addrA` as AccountId,
  };
  const failed2 = {
    txHash: 'txB' as EvmHash,
    amount: 60n,
    destination: `${route}:addrB` as AccountId,
  };
  failedForwardsMap.set(route, [failed1, failed2]);

  // Make routeHealth return false for isWorking after the first check
  const isWorkingStub = spyOn(routeHealth, 'isWorking');
  isWorkingStub.nextResult(true); // First call returns true
  isWorkingStub.nextResult(false); // Second call returns false

  // Simulate route becoming working (or failure event triggering attempt)
  triggerRouteEvent('onWorking', route); // Could also be onEachFailure

  t.is(forwardFunds.callCount, 1, 'forwardFunds should be called only once');
  t.deepEqual(
    forwardFunds.calls[0][0],
    {
      txHash: failed1.txHash,
      amount: AmountMath.make(USDC, failed1.amount),
      destination: failed1.destination,
    },
    'Only the first failed forward should be retried',
  );
});

test('does nothing if no failed forwards for the route', t => {
  const { forwardFunds, failedForwardsMap, triggerRouteEvent } = setup(t);
  const route: CaipChainId = 'cosmos:noble-1';
  failedForwardsMap.set(route, []); // No failed forwards for this route

  // Simulate route event
  triggerRouteEvent('onWorking', route);

  t.is(forwardFunds.callCount, 0, 'forwardFunds should not be called');
});

test('retries on onEachFailure if route is still working', t => {
  const { routeHealth, forwardFunds, failedForwardsMap, triggerRouteEvent } =
    setup(t);
  const route: CaipChainId = 'cosmos:cosmoshub-4';
  const failed1 = {
    txHash: 'txC' as EvmHash,
    amount: 70n,
    destination: `${route}:addrC` as AccountId,
  };
  failedForwardsMap.set(route, [failed1]);

  // Route health allows 2 failures, so it's still working after 1
  t.true(routeHealth.isWorking(route), 'Route should be working initially');

  // Simulate a failure event (which triggers attemptToClear)
  triggerRouteEvent('onEachFailure', route);

  t.is(forwardFunds.callCount, 1, 'forwardFunds should be called once');
  t.deepEqual(
    forwardFunds.calls[0][0],
    {
      txHash: failed1.txHash,
      amount: AmountMath.make(USDC, failed1.amount),
      destination: failed1.destination,
    },
    'Failed forward should be retried on failure event',
  );
});

test('does not retry on onEachFailure if route becomes derelict', t => {
  const { routeHealth, forwardFunds, failedForwardsMap, triggerRouteEvent } =
    setup(t);
  const route: CaipChainId = 'cosmos:secret-4';
  const failed1 = {
    txHash: 'txD' as EvmHash,
    amount: 80n,
    destination: `${route}:addrD` as AccountId,
  };
  failedForwardsMap.set(route, [failed1]);

  // Manually make the route derelict *before* the event
  routeHealth.noteFailure(route); // Failure 1
  routeHealth.noteFailure(route); // Failure 2 -> Derelict
  t.false(routeHealth.isWorking(route), 'Route should be derelict');

  // Simulate a failure event (which triggers attemptToClear)
  triggerRouteEvent('onEachFailure', route);

  t.is(
    forwardFunds.callCount,
    0,
    'forwardFunds should not be called as route is derelict',
  );
});
