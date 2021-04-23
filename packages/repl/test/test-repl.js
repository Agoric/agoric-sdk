import '@agoric/install-ses';
import { makeTransform } from '@agoric/transform-eventual-send';
import * as babelParser from '@agoric/babel-parser';
import babelGenerate from '@babel/generator';
import test from 'ava';
import { getReplHandler } from '../../lib/ag-solo/vats/repl';

function make() {
  const homeObjects = { base: 1, fries: 2, cooking: 3 };
  const sentMessages = [];
  const send = m => sentMessages.push(m);
  const transformTildot = makeTransform(babelParser, babelGenerate);
  const vatPowers = { transformTildot };
  const rh = getReplHandler({ home: homeObjects }, send, vatPowers);

  const ch = rh.getCommandHandler();
  function getHighestHistory() {
    return ch.onMessage({ type: 'getHighestHistory' });
  }
  // function rebroadcastHistory() {
  //   return ch.onMessage({ type: 'rebroadcastHistory' });
  // }
  function doEval(histnum, body) {
    return ch.onMessage({ type: 'doEval', number: histnum, body });
  }
  return { doEval, sentMessages, getHighestHistory };
}

test('repl: basic eval, eventual promise resolution', async t => {
  const { doEval, sentMessages, getHighestHistory } = make();

  let m = sentMessages.shift();
  t.deepEqual(m.type, 'updateHistory');
  t.is(sentMessages.length, 0);

  t.deepEqual(getHighestHistory(), { highestHistory: -1 });
  t.is(sentMessages.length, 0);

  t.deepEqual(doEval(0, '1+2'), {});
  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 0);
  t.is(m.display, 'working on eval(1+2)');
  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 0);
  t.is(m.display, '3');
  t.deepEqual(sentMessages, []);

  // exercise eventual promise resolution
  t.deepEqual(doEval(1, 'Promise.resolve(3)'), {});
  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 1);
  t.is(m.display, 'working on eval(Promise.resolve(3))');
  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 1);
  t.is(m.display, 'unresolved Promise');
  t.deepEqual(sentMessages, []);
  await Promise.resolve();
  await Promise.resolve(); // I don't know why two stalls are needed
  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 1);
  t.is(m.display, '3');
  t.deepEqual(sentMessages, []);
});

test('repl: bigInts', async t => {
  const { doEval, sentMessages } = make();

  let m = sentMessages.shift();
  t.deepEqual(doEval(0, '3n'), {});
  m = sentMessages.shift();
  t.deepEqual(m.type, 'updateHistory');
  t.is(sentMessages.length, 1);

  t.is(m.histnum, 0);
  t.is(m.display, 'working on eval(3n)');
  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 0);
  t.is(m.display, '3n');
  t.deepEqual(sentMessages, []);
});

// TODO(2278) The bug describes failures for Symbol, undefined, NaN, infinities
test.failing('repl: NaN', async t => {
  const { doEval, sentMessages } = make();

  let m = sentMessages.shift();
  t.deepEqual(doEval(0, 'NaN'), {});
  m = sentMessages.shift();
  t.deepEqual(m.type, 'updateHistory');
  t.is(sentMessages.length, 1);

  t.is(m.histnum, 0);
  t.is(m.display, 'working on eval(NaN)');
  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 0);
  t.is(m.display, 'NaN');
  t.deepEqual(sentMessages, []);
});

test('repl: sloppyGlobals, home, endowments', async t => {
  const { doEval, sentMessages } = make();

  let m = sentMessages.shift();
  t.deepEqual(m.type, 'updateHistory');
  t.is(sentMessages.length, 0);

  t.deepEqual(
    doEval(0, 'newGlobal = home.base + home.fries + home.cooking'),
    {},
  );
  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 0);
  t.truthy(m.display.startsWith('working on eval(newGlobal'));
  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 0);
  t.is(m.display, '6');
  t.deepEqual(sentMessages, []);

  t.deepEqual(doEval(1, 'newGlobal'), {});
  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 1);
  t.truthy(m.display.startsWith('working on eval(newGlobal'));
  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 1);
  t.is(m.display, '6');
  t.deepEqual(sentMessages, []);
});

test('repl: tildot', async t => {
  const { doEval, sentMessages } = make();

  let m = sentMessages.shift();
  t.deepEqual(m.type, 'updateHistory');
  t.is(sentMessages.length, 0);

  t.deepEqual(doEval(0, 'target = harden({ foo(x) { return x+1; } })'), {});
  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 0);
  t.truthy(m.display.startsWith('working on eval(target ='));
  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 0);
  t.is(m.display, '{"foo":[Function foo]}');
  t.deepEqual(sentMessages, []);

  t.deepEqual(doEval(1, 'target~.foo(2)'), {});
  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 1);
  t.is(m.display, 'working on eval(target~.foo(2))');

  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 1);
  t.is(m.display, 'unresolved Promise');

  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve(); // I don't know why three stalls are needed

  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 1);
  t.is(m.display, '3');
  t.deepEqual(sentMessages, []);
});
