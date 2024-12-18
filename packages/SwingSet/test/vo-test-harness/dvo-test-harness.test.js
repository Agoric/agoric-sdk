import { runDVOTest, test } from '../../tools/dvo-test-harness.js';

function bfile(name) {
  return new URL(name, import.meta.url).pathname;
}

/**
 * @param {import('ava').ExecutionContext} t
 * @param {'before' | 'after' | 'succeed'} mode
 */
const dvo = test.macro(async (t, mode) => {
  /**
   * @param {import('ava').ExecutionContext} _t
   * @param {'before' | 'after'} phase
   * @param {string[]} log
   */
  function testLogCheck(_t, phase, log) {
    t.deepEqual(
      log,
      [
        'start test',
        phase,
        mode === phase ? `fail during "${phase}"` : 'test thing',
        { mode },
        'end test',
      ],
      `Bad log for phase ${phase} with mode ${mode}`,
    );
  }
  await runDVOTest(t, testLogCheck, bfile('vat-dvo-test-test.js'), { mode });
});

test('fail during "before" phase', dvo, 'before');

test('fail during "after" phase', dvo, 'after');

test('succeed', dvo, 'succeed');
