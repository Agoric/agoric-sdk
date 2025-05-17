import test from 'ava';
import { Far } from '@endo/marshal';
import { kser, kslot } from '@agoric/kmarshal';
import { makeLiveSlots } from '../src/liveslots.js';
import { buildSyscall } from './liveslots-helpers.js';
import { makeStartVat, makeMessage, makeBringOutYourDead } from './util.js';
import { makeMockGC } from './mock-gc.js';

// Test for https://github.com/Agoric/agoric-sdk/issues/9956

test('delete remotable key from weakset', async t => {
  const { syscall, log } = buildSyscall();
  const gcTools = makeMockGC();
  const rem = Far('remotable', {});

  function buildRootObject(vatPowers) {
    const { VatData } = vatPowers;
    const { makeScalarBigWeakMapStore } = VatData;
    const wms = makeScalarBigWeakMapStore();
    return Far('root', {
      store: p => {
        wms.init(rem, p);
        gcTools.kill(p);
      },
    });
  }

  const makeNS = () => ({ buildRootObject });
  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, makeNS);
  const { dispatch } = ls;
  await dispatch(makeStartVat(kser()));

  await dispatch(makeMessage('o+0', 'store', [kslot('o-1')]));

  // pretend the Remotable was dropped from RAM
  log.length = 0;
  gcTools.kill(rem);
  gcTools.flushAllFRs();
  await dispatch(makeBringOutYourDead());

  // that ought to emit a drop and retire for the presence
  const gcCalls = log.filter(
    l => l.type === 'dropImports' || l.type === 'retireImports',
  );
  t.deepEqual(gcCalls, [
    { type: 'dropImports', slots: ['o-1'] },
    { type: 'retireImports', slots: ['o-1'] },
  ]);
  log.length = 0;
});
