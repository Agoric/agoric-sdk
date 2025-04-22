import test from 'ava';

import { makeRouteHealth } from '../../src/utils/route-health.js';

// Use a smaller number for easier testing
const MAX_FAILURES = 3;

test('makeRouteHealth initial state', t => {
  const health = makeRouteHealth(MAX_FAILURES);
  t.true(health.isWorking('route:1'), 'Route should be ready initially');
});

test('makeRouteHealth noteFailure increments count', t => {
  const health = makeRouteHealth(MAX_FAILURES);
  health.noteFailure('route:1');
  t.true(
    health.isWorking('route:1'),
    'Route should still be ready after 1 failure',
  );
  health.noteFailure('route:1');
  t.true(
    health.isWorking('route:1'),
    'Route should still be ready after 2 failures',
  );
});

test('makeRouteHealth noteSuccess resets count', t => {
  const health = makeRouteHealth(MAX_FAILURES);
  health.noteFailure('route:1');
  health.noteFailure('route:1');
  t.true(health.isWorking('route:1'), 'Route should be ready before success');
  health.noteSuccess('route:1');
  t.true(health.isWorking('route:1'), 'Route should be ready after success');
  // Check internal state (not directly possible without exposing getFailureCount, but implied by isWorking)
  // Let's add a failure again to ensure it starts from 0
  health.noteFailure('route:1');
  t.true(
    health.isWorking('route:1'),
    'Route should be ready after 1 failure post-success',
  );
});

test('makeRouteHealth reaches max failures', t => {
  const health = makeRouteHealth(MAX_FAILURES);
  const route = 'relayer:max';

  for (let i = 0; i < MAX_FAILURES; i += 1) {
    t.true(
      health.isWorking(route),
      `Route should be ready after ${i} failures`,
    );
    health.noteFailure(route);
  }

  t.false(
    health.isWorking(route),
    `Route should not be ready after ${MAX_FAILURES} failures`,
  );

  // One more failure shouldn't change the state
  health.noteFailure(route);
  t.false(
    health.isWorking(route),
    `Route should still not be ready after ${MAX_FAILURES + 1} failures`,
  );

  // Success should reset readiness
  health.noteSuccess(route);
  t.true(health.isWorking(route), 'Route should be ready again after success');
});

test('makeRouteHealth handles multiple routes', t => {
  const health = makeRouteHealth(MAX_FAILURES);
  const route1 = 'route:A';
  const route2 = 'route:B';

  health.noteFailure(route1);
  health.noteFailure(route1);

  for (let i = 0; i < MAX_FAILURES; i += 1) {
    health.noteFailure(route2);
  }

  t.true(health.isWorking(route1), 'Route A should still be ready');
  t.false(health.isWorking(route2), 'Route B should not be ready');

  health.noteSuccess(route1);
  health.noteSuccess(route2);

  t.true(health.isWorking(route1), 'Route A should be ready after success');
  t.true(health.isWorking(route2), 'Route B should be ready after success');
});

test('makeRouteHealth onDerelict callback', t => {
  let derelictCalled = 0;
  let derelictRoute = '';
  const health = makeRouteHealth(MAX_FAILURES, {
    onDerelict: route => {
      derelictCalled += 1;
      derelictRoute = route;
    },
  });
  const route = 'callback:route';

  // Failures before max shouldn't trigger callback
  for (let i = 0; i < MAX_FAILURES - 1; i += 1) {
    health.noteFailure(route);
    t.is(
      derelictCalled,
      0,
      `onDerelict should not be called after ${i + 1} failures`,
    );
  }

  // Reaching max failures should trigger callback
  health.noteFailure(route);
  t.is(derelictCalled, 1, 'onDerelict should be called once at max failures');
  t.is(derelictRoute, route, 'onDerelict called with correct route');

  // Subsequent failures shouldn't trigger callback again
  health.noteFailure(route);
  t.is(
    derelictCalled,
    1,
    'onDerelict should not be called again after max failures',
  );
});

test('makeRouteHealth onWorking callback', t => {
  let workingCalled = 0;
  let workingRoute = '';
  const health = makeRouteHealth(MAX_FAILURES, {
    onWorking: route => {
      workingCalled += 1;
      workingRoute = route;
    },
  });
  const route = 'callback:route';

  // Success on a working route shouldn't trigger callback
  health.noteSuccess(route);
  t.is(workingCalled, 0, 'onWorking should not be called initially');

  health.noteFailure(route);
  health.noteSuccess(route);
  t.is(
    workingCalled,
    0,
    'onWorking should not be called after success on working route',
  );

  // Make the route derelict
  for (let i = 0; i < MAX_FAILURES; i += 1) {
    health.noteFailure(route);
  }
  t.false(health.isWorking(route), 'Route should be derelict');
  t.is(workingCalled, 0, 'onWorking should not be called yet');

  // Success on a derelict route should trigger callback
  health.noteSuccess(route);
  t.is(
    workingCalled,
    1,
    'onWorking should be called after success on derelict route',
  );
  t.is(workingRoute, route, 'onWorking called with correct route');
  t.true(health.isWorking(route), 'Route should be working again');

  // Another success shouldn't trigger callback again
  health.noteSuccess(route);
  t.is(workingCalled, 1, 'onWorking should not be called again');
});
