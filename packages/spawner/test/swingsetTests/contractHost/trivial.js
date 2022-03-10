import { Far } from '@endo/marshal';

export default function start(terms) {
  assert.equal(1, 1, `why is assert not in the globals`);
  console.log(`console.log is available in spawned code`);
  if (terms === 'loop immediately') {
    for (;;) {
      // Do nothing.
    }
  }
  return Far('trivial', {
    getTerms() {
      return `terms were: ${terms}`;
    },
    bar(x) {
      return x + 1;
    },
    loopForever() {
      for (;;) {
        // Do nothing.
      }
    },
    areYouOk() {
      return 'yes';
    },
    failureToFar() {
      return harden({
        failureReturn() {},
      });
    },
  });
}
