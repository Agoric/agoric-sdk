import { V as E } from '@agoric/vow/vat.js';

/**
 * @import {PortAllocator} from '@agoric/network';
 * @import {OrchestrationService} from '../service.js'
 * @import {OrchestrationVat} from '../vat-orchestration.js'
 */

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     loadCriticalVat: VatLoader<any>;
 *     portAllocator: PortAllocator;
 *   };
 *   produce: {
 *     orchestration: Producer<any>;
 *     orchestrationKit: Producer<any>;
 *     orchestrationVat: Producer<any>;
 *   };
 * }} powers
 * @param {{ options: { orchestrationRef: VatSourceRef } }} options
 *
 * @typedef {{
 *   orchestration: ERef<OrchestrationVat>;
 * }} OrchestrationVats
 */
export const setupOrchestrationVat = async (
  {
    consume: { loadCriticalVat, portAllocator: portAllocatorP },
    produce: {
      orchestrationVat,
      orchestration,
      orchestrationKit: orchestrationKitP,
    },
  },
  options,
) => {
  const { orchestrationRef } = options.options;
  /** @type {OrchestrationVats} */
  const vats = {
    orchestration: E(loadCriticalVat)('orchestration', orchestrationRef),
  };
  // don't proceed if loadCriticalVat fails
  await Promise.all(Object.values(vats));

  orchestrationVat.reset();
  orchestrationVat.resolve(vats.orchestration);

  const portAllocator = await portAllocatorP;

  const newOrchestrationKit = await E(vats.orchestration).makeOrchestrationKit({
    portAllocator,
  });

  orchestration.reset();
  orchestration.resolve(newOrchestrationKit.public);
  orchestrationKitP.reset();
  orchestrationKitP.resolve(newOrchestrationKit);
};

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     orchestration: OrchestrationService;
 *   };
 * }} powers
 * @param {object} _options
 */
export const addOrchestrationToClient = async (
  { consume: { client, orchestration } },
  _options,
) => {
  return E(client).assignBundle([_a => ({ orchestration })]);
};

export const getManifestForOrchestration = (_powers, { orchestrationRef }) => ({
  manifest: {
    [setupOrchestrationVat.name]: {
      consume: {
        loadCriticalVat: true,
        portAllocator: 'portAllocator',
      },
      produce: {
        orchestration: 'orchestration',
        orchestrationKit: 'orchestrationKit',
        orchestrationVat: 'orchestrationVat',
      },
    },
  },
  options: {
    orchestrationRef,
  },
});
