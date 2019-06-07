import { test } from 'tape-promise/tape';

import { userFacet } from '../../../more/pixels/gallery';

const {
  changeColor,
  getColor,
  tapFaucet,
  transformToTransferAndUse,
  transformToPixel,
  getIssuers,
} = userFacet;

const { pixelIssuer, useRightIssuer, transferRightIssuer } = getIssuers();

test.only('the user changes the color of a pixel', t => {
  // user actions
  const pixelPayment = tapFaucet();
  const exclusivePixelPayment = pixelIssuer.getExclusive(pixelPayment);
  const { transferRightPayment, useRightPayment } = transformToTransferAndUse(
    exclusivePixelPayment,
  );
  const exclusiveTransferRightPayment = transferRightIssuer.getExclusive(
    transferRightPayment,
  );
  const exclusiveUseRightPayment = useRightIssuer.getExclusive(useRightPayment);
  changeColor(exclusiveUseRightPayment, '#00000');

  const rawPixel = pixelPayment.getBalance().quantity()[0];
  t.equal(getColor(rawPixel.x, rawPixel.y), '#00000');
  t.end();
});



test.only('The user allows someone else to change the color but not the right to transfer the right to change the color', t => {
  // setup
  const pixelPurse = pixelIssuer.makeEmptyPurse();
  const useRightPurse = useRightIssuer.makeEmptyPurse();
  const transferRightPurse = transferRightIssuer.makeEmptyPurse();

  // user actions
  const pixelPayment = tapFaucet();
  const exclusivePixelPayment = pixelIssuer.getExclusive(pixelPayment);
  const { transferRightPayment, useRightPayment } = transformToTransferAndUse(
    exclusivePixelPayment,
  );
  const exclusiveTransferRightPayment = transferRightIssuer.getExclusive(
    transferRightPayment,
  );
  const exclusiveUseRightPayment = useRightIssuer.getExclusive(useRightPayment);
  
  const otherUserPurse = useRightIssuer.makeEmptyPurse();
  otherUserPurse.depositAll(exclusiveUseRightPayment);

  changeColor(exclusiveUseRightPayment, '#00000');

  const rawPixel = pixelPayment.getBalance().quantity()[0];
  t.equal(getColor(rawPixel.x, rawPixel.y), '#00000');
  t.end();
});
