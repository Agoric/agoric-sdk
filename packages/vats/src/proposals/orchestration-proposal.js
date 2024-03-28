// @ts-check
import { V as E } from '@agoric/vat-data/vow.js';
import { Far } from '@endo/far';

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     loadCriticalVat: VatLoader<any>;
 *     networkVat: NetworkVat;
 *   };
 *   produce: {
 *     orchestration: Producer<any>;
 *     orchestrationAdmin: Producer<any>;
 *     orchestrationVat: Producer<any>;
 *   };
 * }} powers
 * @param {object} options
 * @param {{ orchestrationRef: VatSourceRef }} options.options
 *
 * @typedef {{
 *   orchestration: ERef<import('../vat-orchestration.js').OrchestrationVat>;
 * }} OrchestrationVats
 */
export const setupOrchestrationVat = async (
  {
    consume: { loadCriticalVat, networkVat },
    produce: {
      orchestrationVat,
      orchestration,
      orchestrationAdmin: orchestrationAdminP,
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

  await networkVat;
  /** @type {import('@agoric/orchestration/src/types').AttenuatedNetwork} */
  const network = Far('Attenuated Network', {
    /** @param {string} localAddr */
    async bind(localAddr) {
      return E(networkVat).bind(localAddr);
    },
  });

  const { admin: orchestrationAdmin, public: newOrchestration } = await E(
    vats.orchestration,
  ).makeOrchestration({
    network,
  });

  orchestration.reset();
  orchestration.resolve(newOrchestration);
  orchestrationAdminP.reset();
  orchestrationAdminP.resolve(orchestrationAdmin);
};

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     orchestration: import('../orchestration.js').Orchestration;
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
        networkVat: true,
      },
      produce: {
        orchestration: 'orchestration',
        orchestrationAdmin: 'orchestration',
        orchestrationVat: 'orchestration',
        orchestrationBridgeManager: 'orchestration',
      },
    },

    [addOrchestrationToClient.name]: {
      consume: {
        client: 'provisioning',
        orchestration: 'orchestration',
      },
    },
  },
  options: {
    orchestrationRef,
  },
});
