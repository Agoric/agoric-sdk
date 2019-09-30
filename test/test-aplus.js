import test from 'tape';
import promisesAplusTests from 'promises-aplus-tests';
import '../src/index';

test('Promises/A+ 1.1', t => {
  try {
    const adapter = {
      resolved: Promise.resolve,
      rejected: Promise.rejected,
      deferred() {
        const ret = {};
        ret.promise = new Promise((resolve, reject) => {
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
