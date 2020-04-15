// @ts-check
import harden from '@agoric/harden';
import { makeRouterPeer } from './network/router';

function build(E) {
  return harden(makeRouterPeer('/', E));
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(syscall, state, build, helpers.vatID);
}
