import harden from '@agoric/harden';

/**
 * Create a new promise and return an object containing the promise, the
 * resolver, and the rejector.
 *
 * This is a helper function to allow JavaScript promises to be used more like
 * E promises.  In E, promise creation returns a promise/resolver pair, whereas
 * JS provides the resolver to a callback function passed to the promise
 * constructor (which is inside out to minds coming from the E tradition).
 * Another E/JS difference is that the JS API distinguishes the resolver from
 * the rejector, a refinement which this E-inspired API embraces.
 *
 * @return an object {p, res, reject} holding the promise, resolver, and
 *    rejector.
 */
export default function makePromise() {
  let res;
  let rej;
  const p = new Promise((resolve, reject) => {
    res = resolve;
    rej = reject;
  });
  // Node.js adds the `domain` property which is not a standard
  // property on Promise. Because we do not know it to be ocap-safe,
  // we remove it.
  if (p.domain) {
    // deleting p.domain may break functionality. To retain current
    // functionality at the expense of safety, set unsafe to true.
    const unsafe = false;
    if (unsafe) {
      const originalDomain = p.domain;
      Object.defineProperty(p, 'domain', {
        get() {
          return originalDomain;
        },
      });
    } else {
      delete p.domain;
    }
  }
  // TODO: Retire name 'rej' as it looks too much like 'res'.
  return harden({ p, res, rej, reject: rej });
}
harden(makePromise);
