import test from 'ava';
import '@endo/init/debug.js';
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

test.failing('fail during "before" phase', async t => {
  await voTestTest(t, 'before');
});

test.failing('fail during "after" phase', async t => {
  await voTestTest(t, 'after');
});

test.failing('fail due to held object', async t => {
  await voTestTest(t, 'hold');
});

test.serial('succeed', async t => {
  await voTestTest(t, 'succeed');
});
