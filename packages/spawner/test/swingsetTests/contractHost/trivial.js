import { Far } from '@endo/marshal';

export default terms => {
  assert.equal(1, 1, `why is assert not in the globals`);
  console.log(`console.log is available in spawned code`);
  if (terms === 'loop immediately') {
    for (;;) {
      // Do nothing.
    }
  }
  return Far('trivial', {
    getTerms: () => `terms were: ${terms}`,
    bar: x => x + 1,
    loopForever: () => {
      for (;;) {
        // Do nothing.
      }
    },
    areYouOk: () => 'yes',
    failureToFar: () =>
      harden({
        failureReturn: () => {},
      }),
  });
};
