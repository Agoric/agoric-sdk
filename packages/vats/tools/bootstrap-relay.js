import { Fail, q } from '@endo/errors';
import { Far, E } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';
import { objectMap } from '@agoric/internal';
import { buildManualTimer } from '@agoric/swingset-vat/tools/manual-timer.js';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { makeBootstrap } from '../src/core/lib-boot.js';
import * as basicBehaviorsNamespace from '../src/core/basic-behaviors.js';
import * as chainBehaviorsNamespace from '../src/core/chain-behaviors.js';
import * as utils from '../src/core/utils.js';

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
 * @param {VatPowers & {
 *   D: DProxy;
 *   logger: (msg) => void;
 * }} vatPowers
 * @param {{
 *   coreProposalCodeSteps?: string[];
 *   baseManifest?: string;
 *   addBehaviors?: string[];
 * }} bootstrapParameters
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export const buildRootObject = (vatPowers, bootstrapParameters, baggage) => {
  const manualTimer = buildManualTimer();
  let vatAdmin;
  const { promise: vatAdminP, resolve: captureVatAdmin } = makePromiseKit();
  vatAdminP.then(value => (vatAdmin = value)); // for better debugging
  const vatData = new Map();
  const devicesByName = new Map();
  const callLogsByRemotable = new Map();

  const { baseManifest: manifestName = 'MINIMAL', addBehaviors = [] } =
    bootstrapParameters;
  Object.hasOwn(manifests, manifestName) ||
    Fail`missing manifest ${manifestName}`;
  Array.isArray(addBehaviors) || Fail`addBehaviors must be an array of names`;
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
    vatPowers,
    bootstrapParameters,
    manifest,
    allBehaviors,
    modules,
    makeDurableZone(baggage),
  );

  return Far('root', {
    ...bootstrapBase,
    bootstrap: async (vats, devices) => {
      await bootstrapBase.bootstrap(vats, devices);

      // createVatAdminService is idempotent (despite the name).
      captureVatAdmin(E(vats.vatAdmin).createVatAdminService(devices.vatAdmin));

      // Capture references to devices and static vats.
      for (const [name, root] of Object.entries(vats)) {
        if (name !== 'vatAdmin') {
          vatData.set(name, { root });
        }
      }
      for (const [name, device] of Object.entries(devices)) {
        devicesByName.set(name, device);
      }
    },

    getDevice: async deviceName => devicesByName.get(deviceName),

    getVatAdmin: async () => vatAdmin || vatAdminP,

    /** @deprecated in favor of getManualTimer */
    getTimer: async () => manualTimer,

    getManualTimer: async () => manualTimer,

    getVatRoot: async vatName => {
      const vat = vatData.get(vatName) || Fail`unknown vat name: ${q(vatName)}`;
      const { root } = vat;
      return root;
    },

    createVat: async (
      { name, bundleCapName, vatParameters = {} },
      options = {},
    ) => {
      const bcap = await E(vatAdminP).getNamedBundleCap(bundleCapName);
      const vatOptions = { ...options, vatParameters };
      const { adminNode, root } = await E(vatAdminP).createVat(
        bcap,
        vatOptions,
      );
      vatData.set(name, { adminNode, root });
      return root;
    },

    upgradeVat: async ({ name, bundleCapName, vatParameters = {} }) => {
      const vat = vatData.get(name) || Fail`unknown vat name: ${q(name)}`;
      const bcap = await E(vatAdminP).getNamedBundleCap(bundleCapName);
      const options = { vatParameters };
      const incarnationNumber = await E(vat.adminNode).upgrade(bcap, options);
      vat.incarnationNumber = incarnationNumber;
      return incarnationNumber;
    },

    /**
     * Derives a remotable from an object by mapping each object property into a
     * method that returns the value.
     *
     * @param {string} label
     * @param {Record<string, any>} returnValues
     */
    makeRemotable: (label, returnValues) => {
      const callLogs = [];
      const makeGetterFunction = (value, name) => {
        const getValue = (...args) => {
          callLogs.push([name, ...args]);
          return value;
        };
        return getValue;
      };
      // `objectMap` hardens its result, but...
      const methods = objectMap(returnValues, makeGetterFunction);
      // ... `Far` requires its methods argument not to be hardened.
      const remotable = Far(label, { ...methods });
      callLogsByRemotable.set(remotable, callLogs);
      return remotable;
    },

    makePromiseKit: () => {
      const { promise, ...resolverMethods } = makePromiseKit();
      const resolver = Far('resolver', resolverMethods);
      return harden({ promise, resolver });
    },

    /**
     * Returns a copy of a remotable's logs.
     *
     * @param {object} remotable
     */
    getLogForRemotable: remotable => {
      const logs =
        callLogsByRemotable.get(remotable) ||
        Fail`logs not found for ${q(remotable)}`;
      // Return a copy so that the original remains mutable.
      return harden([...logs]);
    },
  });
};
harden(buildRootObject);
