import '@agoric/install-ses';
import { makeTransform } from '@agoric/transform-eventual-send';
import * as babelParser from '@agoric/babel-parser';
import babelGenerate from '@babel/generator';
import { test } from 'tape-promise/tape';
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
  try {
    const { doEval, sentMessages, getHighestHistory } = make();

    let m = sentMessages.shift();
    t.deepEquals(m.type, 'updateHistory');
    t.equals(sentMessages.length, 0);

    t.deepEquals(getHighestHistory(), { highestHistory: -1 });
    t.equals(sentMessages.length, 0);

    t.deepEquals(doEval(0, '1+2'), {});
    m = sentMessages.shift();
    t.equals(m.type, 'updateHistory');
    t.equals(m.histnum, 0);
    t.equals(m.display, 'working on eval(1+2)');
    m = sentMessages.shift();
    t.equals(m.type, 'updateHistory');
    t.equals(m.histnum, 0);
    t.equals(m.display, '3');
    t.deepEquals(sentMessages, []);

    // exercise eventual promise resolution
    t.deepEquals(doEval(1, 'Promise.resolve(3)'), {});
    m = sentMessages.shift();
    t.equals(m.type, 'updateHistory');
    t.equals(m.histnum, 1);
    t.equals(m.display, 'working on eval(Promise.resolve(3))');
    m = sentMessages.shift();
    t.equals(m.type, 'updateHistory');
    t.equals(m.histnum, 1);
    t.equals(m.display, 'unresolved Promise');
    t.deepEquals(sentMessages, []);
    await Promise.resolve();
    await Promise.resolve(); // I don't know why two stalls are needed
    m = sentMessages.shift();
    t.equals(m.type, 'updateHistory');
    t.equals(m.histnum, 1);
    t.equals(m.display, '3');
    t.deepEquals(sentMessages, []);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
    throw e;
  } finally {
    t.end();
  }
});

test('repl: sloppyGlobals, home, endowments', async t => {
  try {
    const { doEval, sentMessages } = make();

    let m = sentMessages.shift();
    t.deepEquals(m.type, 'updateHistory');
    t.equals(sentMessages.length, 0);

    t.deepEquals(
      doEval(0, 'newGlobal = home.base + home.fries + home.cooking'),
      {},
    );
    m = sentMessages.shift();
    t.equals(m.type, 'updateHistory');
    t.equals(m.histnum, 0);
    t.ok(m.display.startsWith('working on eval(newGlobal'));
    m = sentMessages.shift();
    t.equals(m.type, 'updateHistory');
    t.equals(m.histnum, 0);
    t.equals(m.display, '6');
    t.deepEquals(sentMessages, []);

    t.deepEquals(doEval(1, 'newGlobal'), {});
    m = sentMessages.shift();
    t.equals(m.type, 'updateHistory');
    t.equals(m.histnum, 1);
    t.ok(m.display.startsWith('working on eval(newGlobal'));
    m = sentMessages.shift();
    t.equals(m.type, 'updateHistory');
    t.equals(m.histnum, 1);
    t.equals(m.display, '6');
    t.deepEquals(sentMessages, []);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
    throw e;
  } finally {
    t.end();
  }
});

test('repl: tildot', async t => {
  try {
    const { doEval, sentMessages } = make();

    let m = sentMessages.shift();
    t.deepEquals(m.type, 'updateHistory');
    t.equals(sentMessages.length, 0);

    t.deepEquals(doEval(0, 'target = harden({ foo(x) { return x+1; } })'), {});
    m = sentMessages.shift();
    t.equals(m.type, 'updateHistory');
    t.equals(m.histnum, 0);
    t.ok(m.display.startsWith('working on eval(target ='));
    m = sentMessages.shift();
    t.equals(m.type, 'updateHistory');
    t.equals(m.histnum, 0);
    t.equals(m.display, '{"foo":[Function foo]}');
    t.deepEquals(sentMessages, []);

    t.deepEquals(doEval(1, 'target~.foo(2)'), {});
    m = sentMessages.shift();
    t.equals(m.type, 'updateHistory');
    t.equals(m.histnum, 1);
    t.equals(m.display, 'working on eval(target~.foo(2))');

    m = sentMessages.shift();
    t.equals(m.type, 'updateHistory');
    t.equals(m.histnum, 1);
    t.equals(m.display, 'unresolved Promise');

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve(); // I don't know why three stalls are needed

    m = sentMessages.shift();
    t.equals(m.type, 'updateHistory');
    t.equals(m.histnum, 1);
    t.equals(m.display, '3');
    t.deepEquals(sentMessages, []);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
    throw e;
  } finally {
    t.end();
  }
});
