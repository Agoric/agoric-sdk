/**
 * @file Source code for a bootstrap vat that runs blockchain behaviors (such as
 *   bridge vat integration) and exposes reflective methods for use in testing.
 *
 *   TODO: Share code with packages/SwingSet/tools/bootstrap-relay.js
 */

import { Fail, q } from '@endo/errors';
import { Far, E } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';
import { buildManualTimer } from '@agoric/swingset-vat/tools/manual-timer.js';
import { makeReflectionMethods } from '@agoric/swingset-vat/tools/vat-puppet.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { makeBootstrap } from '../src/core/lib-boot.js';
import * as basicBehaviorsNamespace from '../src/core/basic-behaviors.js';
import * as chainBehaviorsNamespace from '../src/core/chain-behaviors.js';
import * as utils from '../src/core/utils.js';

/**
 * @typedef {Record<
 *   | 'BASIC_BOOTSTRAP'
 *   | 'CHAIN_BOOTSTRAP'
 *   | 'MINIMAL'
 *   | 'SHARED_CHAIN_BOOTSTRAP',
 *   import('@agoric/vats/src/core/lib-boot.js').BootstrapManifest
 * >} BootstrapManifests
 */

// Gather up all defined bootstrap behaviors.
const { BASIC_BOOTSTRAP_PERMITS: BASIC_BOOTSTRAP, ...basicBehaviors } =
  basicBehaviorsNamespace;
const {
  CHAIN_BOOTSTRAP_MANIFEST: CHAIN_BOOTSTRAP,
  SHARED_CHAIN_BOOTSTRAP_MANIFEST: SHARED_CHAIN_BOOTSTRAP,
  ...chainBehaviors
} = chainBehaviorsNamespace;
const manifests = { BASIC_BOOTSTRAP, CHAIN_BOOTSTRAP, SHARED_CHAIN_BOOTSTRAP };
const allBehaviors = { ...basicBehaviors, ...chainBehaviors };
export const modules = {
  behaviors: { ...allBehaviors },
  utils: { ...utils },
};

// Support constructing a new manifest as a subset from the union of all
// standard manifests.
const allPermits = Object.fromEntries(
  Object.values(manifests)
    .map(manifest => Object.entries(manifest))
    .flat(),
);
const makeManifestForBehaviors = behaviors => {
  const manifest = {};
  for (const behavior of behaviors) {
    const { name } = behavior;
    Object.hasOwn(allPermits, name) || Fail`missing permit for ${name}`;
    manifest[name] = allPermits[name];
  }
  return manifest;
};

// Define a minimal manifest of entries plucked from the above union.
manifests.MINIMAL = makeManifestForBehaviors([
  allBehaviors.bridgeCoreEval,
  allBehaviors.makeBridgeManager,
  allBehaviors.makeVatsFromBundles,
  allBehaviors.startTimerService,
  allBehaviors.setupClientManager,
]);

/**
 * @param {VatPowers & { D: DProxy; testLog: typeof console.log }} vatPowers
 * @param {{
 *   baseManifest?: string;
 *   addBehaviors?: string[];
 *   coreProposalCodeSteps?: string[];
 * }} bootstrapParameters
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export const buildRootObject = (vatPowers, bootstrapParameters, baggage) => {
  const manualTimer = buildManualTimer();
  let vatAdmin;
  const { promise: vatAdminP, resolve: captureVatAdmin } = makePromiseKit();
  void vatAdminP.then(value => (vatAdmin = value)); // for better debugging
  /** @typedef {{ root: object; incarnationNumber?: number }} VatRecord */
  /**
   * @typedef {VatRecord &
   *   import('@agoric/swingset-vat').CreateVatResults & {
   *     bundleCap: unknown;
   *   }} DynamicVatRecord
   */
  /** @type {Map<string, VatRecord | DynamicVatRecord>} */
  const vatRecords = new Map();
  const devicesByName = new Map();

  const { baseManifest: manifestName = 'MINIMAL', addBehaviors = [] } =
    bootstrapParameters;
  Object.hasOwn(manifests, manifestName) ||
    Fail`missing manifest ${manifestName}`;
  const manifest = {
    ...manifests[manifestName],
    ...makeManifestForBehaviors(addBehaviors),
  };

  /**
   * bootstrapBase provides CORE_EVAL support, and also exposes:
   *
   * - promise-space functions consumeItem(name), produceItem(name, resolution),
   *   resetItem(name)
   * - awaitVatObject(presence: object, path?: PropertyKey[])
   * - snapshotStore<K, V>(store: { entries: () => Iterable<[K, V]> }): Array<[K,
   *   V]>
   */
  const bootstrapBase = makeBootstrap(
    { ...vatPowers, logger: vatPowers.testLog },
    bootstrapParameters,
    manifest,
    allBehaviors,
    modules,
    makeDurableZone(baggage),
  );

  const reflectionMethods = makeReflectionMethods(vatPowers, baggage);

  return Far('root', {
    ...reflectionMethods,

    ...bootstrapBase,
    bootstrap: async (vats, devices) => {
      await bootstrapBase.bootstrap(vats, devices);

      // createVatAdminService is idempotent (despite the name).
      captureVatAdmin(E(vats.vatAdmin).createVatAdminService(devices.vatAdmin));

      // Capture references to static vats and devices.
      for (const [name, root] of Object.entries(vats)) {
        if (name !== 'vatAdmin') {
          vatRecords.set(name, { root });
        }
      }
      for (const [name, device] of Object.entries(devices)) {
        devicesByName.set(name, device);
      }
    },

    getDevice: deviceName => devicesByName.get(deviceName),

    getManualTimer: () => manualTimer,

    getVatAdmin: () => vatAdmin || vatAdminP,

    getVatAdminNode: vatName => {
      const vat =
        vatRecords.get(vatName) || Fail`unknown vat name: ${q(vatName)}`;
      const { adminNode } = /** @type {DynamicVatRecord} */ (vat);
      return adminNode;
    },

    getVatRoot: vatName => {
      const vat =
        vatRecords.get(vatName) || Fail`unknown vat name: ${q(vatName)}`;
      const { root } = vat;
      return root;
    },

    /**
     * @param {string} vatName
     * @param {string} [bundleCapName]
     * @param {{ vatParameters?: object } & Record<string, unknown>} [vatOptions]
     * @returns {Promise<DynamicVatRecord['root']>} root object of the new vat
     */
    createVat: async (vatName, bundleCapName = vatName, vatOptions = {}) => {
      const bundleCap = await E(vatAdminP).getNamedBundleCap(bundleCapName);
      const { root, adminNode } = await E(vatAdminP).createVat(bundleCap, {
        vatParameters: {},
        ...vatOptions,
      });
      vatRecords.set(vatName, { root, adminNode, bundleCap });
      return root;
    },

    /**
     * @param {string} vatName
     * @param {string} [bundleCapName]
     * @param {{ vatParameters?: object } & Record<string, unknown>} [vatOptions]
     * @returns {Promise<number>} the resulting incarnation number
     */
    upgradeVat: async (vatName, bundleCapName, vatOptions = {}) => {
      const vatRecord = /** @type {DynamicVatRecord} */ (
        vatRecords.get(vatName) || Fail`unknown vat name: ${q(vatName)}`
      );
      const bundleCap = await (bundleCapName
        ? E(vatAdminP).getNamedBundleCap(bundleCapName)
        : vatRecord.bundleCap);
      const upgradeOptions = { vatParameters: {}, ...vatOptions };
      const { incarnationNumber } = await E(vatRecord.adminNode).upgrade(
        bundleCap,
        upgradeOptions,
      );
      vatRecord.incarnationNumber = incarnationNumber;
      return incarnationNumber;
    },
  });
};
harden(buildRootObject);
