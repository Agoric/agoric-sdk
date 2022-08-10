import { E } from '@endo/eventual-send';
import { isPromise } from '@endo/promise-kit';

const { details: X } = assert;

/**
 * @param {Error} innerErr
 * @param {string|number} label
 * @param {ErrorConstructor=} ErrorConstructor
 * @returns {never}
 */
export const throwLabeled = (innerErr, label, ErrorConstructor = undefined) => {
  if (typeof label === 'number') {
    label = `[${label}]`;
  }
  const outerErr = assert.error(
    `${label}: ${innerErr.message}`,
    ErrorConstructor,
  );
  assert.note(outerErr, X`Caused by ${innerErr}`);
  throw outerErr;
};
harden(throwLabeled);

/**
 * @template A,R
 * @param {(...args: A) => R} func
 * @param {A} args
 * @param {string|number} [label]
 * @returns {R}
 */
export const applyLabelingError = (func, args, label = undefined) => {
  if (label === undefined) {
    return func(...args);
  }
  let result;
  try {
    result = func(...args);
  } catch (err) {
    throwLabeled(err, label);
  }
  if (isPromise(result)) {
    return E.when(result, undefined, reason => throwLabeled(reason, label));
  } else {
    return result;
  }
};
harden(applyLabelingError);
