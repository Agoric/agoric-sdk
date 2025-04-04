/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const upgradeVatsProposalBuilder = async (
  { publishRef, install },
  bundleRecord,
) => {
  if (!bundleRecord) {
    throw Error('Missing bundleRecord');
  }
  return harden({
    sourceSpec: '@agoric/vats/src/proposals/upgrade-vats-generic-proposal.js',
    getManifestCall: [
      'getManifestForUpgradingVats',
      {
        bundleRefs: Object.fromEntries(
          Object.entries(bundleRecord).map(
            ([name, entrypoint]) =>
              /** @type {const} */ ([name, publishRef(install(entrypoint))]),
          ),
        ),
      },
    ],
  });
};
