import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeGallery } from '../../../../more/pixels/gallery';
import { insistPixelList } from '../../../../more/pixels/types/pixelList';

// These tests do not require SwingSet or vats

test('tapFaucet', t => {
  const { userFacet } = makeGallery();
  const { pixelIssuer } = userFacet.getIssuers();
  const pixelPayment = userFacet.tapFaucet();
  const amount = pixelPayment.getBalance();
  const pixelAssay = pixelIssuer.getAssay();
  const quantity = pixelAssay.quantity(amount);
  t.doesNotThrow(() => insistPixelList(quantity, userFacet.getCanvasSize()));
  t.end();
});

test('get exclusive pixel payment from faucet', t => {
  const { userFacet } = makeGallery();
  const payment = userFacet.tapFaucet();
  const { pixelIssuer } = userFacet.getIssuers();
  pixelIssuer.getExclusiveAll(payment).then(pixelPayment => {
    const amount = pixelPayment.getBalance();
    const pixelAssay = pixelIssuer.getAssay();
    const quantity = pixelAssay.quantity(amount);
    t.doesNotThrow(() => insistPixelList(quantity, userFacet.getCanvasSize()));
    t.end();
  });
});

test('the user changes the color of a pixel', async t => {
  // setup
  const { userFacet } = makeGallery();

  // user actions
  const payment = userFacet.tapFaucet();
  const pixels = payment.getUse();
  const rawPixels = pixels.getRawPixels();
  const rawPixel = rawPixels[0];
  pixels.changeColorAll('#000000');
  t.equal(userFacet.getPixelColor(rawPixel.x, rawPixel.y), '#000000');
  t.end();
});

// tests that benefited from using SwingSet have been moved to test-gallery.js

test('getDistance', t => {
  const { adminFacet } = makeGallery();
  const { getDistance } = adminFacet;
  t.strictEqual(getDistance({ x: 0, y: 1 }, { x: 0, y: 1 }), 0);
  t.strictEqual(getDistance({ x: 2, y: 1 }, { x: 0, y: 1 }), 2);
  t.strictEqual(getDistance({ x: 2, y: 3 }, { x: 0, y: 1 }), 2);
  t.strictEqual(getDistance({ x: 0, y: 1 }, { x: 4, y: 1 }), 4);
  t.strictEqual(getDistance({ x: 2, y: 2 }, { x: 0, y: 7 }), 5);
  t.end();
});

test('getDistanceFromCenter', t => {
  const { adminFacet } = makeGallery();
  // default canvasSize is 10
  const { getDistanceFromCenter } = adminFacet;
  t.strictEqual(getDistanceFromCenter({ x: 0, y: 1 }), 6);
  t.strictEqual(getDistanceFromCenter({ x: 2, y: 1 }), 5);
  t.strictEqual(getDistanceFromCenter({ x: 2, y: 3 }), 3);
  t.strictEqual(getDistanceFromCenter({ x: 4, y: 1 }), 4);
  t.strictEqual(getDistanceFromCenter({ x: 0, y: 7 }), 5);
  t.strictEqual(getDistanceFromCenter({ x: 5, y: 5 }), 0);
  t.end();
});

test('pricePixel Internal', t => {
  const { userFacet } = makeGallery();
  // default canvasSize is 10
  const { pricePixelAmount, getIssuers } = userFacet;
  const { dustIssuer, pixelIssuer } = getIssuers();
  const dustAssay = dustIssuer.getAssay();
  const pixelAssay = pixelIssuer.getAssay();
  t.deepEqual(
    pricePixelAmount(pixelAssay.make(harden([{ x: 0, y: 1 }]))),
    dustAssay.make(4),
  );
  t.deepEqual(
    pricePixelAmount(pixelAssay.make(harden([{ x: 2, y: 1 }]))),
    dustAssay.make(5),
  );
  t.deepEqual(
    pricePixelAmount(pixelAssay.make(harden([{ x: 2, y: 3 }]))),
    dustAssay.make(7),
  );
  t.deepEqual(
    pricePixelAmount(pixelAssay.make(harden([{ x: 4, y: 1 }]))),
    dustAssay.make(6),
  );
  t.deepEqual(
    pricePixelAmount(pixelAssay.make(harden([{ x: 0, y: 7 }]))),
    dustAssay.make(5),
  );
  t.deepEqual(
    pricePixelAmount(pixelAssay.make(harden([{ x: 5, y: 5 }]))),
    dustAssay.make(10),
  );
  t.end();
});
