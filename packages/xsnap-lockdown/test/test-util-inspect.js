import test from 'ava';
import '@endo/init/debug.js';
import inspect from 'object-inspect';
import { testCases } from './inspect-test-cases.js';

test('ambient util.inspect', t => {
  for (const testCase of testCases) {
    const [toEval, toRender = toEval, toRenderOriginal = toRender] =
      Array.isArray(testCase) ? testCase : [testCase, testCase, testCase];
    assert(typeof toEval === 'string');
    // eslint-disable-next-line no-eval
    const evaled = (1, eval)(`(${toEval})`);
    if (typeof toRenderOriginal === 'string') {
      // t.log(evaled);
      t.is(inspect(evaled), toRenderOriginal, toEval);
    } else {
      assert(toRenderOriginal && typeof toRenderOriginal === 'object');
      if (!toRenderOriginal.skip) {
        t.throws(() => inspect(evaled), toRenderOriginal, toEval);
      }
    }
  }
});
