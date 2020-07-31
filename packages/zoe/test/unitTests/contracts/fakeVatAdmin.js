import { E } from '@agoric/eventual-send';
import { evalContractBundle } from '../../../src/contractFacet/evalContractCode';

export default harden({
  createVat: bundle => {
    return harden({
      root: E(evalContractBundle(bundle)).buildRootObject(),
    });
  },
});
