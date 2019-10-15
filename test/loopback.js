import { test } from 'tape-promise/tape';
import { E, harden, makeCapTP } from '../lib/captp';

// TODO: remove .only when you have this test working
test('try loopback captp', async t => {
  try {
    const debug = false;
    let rightDispatch;
    const { dispatch: leftDispatch, getBootstrap: leftBootstrap } = makeCapTP(
      'left',
      obj => {
        if (debug) {
          console.log('toRight', obj);
        }
        rightDispatch(obj);
      },
    );
    ({ dispatch: rightDispatch } = makeCapTP(
      'right',
      obj => {
        if (debug) {
          console.log('toLeft', obj);
        }
        leftDispatch(obj);
      },
      harden({
        encourager: {
          encourage(name) {
            const bang = new Promise(resolve => {
              setTimeout(
                () =>
                  resolve({
                    trigger() {
                      return `${name} BANG!`;
                    },
                  }),
                200,
              );
            });
            return { comment: `good work, ${name}`, bang };
          },
        },
      }),
    ));
    const rightRef = leftBootstrap();
    const { comment, bang } = await E.C(rightRef).G.encourager.M.encourage(
      'buddy',
    ).P;
    t.equal(comment, 'good work, buddy', 'got encouragement');
    t.equal(await E(bang).trigger(), 'buddy BANG!', 'called on promise');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
