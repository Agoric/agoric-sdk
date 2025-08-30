import test from '@endo/ses-ava/prepare-endo.js';
import { makeTracer } from '../src/debug.js';

// See https://github.com/Agoric/agoric-sdk/issues/11845
// Even though this test demonstrates an unfixed bug, we write it as `test`
// rather than `test.failing` because we want to repro this exact buggy
// behavior. We also do not expect to ever fix this bug for `makeTracer` itself.
// Rather, we won't make this mistake in whatever replaces `makeTracer`.
test('repro #11845 makeTracer isolation breach', t => {
  const keyRegexp = harden(/^----- (.*)\.(\d+) $/);

  const alice = harden({
    write() {
      makeTracer('alice');
    },
  });

  const bob = harden({
    read() {
      const bobTracer = makeTracer('bob');
      let secretCount = 666;
      const allegedT = harden({
        log(key, ..._) {
          const matches = keyRegexp.exec(key);
          if (matches) {
            secretCount = Number.parseInt(matches[2], 10);
          }
        },
      });
      bobTracer(allegedT);
      return secretCount;
    },
  });

  // At this point, alice and bob should not be able to communicate. They are
  // both hardened, and the only things they both refer to freely,
  // `keyRegexp` and `makeTracer` should not enable communication between them.
  // Their ambient access to `makeTracer`, like their ambient access to
  // `console`, should only enable them to write to the console output,
  // which neither should be able to read.

  t.is(bob.read(), 1);
  t.is(bob.read(), 2);
  t.is(bob.read(), 3);
  alice.write();
  // Alice causes Bob to skip a count, showing they can still communicate.
  t.is(bob.read(), 5);
});
