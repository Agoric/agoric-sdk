const strcmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const genericProposalBuilder = async (
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
          Object.entries(bundleRecord)
            .sort(([a], [b]) => strcmp(a, b))
            .map(
              ([name, entrypoint]) =>
                /** @type {const} */ ([name, publishRef(install(entrypoint))]),
            ),
        ),
      },
    ],
  });
};
