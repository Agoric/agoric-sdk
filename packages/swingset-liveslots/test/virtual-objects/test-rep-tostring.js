import test from 'ava';
import '@endo/init/debug.js';
// this sets process.env.DEBUG = 'label-instances'
import './set-debug-label-instances.js';
// this samples it
import { makeFakeVirtualStuff } from '../../tools/fakeVirtualSupport.js';
// all tests in this file will be run with DEBUG='label-instances'
import { parseVatSlot } from '../../src/parseVatSlots.js';

const init = () => ({});
const behavior = {};
const facets = { foo: {}, bar: {} };
test('representatives with label-instances', async t => {
  const { fakeStuff, vom } = makeFakeVirtualStuff();
  const { getSlotForVal } = fakeStuff;
  const makeThing = vom.defineKind('thing', init, behavior);
  const thing1 = makeThing();
  const thing1vref = getSlotForVal(thing1);
  const thing2 = makeThing();
  const thing2vref = getSlotForVal(thing2);
  t.is(`${thing1}`, `[object Alleged: thing#${thing1vref}]`);
  t.is(`${thing2}`, `[object Alleged: thing#${thing2vref}]`);
});

test('facets with label-instances', async t => {
  const { fakeStuff, vom } = makeFakeVirtualStuff();
  const { getSlotForVal } = fakeStuff;
  const makeThings = vom.defineKindMulti('thing', init, facets);
  const thing1 = makeThings();
  const foo1vref = getSlotForVal(thing1.foo); // o+v10/1:1
  const foo1baseref = parseVatSlot(foo1vref).baseRef; // o+v10/1
  t.is(`${thing1.foo}`, `[object Alleged: thing foo#${foo1baseref}]`);

  const bar1vref = getSlotForVal(thing1.bar); // o+v10/1:0
  const bar1baseref = parseVatSlot(bar1vref).baseRef; // o+v10/1
  t.is(`${thing1.bar}`, `[object Alleged: thing bar#${bar1baseref}]`);
});
