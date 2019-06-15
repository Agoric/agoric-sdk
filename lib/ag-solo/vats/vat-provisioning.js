import harden from '@agoric/harden';

// This vat contains the controller-side provisioning service. To enable local
// testing, it is loaded by both the controller and other ag-solo vat machines.

// This vat is blacklisted in launch-chain.js, to prevent it from loading
// on the chain nodes (just controller and solo vat machines).

function build(E) {
  let demo;
  let comms;
  let http;

  async function register(d, c) {
    demo = d;
    comms = c;
  }

  // This is only used to enable the ag-solo REPL to access the demo object.
  async function registerHTTP(h) {
    http = h;
  }

  async function pleaseProvision(nickname, pubkey) {
    const chainBundle = E(demo).getChainBundle(nickname);
    const fetch = harden({
      getChainBundle() {
        return chainBundle;
      },
    });

    // Add an egress for the pubkey.
    const INDEX = 1;
    await E(comms).addEgress(pubkey, INDEX, fetch);
    return { ingressIndex: INDEX };
  }

  return harden({ register, registerHTTP, pleaseProvision });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(syscall, state, E => build(E), helpers.vatID);
}
