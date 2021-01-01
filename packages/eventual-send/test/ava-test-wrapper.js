// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

const { freeze } = Object;

const testWrapper = (title, testFunc) => {
  const testFuncWrapper = t => {
    let result;
    try {
      result = testFunc(t);
    } catch (err) {
      console.log('THROWN from ava test:', err);
      throw err;
    }
    if (Promise.resolve(result) === result) {
      return result.then(
        v => v,
        reason => {
          console.log('REJECTED from ava test:', reason);
          return result;
        },
      );
    } else {
      return result;
    }
  };
  return test(title, testFuncWrapper);
};
freeze(testWrapper);
export { testWrapper };
