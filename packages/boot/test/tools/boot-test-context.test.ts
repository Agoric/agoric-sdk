import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import type { TestFn } from 'ava';

import {
  attachBootContextHelpers,
  enhanceSmartWalletDriver,
  makeBootTestContext,
} from './boot-test-context.js';
import { makeSwingsetTestKit } from '../../tools/supports.js';
import { loadOrCreateRunUtilsFixture } from './runutils-fixtures.js';

const test = anyTest as TestFn;

const makeFakeBootCtx = () =>
  ({
    buildProposal: async (builderPath: string, args: string[] = []) => ({
      bundles: [],
      evals: [{ builderPath, args }],
    }),
    evalProposal: async () => undefined,
    readPublished: (path: string) => ({ path }),
    runUtils: {},
    storage: {
      data: new Map<string, string>(),
    },
  }) as any;

test('fixtureName boot context matches manual snapshot loading', async t => {
  const manualSnapshot = await loadOrCreateRunUtilsFixture('demo-base', t.log);
  const manual = await makeSwingsetTestKit(t.log, undefined, {
    configSpecifier: '@agoric/vm-config/decentral-demo-config.json',
    snapshot: manualSnapshot,
  });
  t.teardown(() => manual.shutdown());

  const viaFixture = await makeBootTestContext(t, {
    configSpecifier: '@agoric/vm-config/decentral-demo-config.json',
    fixtureName: 'demo-base',
  });
  t.teardown(() => viaFixture.shutdown());

  t.deepEqual(
    Object.keys(viaFixture.readPublished('agoricNames.brand')).sort(),
    Object.keys(manual.readPublished('agoricNames.brand')).sort(),
  );
  t.deepEqual(
    [...viaFixture.storage.data.entries()].slice(0, 10),
    [...manual.storage.data.entries()].slice(0, 10),
  );
});

test('attachBootContextHelpers applies proposals and runs afterProposal once', async t => {
  const calls: string[] = [];
  let refreshCount = 0;
  const ctx = attachBootContextHelpers(
    {
      ...makeFakeBootCtx(),
      buildProposal: async (builderPath: string, args: string[] = []) => {
        calls.push(`build:${builderPath}:${args.join(',')}`);
        return { bundles: [], evals: [] };
      },
      evalProposal: async () => {
        calls.push('eval');
      },
    },
    () => {
      refreshCount += 1;
    },
  );

  await ctx.applyProposal('builder.js', ['--x'], {
    refreshAgoricNames: true,
  });
  await ctx.applyProposals([
    { builderPath: 'first.js' },
    { builderPath: 'second.js', refreshAgoricNames: true },
  ]);

  t.deepEqual(calls, [
    'build:builder.js:--x',
    'eval',
    'build:first.js:',
    'eval',
    'build:second.js:',
    'eval',
  ]);
  t.is(refreshCount, 2);
});

test('published log helper reads resets and expects values', t => {
  const ctx = attachBootContextHelpers(makeFakeBootCtx());
  ctx.storage.data.set(
    'published.axelarGmp.log',
    JSON.stringify({ values: ['hello', 'world'] }),
  );

  const log = ctx.makePublishedLog('axelarGmp.log');
  t.deepEqual(log.read(), ['hello', 'world']);
  log.expect(t, ['hello', 'world']);
  log.reset();
  t.deepEqual(log.read(), []);
});

test('wallet assertion helpers fail with readable messages', t => {
  const wallet = enhanceSmartWalletDriver({
    getCurrentWalletRecord: () => ({
      offerToPublicSubscriberPaths: [],
      offerToUsedInvitation: [],
      purses: [],
    }),
    getLatestUpdateRecord: () =>
      ({
        updated: 'offerStatus',
        status: {
          id: 'missing-result',
          numWantsSatisfied: 1,
        },
      }) as any,
  } as any);

  const fakeT = {
    deepEqual: () => undefined,
    is: () => undefined,
    like: () => undefined,
    true(condition: unknown, message?: string) {
      if (!condition) {
        throw new Error(String(message));
      }
    },
  };

  t.throws(() => wallet.expectResult(fakeT as any, 'missing-result'), {
    message: 'Expected offer missing-result to have a result',
  });
});
