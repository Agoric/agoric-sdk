/* global harden */
// @ts-check

import { makeRouterProtocol } from '@agoric/swingset-vat/src/vats/network/router';

function build(E) {
  return harden(makeRouterProtocol(E));
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(syscall, state, build, helpers.vatID);
}
