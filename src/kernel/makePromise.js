import harden from '@agoric/harden';

export default function makePair() {
  let res;
  let rej;
  const p = new Promise((resolve, reject) => {
    res = resolve;
    rej = reject;
  });
  return harden({ p, res, rej });
}
