import { test, runDVOTest } from '../../tools/dvo-test-harness.js';

function bfile(name) {
  return new URL(name, import.meta.url).pathname;
}

async function dvoTestTest(t, mode) {
  function testLogCheck(_t, phase, log) {
    t.deepEqual(log, ['start test', phase, 'test thing', { mode }, 'end test']);
  }
  await runDVOTest(t, testLogCheck, bfile('vat-dvo-test-test.js'), { mode });
}

test.failing('fail during "before" phase', async t => {
  await dvoTestTest(t, 'before');
});

test.failing('fail during "after" phase', async t => {
  await dvoTestTest(t, 'after');
});

test('succeed', async t => {
  await dvoTestTest(t, 'succeed');
});
