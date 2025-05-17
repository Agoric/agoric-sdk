// @ts-nocheck
import test from 'ava';

import { Far } from '@endo/marshal';
import { kser, kunser } from '@agoric/kmarshal';
import { setupTestLiveslots } from '../liveslots-helpers.js';
import { watchCollected } from '../gc-and-finalize.js';

test('virtual object state writes', async t => {
  let collected;

  const initData = { begin: 'ning' };
  const initStateData = { begin: kser(initData.begin) };

  function buildRootObject(vatPowers) {
    const { VatData } = vatPowers;
    const { defineKind } = VatData;
    const init = () => initData;
    const makeThing = defineKind('thing', init, {
      // eslint-disable-next-line no-unused-vars
      ping: ({ state }) => 0,
    });
    const root = Far('root', {
      make: () => {
        const thing = makeThing();
        collected = watchCollected(thing);
        return thing;
      },
      ping: thing => {
        collected = watchCollected(thing);
        return thing.ping();
      },
    });
    return root;
  }

  const tl = await setupTestLiveslots(t, buildRootObject, 'vatA');
  const { v, dispatchMessageSuccessfully } = tl;
  v.log.length = 0;

  // creating the VO will create the initial state data, but does not
  // require creation of a "context" nor the "state" accessor object
  const res = await dispatchMessageSuccessfully('make');
  const thingKSlot = kunser(res);
  const kref = thingKSlot.getKref(); // should be o+v10/1
  const vkey = `vom.${kref}`;
  const isGet = l => l.type === 'vatstoreGet';
  const isSet = l => l.type === 'vatstoreSet';
  const getReads = log => log.filter(l => isGet(l) && l.key === vkey);
  const getWrites = log => log.filter(l => isSet(l) && l.key === vkey);
  const getValues = log => getWrites(log).map(l => l.value);

  // the initial data should be written by end-of-crank
  t.deepEqual(getReads(v.log), []);
  t.deepEqual(JSON.parse(getValues(v.log)[0]), initStateData);

  // 'thing' is exported, but not held in RAM, so the Representative
  // should be dropped
  t.true(collected.result);

  // Invoking a method, on the other hand, *does* require creation of
  // "state" and "context", and creation of "state" requires reading
  // the state data (to learn the property names). The "ping" method
  // does not modify the state data, so there are no vatstore writes
  // afterwards.
  await dispatchMessageSuccessfully('ping', thingKSlot);

  t.is(getReads(v.log).length, 1);
  t.is(getWrites(v.log).length, 0);

  // 'thing' is again dropped by RAM, so it should be dropped. If
  // "context" were erroneously retained, it would stick around.
  t.true(collected.result);
});
