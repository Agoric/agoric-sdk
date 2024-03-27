import test from 'ava';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { getReplHandler } from '../src/repl.js';

function make() {
  const homeObjects = { base: 1, fries: 2, cooking: 3 };
  const sentMessages = [];
  const send = m => sentMessages.push(m);
  const rh = getReplHandler({ home: homeObjects }, send);

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
  t.is(m.type, 'updateHistory');
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
  await eventLoopIteration();
  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 1);
  t.is(m.display, '3');
  t.deepEqual(sentMessages, []);
});

test('repl: bigInts', t => {
  const { doEval, sentMessages } = make();

  let m = sentMessages.shift();
  t.deepEqual(doEval(0, '3n'), {});
  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(sentMessages.length, 1);

  t.is(m.histnum, 0);
  t.is(m.display, 'working on eval(3n)');
  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 0);
  t.is(m.display, '3n');
  t.deepEqual(sentMessages, []);
});

test('repl: Symbols', t => {
  const { doEval, sentMessages } = make();

  let m = sentMessages.shift();

  let histnum = 0;
  const exprDisplays = ['asyncIterator', 'toStringTag', 'hasInstance'].map(
    name => [`Symbol.${name}`, `Symbol(Symbol.${name})`],
  );
  exprDisplays.push(
    [`Symbol.for('foo')`, `Symbol(foo)`],
    [`Symbol('foo')`, `Symbol(foo)`],
  );
  for (const [expr, display] of exprDisplays) {
    t.deepEqual(doEval(histnum, expr), {});
    m = sentMessages.shift();
    t.is(m.type, 'updateHistory');
    t.is(sentMessages.length, 1);

    t.is(m.histnum, histnum);
    t.is(m.display, `working on eval(${expr})`);
    m = sentMessages.shift();
    t.is(m.type, 'updateHistory');
    t.is(m.histnum, histnum);
    t.is(m.display, display);
    t.deepEqual(sentMessages, []);
    histnum += 1;
  }
});

test('repl: unjsonables', t => {
  const { doEval, sentMessages } = make();

  let m = sentMessages.shift();

  let histnum = 0;
  for (const valStr of ['NaN', 'Infinity', '-Infinity', 'undefined']) {
    t.deepEqual(doEval(histnum, valStr), {});
    m = sentMessages.shift();
    t.is(m.type, 'updateHistory');
    t.is(sentMessages.length, 1);

    t.is(m.histnum, histnum);
    t.is(m.display, `working on eval(${valStr})`);
    m = sentMessages.shift();
    t.is(m.type, 'updateHistory');
    t.is(m.histnum, histnum);
    t.is(m.display, valStr);
    t.deepEqual(sentMessages, []);
    histnum += 1;
  }
});

test('repl: sloppyGlobals, home, endowments', t => {
  const { doEval, sentMessages } = make();

  let m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
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

test('repl: eventual send', async t => {
  const { doEval, sentMessages } = make();

  let m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
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

  t.deepEqual(doEval(1, 'E(target).foo(2)'), {});
  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 1);
  t.is(m.display, 'working on eval(E(target).foo(2))');

  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 1);
  t.is(m.display, 'unresolved Promise');

  await eventLoopIteration();

  m = sentMessages.shift();
  t.is(m.type, 'updateHistory');
  t.is(m.histnum, 1);
  t.is(m.display, '3');
  t.deepEqual(sentMessages, []);
});
