import Nat from '@agoric/nat';
import harden from '@agoric/harden';

import { makeCollect } from '../../core/contractHost';
import { insist } from '../../util/insist';
import { makePixelConfigMaker } from './pixelConfig';
import { makeMint } from '../../core/mint';
import { makeWholePixelList } from './types/pixelList';
import {
  makeInsistPixel,
  isEqual as isEqualPixel,
  getDistance,
  getDistanceFromCenter,
} from './types/pixel';

import { makeLruQueue } from './lruQueue';
import { getRandomColor } from './randomColor';

import { escrowExchangeSrcs } from '../../core/escrow';

function mockStateChangeHandler(_newState) {
  // does nothing
}

export function makeGallery(
  E,
  log,
  contractHost,
  stateChangeHandler = mockStateChangeHandler,
  canvasSize = 10,
) {
  function makeRandomData() {
    const pixels = [];
    for (let x = 0; x < canvasSize; x += 1) {
      const pixelRow = [];
      for (let y = 0; y < canvasSize; y += 1) {
        pixelRow.push(getRandomColor(x / canvasSize, y));
      }
      pixels.push(pixelRow);
    }
    return pixels;
  }
  const state = makeRandomData();

  // provide state for the canvas html page
  function getState() {
    return JSON.stringify(state);
  }

  // create all pixels (list of raw objs)
  const allPixels = makeWholePixelList(canvasSize);

  // create LRU for "seemingly unpredictable" output from faucet
  const { lruQueue, lruQueueBuilder, lruQueueAdmin } = makeLruQueue(
    isEqualPixel,
  );

  function insistNonEmptyAssetDesc(assay, assetDesc) {
    insist(!assay.getAssetDescOps().isEmpty(assetDesc))`\
      no use rights present in assetDesc ${assetDesc}`;
  }

  function insistAssetHasAssetDesc(assay, asset, assetDesc) {
    insist(assay.getAssetDescOps().includes(asset.getBalance(), assetDesc))`\
      ERTP asset ${asset} does not include assetDesc ${assetDesc}`;
  }

  function getPixelList(assay, assetDesc) {
    return assay.getAssetDescOps().extent(assetDesc);
  }

  const collect = makeCollect(E, log);

  function insistColor(allegedColor) {
    // TODO: write rules
    insist(true)`color ${allegedColor} must be a valid color`;
  }

  function setPixelListState(pixelList, newColor) {
    for (let i = 0; i < pixelList.length; i += 1) {
      const pixel = pixelList[i];
      state[pixel.x][pixel.y] = newColor;
      // eslint-disable-next-line no-use-before-define
      lruQueue.requeue(pixel);
    }

    // for now we pass the whole state, but only once per call
    stateChangeHandler(getState());
  }

  // anyone can getPixelColor, no restrictions, no tokens
  function getPixelColor(x, y) {
    const rawPixel = harden({ x: Nat(x), y: Nat(y) });
    return state[rawPixel.x][rawPixel.y];
  }

  // makeUseObj is part of the configuration passed into makeMint and
  // is used to create the "use object" that is associated with an
  // underlying asset (purse or payment). In this case, the use object
  // has the methods for changing the color of pixels

  function makeUseObj(assay, asset) {
    const useObj = harden({
      // change the color of the pixels in the assetDesc after checking
      // that the asset has the authority to do so.
      changeColor(assetDesc, newColor) {
        // TODO: allow empty assetDescs to be used without throwing
        // an error, but because there is no authority, nothing happens.
        insistNonEmptyAssetDesc(assay, assetDesc);
        insistAssetHasAssetDesc(assay, asset, assetDesc);
        insistColor(newColor);
        const pixelList = getPixelList(assay, assetDesc);
        setPixelListState(pixelList, newColor);
        return assetDesc;
      },
      // Call changeColor, just with the entire balance of the
      // underlying asset.
      changeColorAll(newColor) {
        return useObj.changeColor(asset.getBalance(), newColor);
      },
      // A helper function for getting a literal list of pixels from
      // the asset. For example, [ { x:0, y:0 } ]
      getRawPixels() {
        const assetDescOps = assay.getAssetDescOps();
        const pixelList = assetDescOps.extent(asset.getBalance());
        return pixelList;
      },
      // returns an array where each item is a pixel in this asset assetDesc
      // as well as its color
      getColors() {
        const pixelList = useObj.getRawPixels();
        const colors = [];
        for (const pixel of pixelList) {
          const colorPerPixel = harden({
            x: pixel.x,
            y: pixel.y,
            color: getPixelColor(pixel.x, pixel.y),
          });
          colors.push(colorPerPixel);
        }
        return colors;
      },
    });
    return useObj;
  }

  const makePixelConfig = makePixelConfigMaker(makeUseObj);

  const galleryPixelMint = makeMint('pixels', makePixelConfig);
  const galleryPixelAssay = galleryPixelMint.getAssay();
  const galleryPixelDescOps = galleryPixelAssay.getAssetDescOps();

  // For lack of a better word, the assay below the gallery assay is
  // the "consumer assay" - this is the assay of the pixel payments
  // that consumers get from calling `tapFaucet`

  const consumerPixelAssay = galleryPixelAssay.getChildAssay();
  const consumerPixelDescOps = consumerPixelAssay.getAssetDescOps();

  // Dust is the currency that the Gallery accepts for pixels
  const dustMint = makeMint('dust');
  const dustAssay = dustMint.getAssay();
  const dustDescOps = dustAssay.getAssetDescOps();

  const pixelToPayment = new Map();

  function getPixelStr(pixel) {
    return `x:${pixel.x},y:${pixel.y}`;
  }

  // TODO: build lruQueue from an array, without iterating here
  for (const pixel of allPixels) {
    lruQueueBuilder.push(pixel);
    const assetDesc = galleryPixelDescOps.make(harden([pixel]));
    const purse = galleryPixelMint.mint(assetDesc);
    const payment = purse.withdrawAll();
    pixelToPayment.set(getPixelStr(pixel), payment);
  }
  lruQueueBuilder.resortArbitrarily(allPixels.length, 7);

  // read-only access for the admin interface.
  function reportPosition(rawPixel) {
    return lruQueueAdmin.reportPosition(rawPixel);
  }

  function tapFaucet() {
    const pixel = lruQueue.popToTail();
    const payment = pixelToPayment.get(getPixelStr(pixel));
    return payment.claimChild();
  }

  function pricePixelInternal(rawPixel) {
    makeInsistPixel(canvasSize)(rawPixel);
    const distance = getDistanceFromCenter(rawPixel, canvasSize);
    // prices are simplistic for now
    // they range from canvasSize / 2 to canvasSize
    const rawPrice = canvasSize - distance;
    return rawPrice;
  }

  function pricePixelAssetDesc(pixelAssetDesc) {
    pixelAssetDesc = consumerPixelDescOps.coerce(pixelAssetDesc);
    const rawPixelList = consumerPixelDescOps.extent(pixelAssetDesc);
    let totalPriceInDust = 0;
    for (const rawPixel of rawPixelList) {
      totalPriceInDust += pricePixelInternal(rawPixel);
    }
    return dustDescOps.make(totalPriceInDust);
  }

  const sellBuyPixelPurseP = consumerPixelAssay.makeEmptyPurse();
  const sellBuyDustPurseP = dustAssay.makeEmptyPurse();

  // only direct child pixels of the galleryPixels can be sold to the gallery
  function sellToGallery(pixelAssetDescP) {
    return Promise.resolve(pixelAssetDescP).then(async pixelAssetDesc => {
      pixelAssetDesc = consumerPixelDescOps.coerce(pixelAssetDesc);
      const dustAssetDesc = pricePixelAssetDesc(pixelAssetDesc);
      // just mint the dust that we need
      const tempDustPurseP = dustMint.mint(dustAssetDesc);
      const dustPaymentP = tempDustPurseP.withdraw(
        dustAssetDesc,
        'dust for pixel',
      );
      // dustPurse is dropped
      const terms = harden({ left: dustAssetDesc, right: pixelAssetDesc });
      const escrowExchangeInstallationP = await E(contractHost).install(
        escrowExchangeSrcs,
      );
      const { left: galleryInviteP, right: userInviteP } = await E(
        escrowExchangeInstallationP,
      ).spawn(terms);
      const seatP = E(contractHost).redeem(galleryInviteP);
      E(seatP).offer(dustPaymentP);
      collect(seatP, sellBuyPixelPurseP, sellBuyDustPurseP, 'gallery escrow');
      return harden({
        inviteP: userInviteP,
        host: contractHost,
      });
    });
  }

  // only direct children of the gallery pixels can be bought from gallery
  function buyFromGallery(pixelAssetDescP) {
    return Promise.resolve(pixelAssetDescP).then(async pixelAssetDesc => {
      pixelAssetDesc = consumerPixelDescOps.coerce(pixelAssetDesc);

      // if the gallery purse contains this pixelAssetDesc, we will
      // create a invite to trade, otherwise we return a message
      const pixelPurseAssetDesc = sellBuyPixelPurseP.getBalance();
      if (!consumerPixelDescOps.includes(pixelPurseAssetDesc, pixelAssetDesc)) {
        return harden({
          inviteP: undefined,
          host: undefined,
          message: 'gallery did not have the pixels required',
        });
      }
      const pixelPaymentP = await E(sellBuyPixelPurseP).withdraw(
        pixelAssetDesc,
      );
      const dustAssetDesc = pricePixelAssetDesc(pixelAssetDesc);

      // same order as in sellToGallery
      // the left will have to provide dust, right will have to
      // provide pixels. Left is the user, right is the gallery
      const terms = harden({ left: dustAssetDesc, right: pixelAssetDesc });
      const escrowExchangeInstallationP = E(contractHost).install(
        escrowExchangeSrcs,
      );
      // order switch compared to as in sellToGallery
      const { left: userInviteP, right: galleryInviteP } = await E(
        escrowExchangeInstallationP,
      ).spawn(terms);
      const seatP = E(contractHost).redeem(galleryInviteP);
      E(seatP).offer(pixelPaymentP);
      // user is buying from gallery, giving dust
      // gallery is selling, getting dust and giving pixels
      // win purse for gallery is a dust purse, refund is
      collect(seatP, sellBuyDustPurseP, sellBuyPixelPurseP, 'gallery escrow');
      return harden({
        inviteP: userInviteP,
        host: contractHost,
        dustNeeded: dustAssetDesc,
      });
    });
  }

  function collectFromGallery(seatP, purseLeftP, purseRightP, name) {
    return collect(seatP, purseLeftP, purseRightP, name);
  }

  function getAssays() {
    return harden({
      pixelAssay: consumerPixelAssay,
      dustAssay,
    });
  }

  function getPayment(pixel) {
    return pixelToPayment.get(getPixelStr(pixel));
  }

  const userFacet = harden({
    getPixelColor,
    tapFaucet,
    getAssays,
    getCanvasSize() {
      return canvasSize;
    },
    pricePixelAssetDesc, // transparent pricing for now
    sellToGallery,
    buyFromGallery,
    collectFromGallery,
  });

  const adminFacet = harden({
    getDistance,
    getDistanceFromCenter,
    reportPosition,
    pricePixelAssetDesc,
    dustMint,
    getPayment,
  });

  const readFacet = harden({
    getState,
    getPixelColor,
  });

  const gallery = harden({
    userFacet,
    adminFacet,
    readFacet,
  });

  return gallery;
}
