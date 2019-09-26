import test from 'tape';
import promisesAplusTests from 'promises-aplus-tests';
import { maybeExtendPromise } from '../src/index';

test('Promises/A+ 1.1', t => {
  try {
    const EPromise = maybeExtendPromise(Promise);
    const adapter = {
      resolved: EPromise.resolve,
      rejected: EPromise.rejected,
      deferred() {
        const ret = {};
        ret.promise = new EPromise((resolve, reject) => {
          ret.resolve = resolve;
          ret.reject = reject;
        });
        return ret;
      },
    };
    promisesAplusTests(adapter, err => t.assert(!err));
  } catch (e) {
    t.assert(false, `Unexpected exception ${e}`);
  } finally {
    t.end();
  }
});
