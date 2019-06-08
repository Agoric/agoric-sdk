import Nat from '@agoric/nat';
import harden from '@agoric/harden';

import { makePixelListAssayMaker } from './pixelListAssay';
import { makeMint } from '../../core/issuers';
import { makeWholePixelList, insistPixelList } from './types/pixelList';
import { makeMintController } from './pixelMintController';

export function makeGallery(canvasSize = 10) {
  function getRandomColor() {
    return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
  }

  function makeRandomData() {
    const pixels = [];
    for (let x = 0; x < canvasSize; x += 1) {
      const pixelRow = [];
      for (let y = 0; y < canvasSize; y += 1) {
        pixelRow.push(getRandomColor());
      }
      pixels.push(pixelRow);
    }
    return pixels;
  }
  const state = makeRandomData();

  function setPixelState(pixel, newColor) {
    state[pixel.x][pixel.y] = newColor;
  }

  // create all pixels (list of raw objs)
  const allPixels = makeWholePixelList(canvasSize);

  // START ERTP

  const makePixelListAssay = makePixelListAssayMaker(canvasSize, true);
  const makeTransferAssay = makePixelListAssayMaker(canvasSize, false);
  const makeUseAssay = makePixelListAssayMaker(canvasSize, false);

  // a pixel represents the right to color and transfer the right to color
  const pixelMint = makeMint('pixels', makeMintController, makePixelListAssay);
  const pixelIssuer = pixelMint.getIssuer();
  const pixelAssay = pixelIssuer.getAssay();
  const pixelLabel = harden({ issuer: pixelIssuer, description: 'pixels' });

  const transferRightMint = makeMint(
    'pixelTransferRights',
    makeMintController,
    makeTransferAssay,
  );
  const useRightMint = makeMint(
    'pixelUseRights',
    makeMintController,
    makeUseAssay,
  );
  const useRightIssuer = useRightMint.getIssuer();
  const useRightAssay = useRightIssuer.getAssay();
  const transferRightIssuer = transferRightMint.getIssuer();
  const transferRightAssay = transferRightIssuer.getAssay();

  const allPixelsAmount = harden({
    label: pixelLabel,
    quantity: allPixels,
  });

  // mint all the pixels that will ever exist
  const galleryPurse = pixelMint.mint(allPixelsAmount, 'gallery');

  // get the pixelList from the LRU
  function getPixelPayment(rawPixelList) {
    insistPixelList(rawPixelList, canvasSize);
    const pixelAmount = {
      label: pixelLabel,
      quantity: rawPixelList,
    };
    const payment = galleryPurse.withdraw(pixelAmount);
    return payment;
  }

  const gallerySplitPixelPurse = pixelIssuer.makeEmptyPurse();

  // split pixelList into UseRights and TransferRights
  async function transformToTransferAndUse(pixelListPayment) {
    const pixelListAmount = pixelListPayment.getBalance();
    // fail early if empty
    const pixelList = pixelAssay.quantity(pixelListAmount);
    if (pixelList.length <= 0) {
      throw new Error('no pixels to transform');
    }

    const exclusivePayment = await pixelIssuer.getExclusiveAll(pixelListPayment);
    await gallerySplitPixelPurse.depositAll(exclusivePayment); // conserve pixels

    const { transferAmount, useAmount } = pixelAssay.toTransferAndUseRights(
      pixelListAmount,
      useRightAssay,
      transferRightAssay,
    );

    const transferRightPurse = transferRightMint.mint(transferAmount);
    const useRightPurse = useRightMint.mint(useAmount);

    const transferRightPayment = await transferRightPurse.withdrawAll(
      'transferRights',
    );
    const useRightPayment = await useRightPurse.withdrawAll('useRights');

    return {
      transferRightPayment,
      useRightPayment,
    };
  }

  // merge UseRights and TransferRights into a pixel
  async function transformToPixel(transferRightPayment) {
    // someone else may have the useRightPayment so we must destroy the
    // useRight

    // we have an exclusive on the transfer right
    const transferAmount = transferRightPayment.getBalance();
    const quantity = transferRightAssay.quantity(transferAmount);
    await transferRightIssuer.getExclusiveAll(transferRightPayment);

    // create a useRightAmount corresponding to transferRight
    const useAmount = useRightAssay.make(quantity);

    const pixelListAmount = pixelAssay.coerce(
      transferRightAssay.toPixel(
        {
          useAmount,
          transferAmount,
        },
        useRightAssay,
        pixelAssay,
      ),
    );

    // commit point
    await useRightMint.destroy(useAmount);
    await transferRightMint.destroy(transferAmount);

    const pixelPayment = await gallerySplitPixelPurse.withdraw(
      pixelListAmount,
      'pixels',
    ); // conserve pixels
    return pixelPayment;
  }

  function tapFaucet() {
    const rawPixel = allPixels[Math.floor(Math.random() * allPixels.length)];
    return getPixelPayment(harden([rawPixel]));
  }

  function insistColor(_myColor) {
    // const allowedColors = new Map();
    // insist(allowedColors.has(myColor))`color is not allowed`;
  }

  const galleryUseRightPurse = useRightIssuer.makeEmptyPurse();

  async function changeColor(useRightPayment, newColor) {
    const pixelAmount = useRightPayment.getBalance();
    const pixelList = useRightAssay.quantity(pixelAmount);

    if (pixelList.length <= 0) {
      throw new Error('no use rights present');
    }

    // if this works, it was a useRightPayment
    // commit point
    // don't get exclusive
    await galleryUseRightPurse.depositAll(useRightPayment);
    insistColor(newColor);

    for (let i = 0; i < pixelList.length; i += 1) {
      const pixel = pixelList[i];
      setPixelState(pixel, newColor);
    }
  }

  function revokePixel(rawPixel) {
    const pixelList = harden([rawPixel]);
    const pixelAmount = pixelAssay.make(pixelList);
    const useRightAmount = useRightAssay.make(pixelList);
    const transferRightAmount = transferRightAssay.make(pixelList);

    pixelMint.destroy(pixelAmount);
    useRightMint.destroy(useRightAmount);
    transferRightMint.destroy(transferRightAmount);
  }

  // provide state the canvas html page
  function provideState() {
    return JSON.stringify(state);
  }

  // anyone can getColor, no restrictions, no tokens
  function getColor(x, y) {
    const rawPixel = { x: Nat(x), y: Nat(y) };
    return state[rawPixel.x][rawPixel.y];
  }

  function getIssuers() {
    return {
      pixelIssuer,
      useRightIssuer,
      transferRightIssuer,
    };
  }

  const userFacet = {
    changeColor,
    getColor,
    tapFaucet,
    transformToTransferAndUse,
    transformToPixel,
    getIssuers,
    getCanvasSize() {
      return canvasSize;
    },
  };

  const adminFacet = {
    revokePixel,
  };

  const readFacet = {
    provideState,
    getColor,
  };

  const gallery = {
    userFacet,
    adminFacet,
    readFacet,
  };

  return gallery;
}
