// @ts-check

import { E } from '@endo/eventual-send';
import { AssetKind } from '@agoric/ertp';

import { makePoolMaker } from './pool.js';

const { details: X } = assert;

/**
 * @param {ZCF} zcf
 * @param {(brand: Brand) => boolean} isInSecondaries true if brand is known secondary
 * @param {(brand: Brand, pool: PoolFacets) => void} initPool add new pool to store
 * @param {Brand} centralBrand
 * @param {ERef<Timer>} timer
 * @param {IssuerKit} quoteIssuerKit
 * @param {import('./multipoolMarketMaker.js').AMMParamGetters} params retrieve governed params
 * @param {ZCFSeat} protocolSeat seat that holds collected fees
 */
export const makeAddPool = (
  zcf,
  isInSecondaries,
  initPool,
  centralBrand,
  timer,
  quoteIssuerKit,
  params,
  protocolSeat,
) => {
  const makePool = makePoolMaker(
    zcf,
    centralBrand,
    timer,
    quoteIssuerKit,
    params,
    protocolSeat,
  );

  /**
   * Allows users to add new liquidity pools. `secondaryIssuer` and
   * its keyword must not have been already used
   *
   * @param {ERef<Issuer>} secondaryIssuer
   * @param {Keyword} keyword - will be used in the
   * terms.issuers for the contract, but not used otherwise
   */
  const addPool = async (secondaryIssuer, keyword) => {
    const liquidityKeyword = `${keyword}Liquidity`;
    zcf.assertUniqueKeyword(liquidityKeyword);

    const [secondaryAssetKind, secondaryBrand] = await Promise.all([
      E(secondaryIssuer).getAssetKind(),
      E(secondaryIssuer).getBrand(),
    ]);

    assert(
      !isInSecondaries(secondaryBrand),
      X`issuer ${secondaryIssuer} already has a pool`,
    );
    assert(
      secondaryAssetKind === AssetKind.NAT,
      X`${keyword} asset not fungible (must use NAT math)`,
    );

    // COMMIT POINT
    // We've checked all the foreseeable exceptions (except
    // zcf.assertUniqueKeyword(keyword), which will be checked by saveIssuer()
    // before proceeding), so we can do the work now.
    await zcf.saveIssuer(secondaryIssuer, keyword);
    const liquidityZCFMint = await zcf.makeZCFMint(
      liquidityKeyword,
      AssetKind.NAT,
      harden({ decimalPlaces: 6 }),
    );
    const { zcfSeat: poolSeat } = zcf.makeEmptySeatKit();
    const pool = makePool(liquidityZCFMint, poolSeat, secondaryBrand);
    // @ts-ignore xxx fix types
    initPool(secondaryBrand, pool);
    return liquidityZCFMint.getIssuerRecord().issuer;
  };

  return addPool;
};
