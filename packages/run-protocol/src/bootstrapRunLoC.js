// @ts-check
import { E } from '@agoric/eventual-send';
import { makeGovernedRatio, ParamType } from '@agoric/governance';
import { CreditTerms } from './getRUN.js';
import { makeElectorateParams } from './vaultFactory/params.js';

const { entries, fromEntries, keys, values } = Object;

export const Collect = {
  /**
   * @param {Record<string, V>} obj
   * @param {(v: V) => U} f
   * @returns {Record<string, U>}
   * @template V
   * @template U
   */
  mapValues: (obj, f) => fromEntries(entries(obj).map(([p, v]) => [p, f(v)])),
  /**
   * @param {X[]} xs
   * @param {Y[]} ys
   * @returns {[X, Y][]}
   * @template X
   * @template Y
   */
  zip: (xs, ys) => xs.map((x, i) => [x, ys[i]]),
  /**
   * @param {Record<string, ERef<V>>} obj
   * @returns {Promise<Record<string, V>>}
   * @template V
   */
  allValues: async obj =>
    fromEntries(Collect.zip(keys(obj), await Promise.all(values(obj)))),
};

/**
 * @typedef { import('@agoric/eventual-send').Unpromise<T> } Unpromise<T>
 * @template T
 */
/**
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<TimerService>} timer
 * @param { FeeMintAccess } feeMintAccess
 * @param {Record<string, Installation>} installations
 * @param {Object} terms
 * @param {Ratio} terms.collateralPrice
 * @param {Ratio} terms.collateralizationRatio
 * @param {Issuer} stakeIssuer
 *
 * @typedef {Unpromise<ReturnType<typeof import('./getRUN.js').start>>} StartLineOfCredit
 */
export const bootstrapRunLoC = async (
  zoe,
  timer,
  feeMintAccess,
  installations,
  { collateralPrice, collateralizationRatio },
  stakeIssuer,
) => {
  const {
    creatorFacet: electorateCreatorFacet,
    instance: electorateInstance,
  } = await E(zoe).startInstance(installations.electorate);
  const poserInvitationP = E(electorateCreatorFacet).getPoserInvitation();
  const [
    initialPoserInvitation,
    electorateInvitationAmount,
  ] = await Promise.all([
    poserInvitationP,
    E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
  ]);

  // t.log({ electorateCreatorFacet, electorateInstance });
  const main = harden({
    [CreditTerms.CollateralPrice]: makeGovernedRatio(collateralPrice),
    [CreditTerms.CollateralizationRatio]: makeGovernedRatio(
      collateralizationRatio,
    ),
    ...makeElectorateParams(electorateInvitationAmount),
  });

  /** @type {{ publicFacet: GovernorPublic, creatorFacet: GovernedContractFacetAccess}} */
  const governorFacets = await E(zoe).startInstance(
    installations.governor,
    {},
    {
      timer,
      electorateInstance,
      governedContractInstallation: installations.getRUN,
      governed: harden({
        terms: { main },
        issuerKeywordRecord: { Stake: stakeIssuer },
        privateArgs: { feeMintAccess, initialPoserInvitation },
      }),
    },
    harden({ electorateCreatorFacet }),
  );

  const governedInstance = await E(governorFacets.creatorFacet).getInstance();
  /** @type {ERef<StartLineOfCredit['publicFacet']>} */
  const publicFacet = E(zoe).getPublicFacet(governedInstance);
  const creatorFacet = E(governorFacets.creatorFacet).getCreatorFacet();

  return { instance: governedInstance, publicFacet, creatorFacet };
};
