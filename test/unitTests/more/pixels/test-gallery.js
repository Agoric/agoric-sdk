import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeGallery } from '../../../../more/pixels/gallery';
import { makePixelStrategy } from '../../../../more/pixels/pixelStrategy';

// These tests do not require SwingSet or vats

test('tapFaucet', t => {
  const { userFacet } = makeGallery();
  const { pixelIssuer } = userFacet.getIssuers();
  const pixelPayment = userFacet.tapFaucet();
  const amount = pixelPayment.getBalance();
  const pixelAssay = pixelIssuer.getAssay();
  const quantity = pixelAssay.quantity(amount);
  const strategy = makePixelStrategy();
  t.doesNotThrow(() => strategy.insistKind(quantity));
  t.end();
});

test('get all pixels repeatedly', async t => {
  const { userFacet: gallery } = makeGallery();
  const { pixelIssuer } = await gallery.getIssuers();
  const pixelAssay = pixelIssuer.getAssay();
  const purse = await pixelIssuer.makeEmptyPurse();
  for (let i = 0; i < 100; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const pixelPayment = await gallery.tapFaucet();
    // eslint-disable-next-line no-await-in-loop
    await purse.depositAll(pixelPayment);
  }
  const pursePixels = pixelAssay.quantity(purse.getBalance());
  // eslint-disable-next-line prettier/prettier
  t.deepEquals([ { x: 1, y: 4 }, { x: 2, y: 2 }, { x: 3, y: 0 }, { x: 3, y: 8 }, { x: 4, y: 6 }, { x: 5, y: 4 }, { x: 6, y: 2 }, { x: 7, y: 0 }, { x: 7, y: 8 }, { x: 8, y: 6 }, { x: 9, y: 4 }, { x: 0, y: 2 }, { x: 1, y: 0 }, { x: 1, y: 9 }, { x: 2, y: 8 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 6 }, { x: 6, y: 5 }, { x: 7, y: 4 }, { x: 8, y: 3 }, { x: 9, y: 2 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 3 }, { x: 7, y: 3 }, { x: 8, y: 4 }, { x: 9, y: 5 }, { x: 0, y: 5 }, { x: 1, y: 6 }, { x: 2, y: 7 }, { x: 4, y: 0 }, { x: 5, y: 1 }, { x: 6, y: 4 }, { x: 7, y: 6 }, { x: 8, y: 8 }, { x: 9, y: 9 }, { x: 1, y: 2 }, { x: 2, y: 5 }, { x: 3, y: 9 }, { x: 5, y: 3 }, { x: 6, y: 7 }, { x: 8, y: 0 }, { x: 9, y: 3 }, { x: 0, y: 7 }, { x: 2, y: 3 }, { x: 3, y: 6 }, { x: 5, y: 5 }, { x: 6, y: 9 }, { x: 8, y: 5 }, { x: 0, y: 0 }, { x: 1, y: 7 }, { x: 3, y: 4 }, { x: 5, y: 0 }, { x: 7, y: 1 }, { x: 8, y: 9 }, { x: 0, y: 6 }, { x: 2, y: 6 }, { x: 4, y: 5 }, { x: 6, y: 6 }, { x: 8, y: 7 }, { x: 0, y: 8 }, { x: 3, y: 1 }, { x: 5, y: 7 }, { x: 7, y: 7 }, { x: 9, y: 8 }, { x: 2, y: 4 }, { x: 4, y: 9 }, { x: 7, y: 9 }, { x: 0, y: 4 }, { x: 3, y: 5 }, { x: 6, y: 1 }, { x: 9, y: 6 }, { x: 2, y: 9 }, { x: 6, y: 0 }, { x: 9, y: 7 }, { x: 4, y: 1 }, { x: 7, y: 5 }, { x: 1, y: 5 }, { x: 5, y: 9 }, { x: 0, y: 9 }, { x: 5, y: 8 }, { x: 1, y: 3 }, { x: 7, y: 2 }, { x: 3, y: 3 }, { x: 9, y: 1 }, { x: 8, y: 1 }, { x: 4, y: 8 }, { x: 4, y: 4 }, { x: 6, y: 8 }, { x: 9, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 8 }, { x: 8, y: 2 }, { x: 4, y: 3 }, { x: 0, y: 3 } ], pursePixels);
  t.equals(pursePixels.length, 100);

  // we have successfully obtained all the pixels from the gallery

  for (let i = 0; i < 10; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const pixelPayment = await gallery.tapFaucet();
    t.notDeepEqual(pixelAssay.quantity(pixelPayment.getBalance()), []);
  }
  t.end();
});

test('get all pixels and use them', async t => {
  const { userFacet: gallery } = makeGallery();
  const bundles = [];
  for (let i = 0; i < 100; i += 1) {
    const pixelPayment = gallery.tapFaucet();
    const useObj = pixelPayment.getUse();
    bundles.push(useObj);
  }
  bundles.forEach(b => b.changeColorAll('red'));

  t.deepEquals(bundles[0].getRawPixels(), [{ x: 1, y: 4 }]);

  const pixelPayment = gallery.tapFaucet();
  const useObj = pixelPayment.getUse();
  bundles.push(useObj);

  t.deepEquals(bundles[0].getRawPixels(), []);

  t.throws(() => bundles[0].changeColorAll('blue'));
  t.doesNotThrow(() => bundles[1].changeColorAll('blue'));
  t.doesNotThrow(() => bundles[bundles.length - 1].changeColorAll('blue'));
  t.end();
});

test('get exclusive pixel payment from faucet', t => {
  const { userFacet } = makeGallery();
  const payment = userFacet.tapFaucet();
  const { pixelIssuer } = userFacet.getIssuers();
  pixelIssuer.claimAll(payment).then(pixelPayment => {
    const amount = pixelPayment.getBalance();
    const pixelAssay = pixelIssuer.getAssay();
    const quantity = pixelAssay.quantity(amount);
    const strategy = makePixelStrategy();
    t.doesNotThrow(() => strategy.insistKind(quantity));
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
