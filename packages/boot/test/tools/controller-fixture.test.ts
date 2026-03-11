import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import type { TestFn } from 'ava';

import {
  forkScenario,
  makeBootControllerFixture,
  type ControllerFixture,
} from './controller-fixture.js';

const test = anyTest as TestFn<ControllerFixture>;

test.before(async t => {
  t.context = await makeBootControllerFixture({
    testModuleUrl: import.meta.url,
    bundles: {
      board: '@agoric/vats/src/vat-board.js',
    },
  });
});

test('forkScenario produces isolated controller forks', async t => {
  const forkA = await forkScenario(t);
  const forkB = await t.context.forkController();
  t.teardown(() => forkB.shutdown());

  const crank0 = forkA.getCrankNumber();
  t.is(forkB.getCrankNumber(), crank0);

  const boardVatConfig = {
    name: 'board',
    bundleCapName: 'board',
  };
  const boardRootA =
    await forkA.runUtils.EV.vat('bootstrap').createVat(boardVatConfig);
  t.truthy(boardRootA);
  t.true(forkA.getCrankNumber() > crank0);
  t.is(forkB.getCrankNumber(), crank0);

  const boardRootB =
    await forkB.runUtils.EV.vat('bootstrap').createVat(boardVatConfig);
  t.truthy(boardRootB);
});
