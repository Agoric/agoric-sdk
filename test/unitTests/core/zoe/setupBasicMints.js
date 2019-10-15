import harden from '@agoric/harden';

import { makeMint } from '../../../../core/mint';
import { extentOpsLib } from '../../../../core/config/extentOpsLib';

const setup = () => {
  const moolaMint = makeMint('moola');
  const simoleanMint = makeMint('simoleans');
  const bucksMint = makeMint('bucks');

  const mints = [moolaMint, simoleanMint, bucksMint];
  const assays = mints.map(mint => mint.getAssay());
  const descOps = assays.map(assay => assay.getDescOps());
  const extentOps = assays.map(assay => {
    const { name, args } = assay.getExtentOps();
    return extentOpsLib[name](...args);
  });
  const labels = assays.map(assay => assay.getLabel());

  return harden({
    mints,
    assays,
    descOps,
    extentOps,
    labels,
  });
};
harden(setup);
export { setup };
