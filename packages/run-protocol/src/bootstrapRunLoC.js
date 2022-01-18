// @ts-check
import { E } from '@agoric/eventual-send';
import { ParamType } from '@agoric/governance';
import { CreditTerms } from './runLoC.js';

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
 * @param {Record<string, Bundle>} bundles
 * @param {Object} terms
 * @param {Ratio} terms.collateralPrice
 * @param {Ratio} terms.collateralizationRatio
 * @param {Issuer} attIssuer
 *
 * @typedef {Unpromise<ReturnType<typeof import('../src/runLoC.js').start>>} StartLineOfCredit
 */
export const bootstrapRunLoC = async (
  zoe,
  timer,
  feeMintAccess,
  bundles,
  { collateralPrice, collateralizationRatio },
  attIssuer,
) => {
  const installations = await Collect.allValues({
    governor: E(zoe).install(bundles.governor),
    electorate: E(zoe).install(bundles.electorate),
    runLoC: E(zoe).install(bundles.runLoC),
  });

  const {
    creatorFacet: electorateCreatorFacet,
    instance: electorateInstance,
  } = await E(zoe).startInstance(installations.electorate);
  // t.log({ electorateCreatorFacet, electorateInstance });
  const main = harden([
    {
      name: CreditTerms.CollateralPrice,
      type: ParamType.RATIO,
      value: collateralPrice,
    },
    {
      name: CreditTerms.CollateralizationRatio,
      type: ParamType.RATIO,
      value: collateralizationRatio,
    },
  ]);

  const governorFacets = await E(zoe).startInstance(
    installations.governor,
    {},
    {
      timer,
      electorateInstance,
      governedContractInstallation: installations.runLoC,
      governed: harden({
        terms: { main },
        issuerKeywordRecord: { Attestation: attIssuer },
        privateArgs: { feeMintAccess },
      }),
    },
    harden({ electorateCreatorFacet }),
  );

  const governedInstance = await E(governorFacets.creatorFacet).getInstance();
  /** @type {ERef<StartLineOfCredit['publicFacet']>} */
  const publicFacet = E(zoe).getPublicFacet(governedInstance);

  return { publicFacet };
};
