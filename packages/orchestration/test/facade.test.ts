/* eslint-disable @jessie.js/safe-await-separator */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { VowTools } from '@agoric/vow';
import { prepareSwingsetVowTools } from '@agoric/vow/vat.js';
import { setupZCFTest } from '@agoric/zoe/test/unitTests/zcf/setupZcfTest.js';
import { makeHeapZone } from '@agoric/zone';
import type { TestFn } from 'ava';
import type { OrchestrationFlow } from '../src/orchestration-api.js';
import { provideOrchestration } from '../src/utils/start-helper.js';
import { commonSetup } from './supports.js';

const test = anyTest as TestFn<{ vt: VowTools; orchestrateAll: any; zcf: ZCF }>;

test.beforeEach(async t => {
  const { facadeServices, commonPrivateArgs } = await commonSetup(t);
  const { zcf } = await setupZCFTest();
  const zone = makeHeapZone();
  const vt = prepareSwingsetVowTools(zone);

  const orchKit = provideOrchestration(
    zcf,
    zone.mapStore('test'),
    {
      agoricNames: facadeServices.agoricNames,
      timerService: facadeServices.timerService,
      storageNode: commonPrivateArgs.storageNode,
      orchestrationService: facadeServices.orchestrationService,
      localchain: facadeServices.localchain,
    },
    commonPrivateArgs.marshaller,
  );

  const { orchestrateAll } = orchKit;
  t.context = { vt, orchestrateAll, zcf };
});

test('calls between flows', async t => {
  const { vt, orchestrateAll, zcf } = t.context;

  const flows = {
    outer(orch, ctx, ...recipients) {
      return ctx.peerFlows.inner('Hello', ...recipients);
    },
    inner(orch, ctx, ...strs) {
      return Promise.resolve(strs.join(' '));
    },
  } as Record<string, OrchestrationFlow<any>>;

  const { outer, outer2, inner } = orchestrateAll(flows, {
    peerFlows: flows,
  });

  t.deepEqual(await vt.when(inner('a', 'b', 'c')), 'a b c');
  t.deepEqual(await vt.when(outer('a', 'b', 'c')), 'Hello a b c');
});

test('context mapping individual flows', async t => {
  const { vt, orchestrateAll, zcf } = t.context;

  const flows = {
    outer(orch, ctx, ...recipients) {
      return ctx.peerFlows.inner('Hello', ...recipients);
    },
    inner(orch, ctx, ...strs) {
      return Promise.resolve(strs.join(' '));
    },
  } as Record<string, OrchestrationFlow<any>>;

  const { outer } = orchestrateAll(flows, {
    peerFlows: { inner: flows.inner },
  });

  t.deepEqual(await vt.when(outer('a', 'b', 'c')), 'Hello a b c');
});
