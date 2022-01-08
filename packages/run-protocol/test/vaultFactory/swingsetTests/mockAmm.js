// @ts-check

import { Far } from '@agoric/marshal';

export const ammMock = Far('mock AMM', {
  getInputPrice(amountIn, amountOut) {
    return { amountIn, amountOut };
  },
});
