// @ts-check

import { deeplyFulfilled } from '@endo/marshal';

export const deeplyFulfillTerms = async expression =>
  deeplyFulfilled(harden(expression));
