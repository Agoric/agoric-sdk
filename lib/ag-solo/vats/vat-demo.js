import harden from '@agoric/harden';
import { makeHandoffService } from '@agoric/ertp/more/handoff/handoff';
import { makeGallery } from '@agoric/ertp/more/pixels/gallery';

// This vat contains the server-side resources for the demo. To
// enable local testing, it is loaded both into the chain and solo vat machines.

// This vat gets two messages. The first is delivered at startup time, giving
// the vat a chance to create any shared resources which will be used by all
// participants in the demo. It receives a reference to the Mint vat. It does
// not need to return anything.

// The second message is to provision each new participant. It receives the
// user's nickname, and should create a record of demo objects for them to
// use (named the "chainBundle"). The client will fetch this record when it
// starts up, making it available to the REPL as `home.chainBundle`.

function build(E) {
  let sharedGalleryUserFacet;
  let sharedHandoffService;

  async function startup(mint) {
    // define shared resources
    const canvasSize = 10;
    const gallery = makeGallery(E, canvasSize);
    sharedGalleryUserFacet = gallery.userFacet;

    // sharedMint = await E(mint).makeMint('sharedRoot');
    // sharedPurse = await E(sharedMint).mint(500, 'shared purse');
    // sharedIssuer = await E(sharedPurse).getIssuer();
    sharedHandoffService = makeHandoffService();
  }

  async function getChainBundle(nickname) {
    // const purse = E(sharedMint).mint(100);
    const gallery = sharedGalleryUserFacet;
    const handoffService = sharedHandoffService;
    const chainBundle = { gallery, handoffService };
    return harden(chainBundle);
  }

  return harden({ startup, getChainBundle });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(syscall, state, E => build(E), helpers.vatID);
}
