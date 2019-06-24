import test from 'tape';
import promisesAplusTests from 'promises-aplus-tests';
import makeEPromiseClass from '../src/index';

test('Promises/A+ 1.1', t => {
  let testErrs;
  try {
    const EPromise = makeEPromiseClass(Promise);
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
  } finally {
    t.end();
  }
});
