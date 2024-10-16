/* eslint-disable no-shadow */
/** @file utility library for working with lenses (composable getters/setters) */

const curry = (f, arity = f.length, ...args) =>
  arity <= args.length
    ? f(...args)
    : (...argz) => curry(f, arity, ...args, ...argz);

/**
 * Transforms a curried function into an uncurried function.
 *
 * @function
 * @param {Function} fn - The curried function to uncurry.
 * @returns {Function} The uncurried function.
 */
const uncurry =
  fn =>
  (...args) =>
    args.reduce((fn, arg) => fn(arg), fn);

const always = a => _b => a;

const compose =
  (...fns) =>
  args =>
    fns.reduceRight((x, f) => f(x), args);

const getFunctor = x => ({
  value: x,
  map: _f => getFunctor(x),
});

const setFunctor = x => ({
  value: x,
  map: f => setFunctor(f(x)),
});

const prop = curry((k, obj) => (obj ? obj[k] : undefined));

const assoc = curry((k, v, obj) => ({ ...obj, [k]: v }));

const lens = curry(
  (getter, setter) => F => target =>
    F(getter(target)).map(focus => setter(focus, target)),
);

const lensProp = k => lens(prop(k), assoc(k));

const lensPath = path => compose(...path.map(lensProp));

const view = curry((lens, obj) => lens(getFunctor)(obj).value);

const over = curry((lens, f, obj) => lens(y => setFunctor(f(y)))(obj).value);

const set = curry((lens, val, obj) => over(lens, always(val), obj));

export { curry, uncurry, lens, lensPath, lensProp, view, set, over };
