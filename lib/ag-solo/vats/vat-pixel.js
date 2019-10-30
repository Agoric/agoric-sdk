import harden from '@agoric/harden';
import { makeSharingService } from '@agoric/ertp/more/sharing/sharing';
import { makeGallery } from '@agoric/ertp/more/pixels/gallery';
import pubsub from './pubsub';

// This vat contains the server-side resources for the demo. To
// enable local testing, it is loaded both into the chain and solo vat machines.

// This vat gets two messages. The first is delivered at startup time, giving
// the vat a chance to create any shared resources which will be used by all
// participants in the demo. It receives a reference to the Mint vat. It does
// not need to return anything.

// The second message is to provision each new participant. It receives the
// user's nickname, and should create a record of demo objects for them to
// use (named the "chainBundle"). The client will fetch this record when it
// starts up, making its properties available to the REPL on the `home`
// object (e.g. `home.gallery`, `home.sharingService`, etc).

function build(E, log) {
  let sharedGalleryUserFacet;
  let sharingService;
  let sharedDustAssay;
  let contractHost;

  const { publish: stateChangeHandler, subscribe } = pubsub(E);
  const canvasStatePublisher = { subscribe };

  async function startup(host) {
    // define shared resources

    const canvasSize = 10;
    const gallery = await makeGallery(
      E,
      log,
      host,
      stateChangeHandler,
      canvasSize,
    );
    sharedGalleryUserFacet = gallery.userFacet;
    // TODO: This initial state change may go in the gallery code eventually.
    stateChangeHandler(await E(gallery.readFacet).getState());
    const assays = await E(gallery.userFacet).getAssays();
    sharedDustAssay = assays.dustAssay;
    sharingService = makeSharingService();
    contractHost = host;
  }

  async function createPixelBundle(_nickname) {
    const gallery = sharedGalleryUserFacet;
    const purse = await sharedDustAssay.makeEmptyPurse();
    const chainBundle = {
      gallery,
      sharingService,
      purse,
      canvasStatePublisher,
      contractHost,
    };
    return harden(chainBundle);
  }

  return harden({ startup, createPixelBundle });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, helpers.log),
    helpers.vatID,
  );
}
