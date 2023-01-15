import { Far } from '@endo/far';

/** @type {any} */
export const ammMock = Far('mock AMM', {
  getInputPrice(amountIn, amountOut) {
    return { amountIn, amountOut };
  },
});
