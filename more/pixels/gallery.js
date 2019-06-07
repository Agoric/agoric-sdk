import Nat from '@agoric/nat';
import harden from '@agoric/harden';

import { insist } from '../../util/insist';
import { makePixelListAssayMaker } from './pixelListAssay';
import { makeMint } from '../../core/issuers';
import { makeWholePixelList, insistPixelList } from './types/pixelList';

// NON ERTP
const canvasSize = 10;

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
const pixelMint = makeMint('pixels', makePixelListAssay);
const pixelIssuer = pixelMint.getIssuer();
const pixelAssay = pixelIssuer.getAssay();
const pixelLabel = harden({ issuer: pixelIssuer, description: 'pixels' });

const transferRightMint = makeMint('pixelsTransferRights', makeTransferAssay);
const useRightMint = makeMint('pixelUseRights', makeUseAssay);
const useRightIssuer = useRightMint.getIssuer();
const transferRightIssuer = transferRightMint.getIssuer();
const transferAssay = transferRightIssuer.getAssay();

const allPixelsAmount = harden({
  label: pixelLabel,
  quantity: allPixels,
});

// mint all the pixels that will ever exist
const galleryPurse = pixelMint.mint(allPixelsAmount, 'gallery');

// get the pixelList from the LRU
function getPixelPayment(rawPixelList) {
  insistPixelList(rawPixelList);
  const pixelAmount = {
    pixelLabel,
    quantity: rawPixelList,
  };
  const payment = galleryPurse.withdraw(pixelAmount);
  return payment;
}

const gallerySplitPixelPurse = pixelIssuer.makeEmptyPurse();

// split pixelList into UseRights and TransferRights
function transformToTransferAndUse(pixelListPayment) {
  const pixelListAmount = pixelListPayment.getBalance();
  pixelIssuer.getExclusive(pixelListPayment);
  gallerySplitPixelPurse.depositAll(pixelListPayment);

  const { transferAmount, useAmount } = pixelAssay.toTransferAndUseRights(
    pixelListAmount,
  );

  const transferRightPurse = transferRightMint.mint(transferAmount);
  const useRightPurse = useRightMint.mint(useAmount);

  const transferRightPayment = transferRightPurse.withdrawAll('transferRights');
  const useRightPayment = useRightPurse.withdrawAll('useRights');

  return {
    transferRightPayment,
    useRightPayment,
  };
}

// merge UseRights and TransferRights into a pixel
function transformToPixel(useRightPayment, transferRightPayment) {
  const useAmount = useRightPayment.getBalance();
  const transferAmount = transferRightPayment.getBalance();
  useRightIssuer.getExclusive(useRightPayment);
  transferRightIssuer.getExclusive(transferRightPayment);

  const pixelListAmount = transferAssay.toPixel({
    useAmount,
    transferAmount,
  });

  const pixelPayment = gallerySplitPixelPurse.withdraw(
    pixelListAmount,
    'pixels',
  );
  return pixelPayment;
}

function tapFaucet() {
  const rawPixel = allPixels[Math.floor(Math.random() * allPixels.length)];
  return getPixelPayment(harden([rawPixel]));
}

function insistColor(myColor) {
  const allowedColors = new Map();
  insist(allowedColors.has(myColor))`color is not allowed`;
}

const galleryUseRightPurse = useRightIssuer.makeEmptyPurse();

function changeColor(useRightPayment, newColor) {
  const pixelAmount = useRightPayment.getBalance();
  const pixelList = pixelAssay.quantity(pixelAmount);

  // if this works, it was a useRightPayment
  // commit point
  // don't get exclusive
  galleryUseRightPurse.depositAll(useRightPayment);
  insistColor(newColor);

  for (let i = 0; i < pixelList.length; i += 1) {
    const pixel = pixelList[i];
    setPixelState(pixel, newColor);
  }
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

export const userFacet = {
  changeColor,
  getColor,
  tapFaucet,
  transformToTransferAndUse,
  transformToPixel,
  getIssuers,
};

export const readFacet = {
  provideState,
  getColor,
};
