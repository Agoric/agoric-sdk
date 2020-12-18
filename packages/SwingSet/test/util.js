function compareArraysOfStrings(a, b) {
  a = a.join(' ');
  b = b.join(' ');
  if (a > b) {
    return 1;
  }
  if (a < b) {
    return -1;
  }
  return 0;
}

export function checkKT(t, kernel, expected) {
  // extract the "kernel table" (a summary of all Vat clists) and assert that
  // the contents match the expected list. This does a sort of the two lists
  // before a t.deepEqual, which makes it easier to incrementally add
  // expected mappings.

  const got = Array.from(kernel.dump().kernelTable);
  got.sort(compareArraysOfStrings);
  expected = Array.from(expected);
  expected.sort(compareArraysOfStrings);
  t.deepEqual(got, expected);
}

export function dumpKT(kernel) {
  const got = Array.from(
    kernel.dump().kernelTable,
  ).map(([kid, vatdev, vid]) => [vatdev, vid, kid]);
  got.sort(compareArraysOfStrings);
  for (const [vatdev, vid, kid] of got) {
    console.log(`${vatdev}:${vid} <-> ${kid}`);
  }
}

export function buildDispatch(onDispatchCallback = undefined) {
  const log = [];

  const dispatch = {
    deliver(targetSlot, method, args, resultSlot) {
      const d = { type: 'deliver', targetSlot, method, args, resultSlot };
      log.push(d);
      if (onDispatchCallback) {
        onDispatchCallback(d);
      }
    },
    notify(resolutions) {
      const d = { type: 'notify', resolutions };
      log.push(d);
      if (onDispatchCallback) {
        onDispatchCallback(d);
      }
    },
  };

  return { log, dispatch };
}

export function ignore(p) {
  p.then(
    () => 0,
    () => 0,
  );
}
