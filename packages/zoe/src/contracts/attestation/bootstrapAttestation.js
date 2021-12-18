// @ts-check

import { E } from '@agoric/eventual-send';

/**
 * @typedef { import('@agoric/eventual-send').Unpromise<T> } Unpromise<T>
 * @template T
 */

/**
 * @param {Bundle} bundle
 * @param {ERef<ZoeService>} zoe
 * @param {Issuer} stakingIssuer
 * @param {ERef<StakingAuthority>} reporter
 * @param {{ expiringAttName: string, returnableAttName: string }} issuerNames
 *
 * @typedef {Unpromise<
 *   ReturnType<typeof import('./attestation.js').start>
 * >} StartAttestationResult
 */
export const bootstrapAttestation = async (
  bundle,
  zoe,
  stakingIssuer,
  reporter,
  { expiringAttName, returnableAttName },
) => {
  const installation = await E(zoe).install(bundle);
  /** @type {StartAttestationResult & { instance: Instance }} */
  const { publicFacet, creatorFacet, instance } = await E(zoe).startInstance(
    installation,
    harden({ Underlying: stakingIssuer }),
    harden({ expiringAttName, returnableAttName }),
  );

  const [
    { returnable: attIssuer },
    { returnable: attBrand },
    _added,
  ] = await Promise.all([
    E(publicFacet).getIssuers(),
    E(publicFacet).getBrands(),
    E(creatorFacet).addAuthority(reporter),
  ]);

  return {
    installation,
    instance,
    creatorFacet,
    issuer: attIssuer,
    brand: attBrand,
  };
};
