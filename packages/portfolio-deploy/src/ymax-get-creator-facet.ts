/** @file save a ymax creator facet into the operator wallet store */
import { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.ts';
import { parseArgs } from 'node:util';
import type { RunTools } from './wallet-admin-types.ts';
import { getCreatorFacetKey, getYmaxControlKit } from './ymax-admin-helpers.ts';

const options = {
  contract: { type: 'string', default: 'ymax0' },
} as const;

const getCreatorFacet = async ({ scriptArgs, makeAccount }: RunTools) => {
  const { contract } = parseArgs({ args: scriptArgs, options }).values;
  const creatorFacetKey = getCreatorFacetKey(contract);
  const { ymaxControl: ycraw } = await getYmaxControlKit(makeAccount, contract);
  const ymaxControl = ycraw as unknown as {
    getCreatorFacet: {
      once: (options: {
        saveAs: string;
      }) => () => Awaited<ReturnType<typeof YMaxStart>>['creatorFacet'];
    };
  };
  await ymaxControl.getCreatorFacet.once({ saveAs: creatorFacetKey })();
};

export default getCreatorFacet;
