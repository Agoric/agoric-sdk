import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';

const trace = makeTracer('CoreEvalOrchestration', true);

/**
 * @import {PortAllocator} from '@agoric/network';
 */

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     portAllocator: PortAllocator;
 *   };
 *   produce: {
 *     orchestrationVat: Producer<any>;
 *   };
 * }} powers
 * @param {{ options: { orchestrationRef: VatSourceRef } }} options
 */
export const setupOrchestrationVat = async (
  {
    consume: { loadCriticalVat, portAllocator: portAllocatorP },
    produce: { orchestrationVat, ...produce },
  },
  { options },
) => {
  trace('setupOrchestrationVat', options);
  const { orchestrationRef } = options;
  const vats = {
    orchestration: E(loadCriticalVat)('orchestration', orchestrationRef),
  };
  // don't proceed if loadCriticalVat fails
  await Promise.all(Object.values(vats));
  trace('setupOrchestrationVat got vats');

  orchestrationVat.reset();
  orchestrationVat.resolve(vats.orchestration);

  const portAllocator = await portAllocatorP;

  const cosmosInterchainService = await E(
    vats.orchestration,
  ).makeCosmosInterchainService({
    portAllocator,
  });

  produce.cosmosInterchainService.reset();
  produce.cosmosInterchainService.resolve(cosmosInterchainService);
  trace('setupOrchestrationVat complete');
};

export const getManifestForOrchestration = (_powers, { orchestrationRef }) => ({
  manifest: {
    [setupOrchestrationVat.name]: {
      consume: {
        loadCriticalVat: true,
        portAllocator: 'portAllocator',
      },
      produce: {
        cosmosInterchainService: 'cosmosInterchainService',
        orchestrationVat: 'orchestrationVat',
      },
    },
  },
  options: {
    orchestrationRef,
  },
});
