/* global globalThis */
/* eslint-disable no-await-in-loop */

import test from 'tape-promise/tape';
import * as babelCore from '@babel/core';
import SES from 'ses';
import { makeEvaluators } from '@agoric/evaluate';

import replaceGlobalMeter from '@agoric/tame-metering/src/install-global-metering';
import { makeMeter, makeMeteredEvaluator } from '../src/index';

export const makeSESEvaluator = opts =>
  SES.makeSESRootRealm({ ...opts, consoleMode: 'allow' });

export const makeAgoricEvaluator = opts => {
  const { evaluateProgram } = makeEvaluators(opts);
  return {
    evaluate(src, endowments = {}) {
      return evaluateProgram(src, endowments);
    },
  };
};

export const makeLocalEvaluator = opts => ({
  evaluate(src, endowments = {}) {
    // console.log('evaluating src', src);
    const ss = opts.transforms.reduce(
      (prior, t) => (t.rewrite ? t.rewrite(prior) : prior),
      { src, endowments, sourceType: 'script' },
    );

    globalThis.getGlobalMeter = ss.endowments.getGlobalMeter;
    // eslint-disable-next-line global-require
    globalThis.RegExp = require('re2');

    // eslint-disable-next-line no-eval
    return (1, eval)(ss.src);
  },
});

test('metering evaluator', async t => {
  const rejectionHandler = (_e, _promise) => {
    // console.log('have', e);
  };
  try {
    process.on('unhandledRejection', rejectionHandler);
    const { meter, adminFacet } = makeMeter();
    const makeEvaluator = makeSESEvaluator; // makeSESEvaluator; // ideal
    const meteredEval = makeMeteredEvaluator({
      replaceGlobalMeter,
      babelCore,
      makeEvaluator,
      quiesceCallback: cb => setTimeout(cb),
    });

    // Destructure the output of the meteredEval.
    let exhaustedTimes = 0;
    let expectedExhaustedTimes = 0;
    const myEval = src => {
      Object.values(adminFacet).forEach(r => r());
      let whenQuiesced;
      const whenQuiescedP = new Promise(res => (whenQuiesced = res)).then(
        ({ exhausted, returned, exceptionBox }) => {
          // console.log('quiesced returned', exhausted, exceptionBox, returned);
          if (exhausted) {
            exhaustedTimes += 1;
            throw exhausted;
          }
          if (exceptionBox) {
            throw exceptionBox[0];
          }
          return returned;
        },
      );
      // Defer the evaluation for another turn.
      Promise.resolve()
        .then(_ => meteredEval(meter, src, {}, whenQuiesced))
        .catch(_ => {});
      return whenQuiescedP;
    };

    const src1 = `123; 456;`;
    t.equals(await myEval(src1), 456, 'trivial source succeeds');

    const failedToRejectUnderSES = () => {
      // FIXME: This skips tests that aren't currently working under SES.
      const times = makeEvaluator === makeSESEvaluator ? 0 : 1;
      expectedExhaustedTimes += times;
      return times === 0;
    };

    const src3a = `\
Promise.resolve().then(
  () => {
    while(true) {}
  });
0`;
    expectedExhaustedTimes += 1;
    await t.rejects(
      myEval(src3a),
      /Compute meter exceeded/,
      'promised infinite loop exhausts',
    );

    const src5a = `\
('x'.repeat(1e8), 0)
`;
    failedToRejectUnderSES() ||
      (await t.rejects(
        myEval(src5a),
        /Allocate meter exceeded/,
        'big string exhausts',
      ));

    const src5 = `\
(new Array(1e8), 0)
`;
    failedToRejectUnderSES() ||
      (await t.rejects(
        myEval(src5),
        /Allocate meter exceeded/,
        'big array exhausts',
      ));

    const src2 = `\
function f(a) {
  return f(a + 1) + f(a + 2);
}
f(1);
`;
    expectedExhaustedTimes += 1;
    await t.rejects(
      myEval(src2),
      /Stack meter exceeded/,
      'stack overflow exhausts',
    );

    const src3 = `\
while (true) {}
`;
    expectedExhaustedTimes += 1;
    await t.rejects(
      myEval(src3),
      /Compute meter exceeded/,
      'infinite loop exhausts',
    );

    const src3b = `\
(() => { while(true) {} })();
`;
    expectedExhaustedTimes += 1;
    await t.rejects(
      myEval(src3b),
      /Compute meter exceeded/,
      'nested loop exhausts',
    );

    const src4 = `\
/(x+x+)+y/.test('x'.repeat(10000));
`;
    t.equals(
      await myEval(src4),
      false,
      `catastrophic backtracking doesn't happen`,
    );

    const src6 = `\
new Array(1e8).map(Object.create); 0
`;
    failedToRejectUnderSES() ||
    await t.rejects(myEval(src6), /Allocate meter exceeded/, 'long map exhausts');

    t.equals(
      exhaustedTimes,
      expectedExhaustedTimes,
      `meter was exhausted ${expectedExhaustedTimes} times`,
    );
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    process.off('unhandledRejection', rejectionHandler);
    t.end();
  }
});
