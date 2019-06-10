// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { makeMint } from '../../core/issuers';
import { makeCompoundPixelAssayMaker } from '../../more/pixels/pixelAssays';
import { makeMintController } from '../../more/pixels/pixelMintController';

function build(_E, _log) {
  function makePixelListMint(canvasSize) {
    const makePixelListAssay = makeCompoundPixelAssayMaker(canvasSize);
    return makeMint('pixelList', makeMintController, makePixelListAssay);
  }
  return harden({ makePixelListMint, makeMint });
}
harden(build);

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, log),
    helpers.vatID,
  );
}
export default harden(setup);
