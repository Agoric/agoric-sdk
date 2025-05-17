import '@agoric/swingset-vat/tools/prepare-strict-test-env-ava.js';

import { environmentOptionsListHas } from '@endo/env-options';

export * from '@agoric/swingset-vat/tools/prepare-strict-test-env-ava.js';

export const asyncFlowVerbose = () => {
  // TODO figure out how we really want to control this.
  return environmentOptionsListHas('DEBUG', 'async-flow-verbose');
};
