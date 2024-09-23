// @ts-nocheck
import '@endo/init/debug.js';
import test from 'ava';
import { Far } from '@endo/marshal';
import { kser } from '@agoric/kmarshal';
import { passStyleOf } from '@endo/pass-style';
import { PassStyleOfEndowmentSymbol } from '@endo/pass-style/endow.js';
import { makeLiveSlots } from '../src/index.js';
import { makeStartVat } from './util.js';
import { buildSyscall } from './liveslots-helpers.js';
import { makeMockGC } from './mock-gc.js';

test('vat globals', async t => {
  const { syscall } = buildSyscall();
  const gcTools = makeMockGC();
  const buildRootObject = () => Far('root', {});
  let called = 0;
  let vatGlobals;
  let inescapableGlobalProperties;
  const vatNS = harden({ buildRootObject });
  // buildVatNamespace
  const bVN = async (vG, iGP) => {
    called += 1;
    vatGlobals = vG;
    inescapableGlobalProperties = iGP;
    return vatNS;
  };

  const ls = makeLiveSlots(syscall, 'vatA', {}, {}, gcTools, undefined, bVN);
  t.is(called, 0); // not called yet
  await ls.dispatch(makeStartVat(kser()));
  t.is(called, 1);
  t.truthy(vatGlobals);

  // 'harden' is provided by SES (installed by the lockdown bundle),
  // not liveslots
  t.is(typeof vatGlobals.harden, 'undefined');

  // but liveslots provides VatData
  t.is(typeof vatGlobals.VatData, 'object');
  t.is(typeof vatGlobals.VatData, 'object');
  t.is(typeof vatGlobals.VatData.defineKind, 'function');
  t.is(typeof vatGlobals.VatData.defineKindMulti, 'function');
  t.is(typeof vatGlobals.VatData.defineDurableKind, 'function');
  t.is(typeof vatGlobals.VatData.defineDurableKindMulti, 'function');
  t.is(typeof vatGlobals.VatData.makeKindHandle, 'function');
  t.is(typeof vatGlobals.VatData.canBeDurable, 'function');
  t.is(typeof vatGlobals.VatData.providePromiseWatcher, 'function');
  t.is(typeof vatGlobals.VatData.watchPromise, 'function');
  t.is(typeof vatGlobals.VatData.makeScalarBigMapStore, 'function');
  t.is(typeof vatGlobals.VatData.makeScalarBigWeakMapStore, 'function');
  t.is(typeof vatGlobals.VatData.makeScalarBigSetStore, 'function');
  t.is(typeof vatGlobals.VatData.makeScalarBigWeakSetStore, 'function');

  t.is(typeof inescapableGlobalProperties.WeakMap, 'function');
  t.not(inescapableGlobalProperties.WeakMap, WeakMap);
  t.is(typeof inescapableGlobalProperties.WeakSet, 'function');
  t.not(inescapableGlobalProperties.WeakSet, WeakSet);
  t.is(
    typeof inescapableGlobalProperties[PassStyleOfEndowmentSymbol],
    'function',
  );
  // this is the passStyleOf created by liveslots, with a real WeakMap
  t.is(inescapableGlobalProperties[PassStyleOfEndowmentSymbol], passStyleOf);
});
