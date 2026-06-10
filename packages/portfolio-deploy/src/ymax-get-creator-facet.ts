/** @file save a ymax creator facet into the operator wallet store */
import { parseArgs } from 'node:util';

import type { RunTools } from './wallet-admin-types.ts';
import { getCreatorFacetKey, getYmaxControlKit } from './ymax-admin-helpers.ts';

const options = {
  contract: { type: 'string', default: 'ymax0' },
} as const;

const getCreatorFacet = async ({ scriptArgs, makeAccount }: RunTools) => {
  const { contract } = parseArgs({ args: scriptArgs, options }).values;
  const { ymaxControl } = await getYmaxControlKit(makeAccount, contract);
  const creatorFacetKey = getCreatorFacetKey(contract);
  await ymaxControl.saveAs(creatorFacetKey).getCreatorFacet();
};

export default getCreatorFacet;
