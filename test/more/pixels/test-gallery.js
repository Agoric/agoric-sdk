import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeGallery } from '../../../more/pixels/gallery';
import { insistPixelList } from '../../../more/pixels/types/pixelList';

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
  const { pixelIssuer, useRightIssuer } = userFacet.getIssuers();

  // user actions
  const pixelPayment = userFacet.tapFaucet();

  const exclusivePixelPayment = await pixelIssuer.getExclusiveAll(pixelPayment);
  const { useRightPayment } = await userFacet.transformToTransferAndUse(
    exclusivePixelPayment,
  );
  const exclusiveUseRightPayment = await useRightIssuer.getExclusiveAll(
    useRightPayment,
  );
  const useRightAssay = exclusiveUseRightPayment.getIssuer().getAssay();

  const rawPixel = useRightAssay.quantity(
    exclusiveUseRightPayment.getBalance(),
  )[0];
  await userFacet.changeColor(exclusiveUseRightPayment, '#000000');
  t.equal(userFacet.getColor(rawPixel.x, rawPixel.y), '#000000');
  t.end();
});

// The user gives away the right to change the color (but not transfer the right to transfer the color) and guarantees that the right to change the color is exclusive. Even the original user cannot change the color unless they transfer the pixel back to themselves.
test('The user allows someone else to change the color but not the right to transfer the right to change the color', async t => {
  // setup
  const { userFacet } = makeGallery();
  const {
    pixelIssuer,
    useRightIssuer,
    transferRightIssuer,
  } = userFacet.getIssuers();

  // user actions
  const pixelPayment = userFacet.tapFaucet();

  const exclusivePixelPayment = await pixelIssuer.getExclusiveAll(pixelPayment);
  const {
    useRightPayment,
    transferRightPayment,
  } = await userFacet.transformToTransferAndUse(exclusivePixelPayment);
  const exclusiveUseRightPayment = await useRightIssuer.getExclusiveAll(
    useRightPayment,
  );
  const exclusiveTransferRightPayment = await transferRightIssuer.getExclusiveAll(
    transferRightPayment,
  );
  const useRightAssay = exclusiveUseRightPayment.getIssuer().getAssay();

  // first user stores the pixel location info
  const rawPixel = useRightAssay.quantity(
    exclusiveUseRightPayment.getBalance(),
  )[0];

  // TODO: send to other vat
  // other user below
  // other user puts the useRight in their purse, changes color
  const otherUserPurse = useRightIssuer.makeEmptyPurse();
  const otherUserExclusiveUseRightPayment = await useRightIssuer.getExclusiveAll(
    exclusiveUseRightPayment,
  );
  await otherUserPurse.depositAll(otherUserExclusiveUseRightPayment);

  const payment = await otherUserPurse.withdrawAll();

  const exclusivePayment = await useRightIssuer.getExclusiveAll(payment);

  await userFacet.changeColor(exclusivePayment, '#00000');

  t.equal(userFacet.getColor(rawPixel.x, rawPixel.y), '#00000');

  // original user transforms the transfer right into a pixel to get
  // the color right back
  const pixelPayment2 = await userFacet.transformToPixel(
    exclusiveTransferRightPayment,
  );
  const exclusivePixelPayment2 = await pixelIssuer.getExclusiveAll(
    pixelPayment2,
  );
  const {
    useRightPayment: useRightPayment2,
  } = await userFacet.transformToTransferAndUse(exclusivePixelPayment2);
  const exclusiveUseRightPayment2 = await useRightIssuer.getExclusiveAll(
    useRightPayment2,
  );
  await userFacet.changeColor(exclusiveUseRightPayment2, '#FFFFFF');
  t.equal(userFacet.getColor(rawPixel.x, rawPixel.y), '#FFFFFF');

  // other user cannot color
  t.rejects(userFacet.changeColor(exclusivePayment, '#00000'));
  t.end();
});

test('The user gives away their right to the pixel (right to transfer color rights) permanently', async t => {
  // setup
  const { userFacet } = makeGallery();
  const { pixelIssuer, useRightIssuer } = userFacet.getIssuers();
  const useRightAssay = useRightIssuer.getAssay();

  const pixelPurse = pixelIssuer.makeEmptyPurse();

  // user actions
  const pixelPayment = userFacet.tapFaucet();
  const pixelAssay = pixelIssuer.getAssay();
  const rawPixel = pixelAssay.quantity(pixelPayment.getBalance())[0];
  const exclusivePixelPayment = await pixelIssuer.getExclusiveAll(pixelPayment);
  await pixelPurse.depositAll(exclusivePixelPayment);

  const newPayment = await pixelPurse.withdrawAll();

  // TODO: send over vat to other user

  const exclPaymentNewUser = await pixelIssuer.getExclusiveAll(newPayment);

  const { useRightPayment } = await userFacet.transformToTransferAndUse(
    exclPaymentNewUser,
  );
  const exclusiveUseRightPayment = await useRightIssuer.getExclusiveAll(
    useRightPayment,
  );

  await userFacet.changeColor(exclusiveUseRightPayment, '#00000');

  t.equal(userFacet.getColor(rawPixel.x, rawPixel.y), '#00000');

  const {
    useRightPayment: useRightPayment2,
  } = await userFacet.transformToTransferAndUse(newPayment);
  const amount = useRightPayment2.getBalance();
  t.true(useRightAssay.isEmpty(amount));
  t.end();
});

test('The Gallery revokes the right to transfer the pixel or color with it', async t => {
  // setup
  const { userFacet, adminFacet } = makeGallery();
  const {
    pixelIssuer,
    useRightIssuer,
    transferRightIssuer,
  } = userFacet.getIssuers();

  // user actions
  const pixelPayment = userFacet.tapFaucet();
  const pixelAssay = pixelIssuer.getAssay();
  const rawPixel = pixelAssay.quantity(pixelPayment.getBalance())[0];
  const originalColor = userFacet.getColor(rawPixel.x, rawPixel.y);
  const exclusivePixelPayment = await pixelIssuer.getExclusiveAll(pixelPayment);

  const {
    useRightPayment,
    transferRightPayment,
  } = await userFacet.transformToTransferAndUse(exclusivePixelPayment);
  const exclusiveUseRightPayment = await useRightIssuer.getExclusiveAll(
    useRightPayment,
  );
  const exclusiveTransferRightPayment = await transferRightIssuer.getExclusiveAll(
    transferRightPayment,
  );

  // Gallery revokes
  adminFacet.revokePixel(rawPixel);

  // TODO: send over vat to other user

  t.rejects(userFacet.changeColor(exclusiveUseRightPayment, '#00000'));
  // other user tries to get exclusive on the transfer right that was sent to
  // them.
  const otherUserTransferRightPayment = await transferRightIssuer.getExclusiveAll(
    exclusiveTransferRightPayment,
  );
  // this doesn't error but is empty
  const balance = otherUserTransferRightPayment.getBalance();

  t.deepEqual(balance.quantity, []);
  t.strictEqual(userFacet.getColor(rawPixel.x, rawPixel.y), originalColor);

  t.end();
});

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
