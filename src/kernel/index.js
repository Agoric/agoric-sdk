import harden from '@agoric/harden';
import p2 from './p2.js';

export default function buildKernel(kernelEndowments) {
  console.log('in buildKernel', kernelEndowments);
  const foo = p2();
  return harden({kernel: p2});
}
