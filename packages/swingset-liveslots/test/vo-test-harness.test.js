import test from 'ava';
import { runVOTest } from '../tools/vo-test-harness.js';

async function voTestTest(t, mode) {
  let makeThing;

  // eslint thinks `retainer` is unused, but eslint is very wrong
  // eslint-disable-next-line no-unused-vars
  let retainer;

  function prepare(vatData) {
    makeThing = vatData.defineKind('thing', tag => ({ tag }), {
      getTag: ({ state }) => state.tag,
    });
  }

  function makeTestThing() {
    const result = makeThing('arbitrary test thing');
    if (mode === 'hold') {
      retainer = result;
    }
    return result;
  }

  function testTestThing(thing, phase) {
    if (phase === mode) {
      t.fail(`deliberate failure in ${phase} phase`);
    }
    t.is(
      thing.getTag(),
      'arbitrary test thing',
      `thing test failed in ${phase} phase`,
    );
  }

  await runVOTest(t, prepare, makeTestThing, testTestThing);
}

// Note: these first two are not marked "test.failing" because
// something is wrong and we need to fix it. Rather, they are
// confirming that the voTestTest harness would catch problems during
// downstream tests that use the harness, if those problems arose in
// the "before" or "after" phases, and reported by the downstream test
// calling t.fail. We test this here in case the harness e.g. just
// forgets to call testTestThing one or both times, so the downstream
// test code never got a chance to run. It is essential that this test
// fails, otherwise the harness is not doing its job, and is hiding
// real test failures in some downstream client package.

test.failing('fail during "before" phase', async t => {
  await voTestTest(t, 'before');
});

test.failing('fail during "after" phase', async t => {
  await voTestTest(t, 'after');
});

// Similarly, this test makes sure that our harness can detect when
// the downstream test misbehaves and holds on to the object they were
// supposed to drop.

test.failing('fail due to held object', async t => {
  await voTestTest(t, 'hold');
});

test.serial('succeed', async t => {
  await voTestTest(t, 'succeed');
});
