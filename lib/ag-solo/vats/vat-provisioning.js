import harden from '@agoric/harden';

// This vat contains the controller-side provisioning service. To enable local
// testing, it is loaded by both the controller and other ag-solo vat machines.

function build(E) {
  let bundler;
  let comms;
  let vattp;

  async function register(b, c, v) {
    bundler = b;
    comms = c;
    vattp = v;
  }

  async function pleaseProvision(nickname, pubkey) {
    const chainBundle = E(bundler).createDemoBundle(nickname);
    const fetch = harden({
      getDemoBundle() {
        return chainBundle;
      },
    });

    // Add a remote and egress for the pubkey.
    const { transmitter, setReceiver } = await E(vattp).addRemote(pubkey);
    await E(comms).addRemote(pubkey, transmitter, setReceiver);

    const INDEX = 1;
    await E(comms).addEgress(pubkey, INDEX, fetch);
    return { ingressIndex: INDEX };
  }

  return harden({ register, pleaseProvision });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(syscall, state, E => build(E), helpers.vatID);
}
