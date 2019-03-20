import harden from '@agoric/harden';

export default function makePromise() {
  let res;
  let rej;
  const p = new Promise((resolve, reject) => {
    res = resolve;
    rej = reject;
  });
  return harden({ p, res, rej });
}
