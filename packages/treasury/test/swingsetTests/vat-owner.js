// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { AmountMath } from '@agoric/ertp';

const SECONDS_PER_HOUR = 60n * 60n;
const SECONDS_PER_DAY = 24n * SECONDS_PER_HOUR;
const BASIS_POINTS = 10000;

// Treasury owner

const build = async (
  log,
  zoe,
  issuers,
  brands,
  payments,
  installations,
  timer,
  priceAuthorityVat,
  feeMintAccess,
) => {
  const [moolaBrand] = brands;
  const [moolaPayment] = payments;
  const [moolaIssuer] = issuers;

  const loanParams = {
    chargingPeriod: SECONDS_PER_DAY,
    recordingPeriod: SECONDS_PER_DAY,
    poolFee: 24n,
    protocolFee: 6n,
  };

  const priceAuthorityKit = await E(priceAuthorityVat).makePriceAuthority();
  const terms = harden({
    autoswapInstall: installations.autoswap,
    priceAuthority: priceAuthorityKit.priceAuthority,
    loanParams,
    liquidationInstall: installations.liquidateMinimum,
    timerService: timer,
  });

  const { publicFacet, creatorFacet, instance } = await E(zoe).startInstance(
    installations.treasury,
    undefined,
    terms,
    harden({ feeMintAccess }),
  );

  const {
    issuers: { RUN: runIssuer },
    brands: { Governance: govBrand, RUN: runBrand },
  } = await E(zoe).getTerms(instance);

  const rates = {
    initialPrice: makeRatio(10000, runBrand, 5, moolaBrand),
    initialMargin: makeRatio(120, runBrand),
    liquidationMargin: makeRatio(105, runBrand),
    interestRate: makeRatio(250, runBrand, BASIS_POINTS),
    loanFee: makeRatio(200, runBrand, BASIS_POINTS),
  };

  const addTypeInvitation = await E(creatorFacet).makeAddTypeInvitation(
    moolaIssuer,
    'Moola',
    rates,
  );
  const proposal = harden({
    give: {
      Collateral: AmountMath.make(moolaBrand, 1000n),
    },
    want: { Governance: AmountMath.makeEmpty(govBrand) },
  });

  const seat = await E(zoe).offer(
    addTypeInvitation,
    proposal,
    harden({ Collateral: moolaPayment }),
  );
  await E(seat).getOfferResult();

  const QUOTE_INTERVAL = 24n * 60n * 60n;
  const moolaPriceAuthority = await E(priceAuthorityVat).makeFakePriceAuthority(
    harden({
      issuerIn: moolaIssuer,
      issuerOut: runIssuer,
      actualBrandIn: moolaBrand,
      actualBrandOut: runBrand,
      priceList: [100000n, 120000n, 110000n, 80000n],
      timer,
      quoteInterval: QUOTE_INTERVAL,
    }),
  );

  await E(priceAuthorityKit.adminFacet).registerPriceAuthority(
    moolaPriceAuthority,
    moolaBrand,
    runBrand,
  );

  return publicFacet;
};

export function buildRootObject(vatPowers) {
  return Far('root', {
    build: (...args) => build(vatPowers.testLog, ...args),
  });
}
