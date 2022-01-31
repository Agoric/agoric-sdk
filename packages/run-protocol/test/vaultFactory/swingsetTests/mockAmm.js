// @ts-check

import { Far } from '@endo/marshal';

export const ammMock = Far('mock AMM', {
  getInputPrice(amountIn, amountOut) {
    return { amountIn, amountOut };
  },
});
