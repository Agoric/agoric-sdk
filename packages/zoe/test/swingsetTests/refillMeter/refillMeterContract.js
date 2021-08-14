// @ts-check
import { Far } from '@agoric/marshal';

const start = () => {
  const publicFacet = Far('publicFacet', {
    smallComputation: () => {},
  });
  return harden({ publicFacet });
};
harden(start);
export { start };
