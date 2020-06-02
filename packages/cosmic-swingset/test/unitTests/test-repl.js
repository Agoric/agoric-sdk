import '@agoric/install-ses';
import { getReplHandler } from '../../lib/ag-solo/vats/repl';
import { test } from 'tape-promise/tape';

test('repl', async t => {
  try {
    const E = undefined;
    const homeObjects = { base: 1, fries: 2, cooking: 3 };
    const sentMessages = [];
    const send = m => sentMessages.push(m);
    const vatPowers = { power: 'rangers' };
    const rh = getReplHandler(E, homeObjects, send, vatPowers);

    const ch = rh.getCommandHandler();
    function getHighestHistory() {
      return ch.onMessage({ type: 'getHighestHistory' });
    }
    function rebroadcastHistory() {
      return ch.onMessage({ type: 'rebroadcastHistory' });
    }
    function doEval(histnum, body) {
      return ch.onMessage({ type: 'doEval', number: histnum, body });
    }

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

  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
