import { E } from '@endo/far';

import { makeTracer } from '@agoric/internal';

const trace = makeTracer('UpgradeVats');

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     vatAdminSvc: VatAdminSvc;
 *     vatStore: MapStore<
 *       string,
 *       import('@agoric/swingset-vat').CreateVatResults
 *     >;
 *   };
 * }} powers
 * @param {object} options
 * @param {{
 *   bundleRefs: { [vatName: string]: VatSourceRef };
 *   vatOptions?: {
 *     [vatName: string]: import('@agoric/swingset-vat').VatUpgradeOptions;
 *   };
 * }} options.options
 */
export const upgradeVatsGeneric = async (
  { consume: { vatAdminSvc, vatStore } },
  options,
) => {
  trace('Starting upgrade of vats');
  const { bundleRefs, vatOptions = {} } = options.options;

  for await (const [name, ref] of Object.entries(bundleRefs)) {
    assert(ref.bundleID, `bundleID missing for ${name}`);
    trace(name, `BUNDLE ID: `, ref.bundleID);
    const bundleCap = await E(vatAdminSvc).getBundleCap(ref.bundleID);

    trace(name, 'Getting admin node from vatStore');
    const { adminNode } = await E(vatStore).get(name);
    trace(name, 'Upgrading via adminNode');
    await E(adminNode).upgrade(bundleCap, vatOptions[name] || {});
  }

  trace('Done upgrading vats');
};

/**
 * @typedef {{ kitLookup: string[]; bundleName: string; entrypoint?: string }} ContractKitSpec
 */

/**
 * @param {PromiseSpaceOf<Record<string, any>>} powers
 * @param {object} options
 * @param {{
 *   contractKitSpecs: ContractKitSpec[];
 *   installationBundleRefs: { [bundleName: string]: VatSourceRef };
 * }} options.options
 */
export const upgradeZoeContractsGeneric = async ({ consume }, options) => {
  trace('Starting upgrade of Zoe contract kits');

  const { instancePrivateArgs: instancePrivateArgsP } = consume;

  const { contractKitSpecs, installationBundleRefs } = options.options;

  const kitWithPrivateArgs = async (kitName, contractKitP) => {
    trace(kitName, 'awaiting contract kit');
    const contractKit = await contractKitP;
    if (contractKit.privateArgs) {
      trace(
        kitName,
        'contractKit already has privateArgs',
        contractKit.privateArgs,
      );
      return harden(contractKit);
    }

    // If the privateArgs are not directly on the contractKit, they may be
    // on the instancePrivateArgs.
    trace(kitName, 'getting privateArgs from instancePrivateArgs');
    const privateArgs = await E(instancePrivateArgsP).get(contractKit.instance);
    trace(
      kitName,
      'adding instancePrivateArgs',
      privateArgs,
      'to contract kit',
    );
    return harden({ ...contractKit, privateArgs });
  };

  await null;
  for (const { kitLookup, bundleName } of contractKitSpecs) {
    const humanLookup = JSON.stringify(kitLookup);
    trace(humanLookup, 'Looking for contract kit');
    let contractKit = consume;
    for (let i = 0; i < kitLookup.length; i += 1) {
      contractKit = await contractKit[kitLookup[i]];
    }

    const { adminFacet, privateArgs } = await kitWithPrivateArgs(
      humanLookup,
      contractKit,
    );

    const contractRef = installationBundleRefs[bundleName];
    assert(contractRef, `No installation bundle found for ${bundleName}`);
    assert(
      contractRef.bundleID,
      `No bundleID found for ${bundleName} in installationBundleRefs`,
    );

    trace(humanLookup, 'Upgrading contract kit to', bundleName);
    const upgradeResult = await E(adminFacet).upgradeContract(
      contractRef.bundleID,
      privateArgs,
    );
    trace(
      humanLookup,
      'Upgraded contract kit to',
      bundleName,
      'completed with',
      upgradeResult,
    );
  }

  trace('Done upgrading contract kits.');
};

export const getManifestForUpgradingVats = (
  _powers,
  { bundleRefs, vatOptions },
) => ({
  manifest: {
    [upgradeVatsGeneric.name]: {
      consume: {
        vatAdminSvc: 'vatAdminSvc',
        vatStore: 'vatStore',
      },
      produce: {},
    },
  },
  options: { bundleRefs, vatOptions },
});

/**
 * @param {any} powers
 * @param {{
 *   contractKitSpecs: ContractKitSpec[];
 *   installationBundleRefs: { [bundleName: string]: VatSourceRef };
 * }} options
 * @returns
 */
export const getManifestForUpgradingZoeContractKits = (
  { restoreRef },
  { contractKitSpecs, installationBundleRefs },
) => {
  const consumePermits = {
    instancePrivateArgs: true,
  };
  for (const { kitLookup } of contractKitSpecs) {
    let current = consumePermits;
    for (let i = 0; i < kitLookup.length - 1; i += 1) {
      current = current[kitLookup[i]] || (current[kitLookup[i]] = {});
    }
    current[kitLookup[kitLookup.length - 1]] ||= true;
  }

  return {
    manifest: {
      [upgradeZoeContractsGeneric.name]: {
        // Other consume permits should only be added in the definition of
        // `consumePermits`, at the top of this function.
        consume: consumePermits,
      },
    },
    installations: Object.fromEntries(
      Object.entries(installationBundleRefs).map(([bundleName, bundleRef]) => [
        bundleName,
        restoreRef(bundleRef),
      ]),
    ),
    options: {
      contractKitSpecs,
      installationBundleRefs,
    },
  };
};
