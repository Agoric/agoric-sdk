import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import type { TestFn } from 'ava';

import type { SwingSetConfig } from '@agoric/swingset-vat';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import {
  forkScenario,
  makeControllerFixture,
  type ControllerFixture,
} from './controller-fixture.js';

const test = anyTest as TestFn<ControllerFixture>;

const importSpec = async spec =>
  new URL(importMetaResolve(spec, import.meta.url)).pathname;

const makeConfig = async (): Promise<SwingSetConfig> =>
  harden({
    bootstrap: 'bootstrap',
    defaultReapInterval: 'never',
    vats: {
      bootstrap: {
        sourceSpec: await importSpec(
          '@agoric/swingset-vat/tools/bootstrap-relay.js',
        ),
      },
    },
    bundles: {
      board: {
        sourceSpec: await importSpec('@agoric/vats/src/vat-board.js'),
      },
    },
    bundleCachePath: 'bundles',
  });

test.before(async t => {
  t.context = await makeControllerFixture({
    config: await makeConfig(),
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
