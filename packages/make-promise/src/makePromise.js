import harden from '@agoric/harden';
import { HandledPromise } from '@agoric/eventual-send';

export function makePromise() {
  let res;
  let rej;
  // We use a HandledPromise so that we can run HandledPromise.unwrap(p)
  // even if p doesn't travel through a comms system (like SwingSet's).
  const p = new HandledPromise((resolve, reject) => {
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
  return harden({ promise: p, resolve: res, reject: rej });
}
harden(makePromise);

export function isPromise(maybePromise) {
  return HandledPromise.resolve(maybePromise) === maybePromise;
}
harden(isPromise);
