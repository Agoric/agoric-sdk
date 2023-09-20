export const Fail = (template, ...args) => {
  throw Error(String.raw(template, ...args.map(val => String(val))));
};

export const assert = (cond, msg = 'check failed') => {
  if (!cond) {
    throw Error(msg);
  }
};

assert.typeof = (val, type) => {
  if (typeof val !== type) {
    throw Error(`expected ${type}, got ${typeof val}`);
  }
};

/** @type {<T>(val: T | undefined) => T} */
export const NonNullish = val => {
  if (!val) throw Error('required');
  return val;
};
