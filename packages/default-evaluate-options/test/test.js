// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import makeDefaultEvaluateOptions from '../src';

test('sanity', async t => {
  try {
    const options = makeDefaultEvaluateOptions();
    t.assert(Array.isArray(options.shims), `options.shims is an array`);
    t.assert(
      Array.isArray(options.transforms),
      `options.transforms is an array`,
    );
    const sourceState = options.transforms.reduce(
      (ss, transform) => (transform.rewrite ? transform.rewrite(ss) : ss),
      { src: `foo~.bar`, endowments: {} },
    );

    t.equal(
      sourceState.src,
      `HandledPromise.get(foo, "bar");`,
      `eventual send operator is rewritten`,
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
