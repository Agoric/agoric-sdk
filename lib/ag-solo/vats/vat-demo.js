import harden from '@agoric/harden';
import makeHandoffService from '@agoric/SwingSet/demo/handoff/handoff';

// This vat contains the chain-side resources for the demo. To enable local
// testing, it currently lives in lib/ag-solo/vats/vat-demo.js, but it will
// move into the chain-side vats/ directory soon.

// This vat gets two messages. The first is delivered at startup time, giving
// the vat a chance to create any shared resources which will be used by all
// participants in the demo. It receives a reference to the Mint vat. It does
// not need to return anything.

// The second message is to provision each new participant. It receives the
// user's nickname, and should create a record of demo objects for them to
// use (named the "chainBundle"). The client will fetch this record when it
// starts up, making it available to the REPL as `home.chainBundle`.

function build(E) {
  let sharedMint;
  let sharedPurse;
  let sharedIssuer;
  let sharedHandoffService;

  async function startup(mint) {
    // define shared resources
    sharedMint = await E(mint).makeMint();
    sharedPurse = await E(sharedMint).mint(500, 'shared purse');
    sharedIssuer = await E(sharedPurse).getIssuer();
    sharedHandoffService = makeHandoffService();
  }

  async function provisionClient(nickname) {
    const purse = E(sharedMint).mint(100);
    const issuer = sharedIssuer;
    const handoffService = sharedHandoffService;
    const chainBundle = { purse, issuer, handoffService };
    return harden(chainBundle);
  }

  return harden({ startup, provisionClient });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E),
    helpers.vatID,
  );
}
