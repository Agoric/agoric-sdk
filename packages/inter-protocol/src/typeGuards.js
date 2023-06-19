// @jessie-check

import { M } from '@endo/patterns';

/**
 * To be used only for 'helper' facets where the calls are from trusted code.
 */
export const UnguardedHelperI = M.interface(
  'helper',
  {},
  // not exposed so sloppy okay
  { sloppy: true },
);
