// @ts-nocheck

/**
 * Install `Promise.withResolvers` on platforms that do not provide it yet.
 *
 * Import this before lockdown, since lockdown freezes `Promise`.
 */
if (!Promise.withResolvers) {
  Promise.withResolvers = () => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}
