import harden from '@agoric/harden';

import { makeMint } from '@agoric/ertp/core/mint';
import { extentOpsLib } from '@agoric/ertp/core/config/extentOpsLib';

const setup = () => {
  const moolaMint = makeMint('moola');
  const simoleanMint = makeMint('simoleans');
  const bucksMint = makeMint('bucks');

  const mints = [moolaMint, simoleanMint, bucksMint];
  const assays = mints.map(mint => mint.getAssay());
  const unitOps = assays.map(assay => assay.getUnitOps());
  const extentOps = assays.map(assay => {
    const { name, args } = assay.getExtentOps();
    return extentOpsLib[name](...args);
  });
  const labels = assays.map(assay => assay.getLabel());

  return harden({
    mints,
    assays,
    unitOps,
    extentOps,
    labels,
  });
};
harden(setup);
export { setup };
