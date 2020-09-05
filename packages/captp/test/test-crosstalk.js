/* global harden */

import '@agoric/install-ses';
import test from 'ava';
import { makeFar, E } from '../lib/captp';

test('prevent crosstalk', async t => {
  const { objFar: rightRef } = makeFar(
    'alice',
    harden({
      isSide(objP, side) {
        return E(objP)
          .side()
          .then(s => t.is(s, side, `obj.side() is ${side}`));
      },
      side() {
        return 'right';
      },
    }),
  );

  await E(rightRef).isSide(rightRef, 'right');
  const leftRef = harden({
    side() {
      return 'left';
    },
  });
  await E(rightRef).isSide(leftRef, 'left');
});
