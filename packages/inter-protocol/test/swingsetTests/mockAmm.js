import { Far } from '@endo/marshal';

/** @type {any} */
export const ammMock = Far('mock AMM', {
  getInputPrice(amountIn, amountOut) {
    return { amountIn, amountOut };
  },
});
