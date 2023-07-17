// @ts-nocheck
/* eslint-disable no-unused-vars */
import { defineDurableKind, defineDurableKindMulti } from '@agoric/vat-data';
import { provideHandle, provideBaggageSubset } from './util.js';

export const setupInstallation = async installationBaggage => {
  const installationHandle1 = provideHandle(
    installationBaggage,
    'handle1',
    'iface1',
  );
  const installationHandle2 = provideHandle(
    installationBaggage,
    'handle2',
    'iface2',
  );
  const makeThing1 = defineDurableKind(installationHandle1, undefined, {});
  const makeThing2 = defineDurableKind(installationHandle2, undefined, {});
  // const makePool = defineDurableKind(poolHandle1, poolInit, poolBehavior);

  const instanceBaggage = provideBaggageSubset(installationBaggage, 'instance');

  const setupInstance = async zcfThings => {
    const facetHandle = provideHandle(instanceBaggage, 'facetHandle', 'iface3');
    const makeFacets = defineDurableKindMulti(facetHandle, undefined, {
      publicFacet: {
        method1: ({ state, facets }) => {},
      },
      privateFacet: {
        method2: ({ state, facets }) => {},
      },
    });
    const makeInstanceKit = async () => {
      const { publicFacet, privateFacet } = makeFacets(zcfThings);
      return { publicFacet, privateFacet };
    };
    return makeInstanceKit;
  };

  return setupInstance;
};
