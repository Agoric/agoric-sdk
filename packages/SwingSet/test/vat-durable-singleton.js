import { Far } from '@endo/marshal';
import { M } from '@agoric/store';
import { provide, defineExoKitFactory } from '@agoric/vat-data';

export const buildRootObject = (_vatPowers, vatParameters, baggage) => {
  const { version } = vatParameters;

  // Define and guarantee a single durable instance of a minimal far class.
  const emptyFacetI = M.interface('Facet', {});
  const iKit = harden({ facet1: emptyFacetI, facet2: emptyFacetI });
  const initState = () => ({});
  const makeInstance = defineExoKitFactory(
    baggage,
    'ClassKit',
    iKit,
    initState,
    {
      facet1: {},
      facet2: {},
    },
  );
  const singleton = provide(baggage, 'durableSingleton', () => makeInstance());

  return Far('root', {
    getVersion: () => version,
    getParameters: () => vatParameters,
    getSingleton: () => singleton,
  });
};
