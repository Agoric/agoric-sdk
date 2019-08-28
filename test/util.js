export function checkKT(t, kernel, expected) {
  // extract the "kernel table" (a summary of all Vat clists) and assert that
  // the contents match the expected list. This does a sort of the two lists
  // before a t.deepEqual, which makes it easier to incrementally add
  // expected mappings.

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
  const got = Array.from(kernel.dump().kernelTable);
  got.sort(compareArraysOfStrings);
  expected = Array.from(expected);
  expected.sort(compareArraysOfStrings);
  t.deepEqual(got, expected);
}
