import { E } from '@agoric/eventual-send';
import { evalContractBundle } from '../../../src/evalContractCode';

export default harden({
  createVat: bundle => {
    return harden({
      root: E(evalContractBundle(bundle)).buildRootObject(),
    });
  },
  createVatByName: name => {
    throw Error(`createVatByName not supported in fake mode`);
  },
});
