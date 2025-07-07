/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const upgradeVatsProposalBuilder = async (
  { publishRef, install },
  vatNameToEntrypoint,
) => {
  if (!vatNameToEntrypoint) {
    throw Error('Missing vatNameToEntrypoint');
  }
  return harden({
    sourceSpec: '@agoric/vats/src/proposals/upgrade-vats-generic-proposal.js',
    getManifestCall: [
      'getManifestForUpgradingVats',
      {
        bundleRefs: Object.fromEntries(
          Object.entries(vatNameToEntrypoint).map(
            ([name, entrypoint]) =>
              /** @type {const} */ ([name, publishRef(install(entrypoint))]),
          ),
        ),
      },
    ],
  });
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const upgradeZoeContractsProposalBuilder = async (
  { publishRef, install },
  contractKitSpecs,
) => {
  if (!contractKitSpecs) {
    throw Error('Missing contractKitSpecs');
  }
  return harden({
    sourceSpec: '@agoric/vats/src/proposals/upgrade-vats-generic-proposal.js',
    getManifestCall: [
      'getManifestForUpgradingZoeContractKits',
      {
        contractKitSpecs,
        /** @type {{ [bundleName: string]: VatSourceRef }} */
        installationBundleRefs: Object.fromEntries(
          contractKitSpecs.map(({ bundleName, entrypoint }) => [
            bundleName,
            publishRef(install(entrypoint)),
          ]),
        ),
      },
    ],
  });
};
