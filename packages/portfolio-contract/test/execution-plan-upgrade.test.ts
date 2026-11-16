// The strict environment must be installed before importing vat-data users.

import {
  annihilate,
  nextLife,
  getBaggage,
} from '@agoric/swingset-liveslots/tools/prepare-strict-test-env.js';
import test from 'ava';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { prepareVowTools } from '@agoric/vow';
import { prepareAsyncFlowTools } from '@agoric/async-flow';
import { makeCopyMap } from '@endo/patterns';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { executePlan } from '../src/portfolio.flows.ts';

/**
 * The pre-envelope executePlan prefix, through its first durable wait.
 * The pending vow prevents reaching code omitted from this fixture.
 */
const legacyWaitingExecutor = async (
  _orch: unknown,
  _ctx: unknown,
  _seat: unknown,
  _args: unknown,
  kit: any,
  _detail: unknown,
  started: any,
) => {
  kit.reader.getPortfolioId();
  const { stepsP } = started;
  await null;
  await stepsP;
  throw Error('legacy fixture must be upgraded before plan resolution');
};

for (const shape of ['array', 'plan', 'envelope'] as const) {
  test.serial(
    `pending legacy executePlan replays with ${shape} resolution`,
    async t => {
      annihilate();
      const prepare = (legacy: boolean) => {
        const zone = makeDurableZone(getBaggage(), 'executionUpgrade');
        const vt = prepareVowTools(zone);
        const { asyncFlow, adminAsyncFlow } = prepareAsyncFlowTools(zone, {
          vowTools: vt,
          panicHandler: error => {
            t.log(error);
            t.fail('unexpected async-flow panic');
          },
        });
        const host = zone.exo('Host', undefined, {
          getPortfolioId: () => 12,
          publishFlowStatus: (_id: number, status: unknown) => {
            t.deepEqual(status, { state: 'done' });
          },
          hasExited: () => true,
          finishFlow: (id: number) => {
            t.is(id, 1);
          },
        });
        const pending = zone.makeOnce('pending', () => vt.makeVowKit());
        const run = asyncFlow(
          zone,
          'executePlan',
          legacy ? legacyWaitingExecutor : executePlan,
        );
        const outcome = zone.makeOnce('outcome', () =>
          run(
            undefined as any,
            undefined as any,
            host as any,
            {},
            harden({ reader: host, reporter: host }) as any,
            undefined,
            harden({ flowId: 1, stepsP: pending.vow }) as any,
          ),
        );
        return { vt, pending, outcome, adminAsyncFlow };
      };
      const first = prepare(true);
      await eventLoopIteration();
      t.is(
        first.adminAsyncFlow
          .getFlowForOutcomeVow(first.outcome)!
          .getFlowState(),
        'Running',
      );
      nextLife();
      const second = prepare(false);
      second.pending.resolver.resolve(
        harden(
          shape === 'array'
            ? []
            : shape === 'plan'
              ? { flow: [] }
              : { plan: { flow: [] } },
        ),
      );
      t.is(await second.vt.when(second.outcome), 'flow1');
      t.deepEqual(second.adminAsyncFlow.getFailures(), makeCopyMap([]));
    },
  );
}
