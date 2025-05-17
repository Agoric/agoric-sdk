import test from 'ava';

import { makeFakeVirtualObjectManager } from '../../tools/fakeVirtualSupport.js';

test('non-object initial data message', t => {
  const vom = makeFakeVirtualObjectManager();
  const goodInit = () => ({ value: 0 });
  // 'badInit' is  () =>  { value: 0 }
  //
  // badInit is subtly wrong (note the lack of parentheses) compared
  // to goodInit). It returns undefined, and includes an unused
  // "value:" label, plus a side-effect-free evaluation of a 0
  // constant. A linter might catch this, but maybe you didn't run
  // one.
  //
  // I frequently mean to write goodInit and write badInit
  // instead. It's such an easy mistake to make, so the VOM's instance
  // maker will catch it and complain.
  //
  // note: it is not easy to convince our editors and linters and
  // prettiers to leave this erroneous code in place

  // eslint-disable-next-line
  /* prettier-ignore */ const badInit = () => { value: 0 };

  const behavior = {};
  const makeGoodThing = vom.defineKind('goodthing', goodInit, behavior);
  const makeBadThing = vom.defineKind('badthing', badInit, behavior);
  makeGoodThing();
  const m = s => ({ message: s });
  t.throws(() => makeBadThing(), m(/initial data must be object, not /));
});
