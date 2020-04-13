import { makeHandledPromise } from '.';

const shim = `\
(() => {
  const globalThis = this;

  // FIXME
  const harden = Object.freeze;

  const {
    defineProperties,
    getOwnPropertyDescriptors,
    getOwnPropertyDescriptor: gopd,
    getPrototypeOf,
    isFrozen,
    setPrototypeOf,
  } = Object;
  
  const { prototype: promiseProto } = Promise;
  const { then: originalThen } = promiseProto;

  // Add the HandledPromise global.
  globalThis.HandledPromise = globalThis.HandledPromise || (${makeHandledPromise})(Promise);
})()`;

// Adapt to ESM.
export default shim.replace(/_[a-z0-9]{3}\u200d\.g\./gs, '');
