import harden from '@agoric/harden';

// This vat contains the chain-side provisioning service. To enable local
// testing, it currently lives in lib/ag-solo/vats/vat-provisioning.js, but
// it will move into the chain-side vats/ directory soon.

function build(E) {
  let demo;
  let comms;
  let http;

  async function register(d, c) {
    demo = d;
    comms = c;
  }

  // this will go away when vat-provisioning moves into the chain
  async function registerHTTP(h) {
    http = h;
  }

  async function pleaseProvision(nickname, pubkey) {
    const chainBundle = E(demo).provisionClient(nickname);
    const fetch = harden({
      getChainBundle() { return chainBundle; },
    });
    // For now, while this all lives on the solo side, we'll give the HTTP
    // REPL server access to the fetcher object directly.
    await E(http).registerFetch(fetch);

    // But when this moves to the chain, we'll provide the
    // chain-bundle-fetcher object by registering it with comms, under the
    // client's public key.
    //
    // const INDEX = 1;
    // await E(comms).addEgress(pubkey, INDEX, fetch);
    // return { INDEX }
    //
    // on the solo side, we'll add something like this to bootstrap.js
    //
    // const fetch = await E(comms).addIngress(GCI, INDEX);
    // await E(http).registerFetch(fetch);
  }

  return harden({ register, registerHTTP, pleaseProvision });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E),
    helpers.vatID,
  );
}
