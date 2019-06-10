import harden from '@agoric/harden';

import {IS_CONTROLLER} from './gci';
import {addReplHandler} from './repl';

// This vat contains the HTTP request handler.

// This vat is blacklisted in launch-chain.js, to prevent it from loading
// on the chain nodes (just controller and solo vat machines).

function build(E, D) {
  let commandDevice, provisioner;
  const homeObjects = {};

  const handler = {};
  if (!IS_CONTROLLER) {
    // Merge in the REPL if we're not the controller.
    addReplHandler(handler, E, homeObjects, (msg) => D(commandDevice).sendBroadcast(msg));
  }
  handler.pleaseProvision = (nickname, pubkey) =>
    E(provisioner).pleaseProvision(nickname, pubkey);

  return {
    setCommandDevice(d) {
      commandDevice = d;
    },

    setProvisioner(p) {
      provisioner = p;
    },

    async registerFetch(fetch) {
      const chainBundle = await E(fetch).getChainBundle();
      Object.assign(homeObjects, chainBundle);
    },

    setChainPresence(p) {
      homeObjects.chain = p;
    },

    // devices.command invokes our inbound() because we passed to
    // registerInboundHandler()
    inbound(count, obj) {
      //console.log(`vat-http.inbound (from browser) ${count}`, obj);
      const p = Promise.resolve(handler[obj.type](obj));
      p.then(res => D(commandDevice).sendResponse(count, false, harden(res)),
             rej => D(commandDevice).sendResponse(count, true, harden(rej)));
    },
  };
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    (E,D) => harden(build(E,D)),
    helpers.vatID,
  );
}
