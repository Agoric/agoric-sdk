import { Far } from '@endo/marshal';
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { waitUntilQuiescent } from '@agoric/swingset-liveslots/test/waitUntilQuiescent.js';
import { makeAllManagersDo } from '../../src/vaultFactory/vaultDirector.js';

const makeFakeVM = (name, thrower) => {
  let okay = true;
  const fakeVM = Far('fakeVM', {
    doIt: () => {
      if (thrower) {
        okay = false;
        throw Error('whatever', name);
      }
      return name;
    },
    okay: () => okay,
  });
  return { self: fakeVM };
};

const makeFakeVMgrKits = () => {
  const kits = [];
  return {
    add: k => kits.push(k),
    get: i => kits[i],
  };
};

test(`AllManagersDo no throw`, async t => {
  const collMgr = [0, 1, 2];
  const kits = makeFakeVMgrKits();
  kits.add(makeFakeVM('A', false));
  kits.add(makeFakeVM('B', false));
  kits.add(makeFakeVM('C', false));

  const allManagersDo = makeAllManagersDo(collMgr, kits);
  // @ts-expect-error It's a fake
  const result = allManagersDo(vm => vm.doIt());
  t.is(result, undefined);
  t.true(kits.get(0).self.okay());
  t.true(kits.get(1).self.okay());
  t.true(kits.get(2).self.okay());
});

test(`AllManagersDo throw`, async t => {
  const collMgr = [0, 1, 2];
  const kits = makeFakeVMgrKits();
  kits.add(makeFakeVM('A', false));
  kits.add(makeFakeVM('B', true));
  kits.add(makeFakeVM('C', false));

  const allManagersDo = makeAllManagersDo(collMgr, kits);
  // @ts-expect-error It's a fake
  const result = allManagersDo(vm => vm.doIt());
  t.is(result, undefined);

  await waitUntilQuiescent();

  t.true(kits.get(0).self.okay());
  t.false(kits.get(1).self.okay());
  t.true(kits.get(2).self.okay());
});
