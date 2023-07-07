import test from 'ava';
import '@endo/init/debug.js';
import unconfinedInspect from '../lib/object-inspect.js';
import { testCases } from './inspect-test-cases.js';

test('unconfined inspect', t => {
  for (const testCase of testCases) {
    const [toEval, toRender = toEval] = Array.isArray(testCase)
      ? testCase
      : [testCase, testCase];
    assert(typeof toEval === 'string');
    // eslint-disable-next-line no-eval
    const evaled = (1, eval)(`(${toEval})`);
    // t.log(evaled);
    t.is(unconfinedInspect(evaled), toRender, toEval);
  }
});
