// @ts-check
import harden from '@agoric/harden';
import { makeRouterInterface } from '@agoric/swingset-vat/src/vats/network/router';

function build(E) {
  return harden(makeRouterInterface('/', E));
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(syscall, state, build, helpers.vatID);
}
