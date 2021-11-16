// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { AmountMath } from '@agoric/ertp';
import { governedParameterTerms } from '../../../src/params';

const SECONDS_PER_HOUR = 60n * 60n;
const SECONDS_PER_DAY = 24n * SECONDS_PER_HOUR;
const BASIS_POINTS = 10000n;

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
  committeeCreator,
  electorateInstance,
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
    governedParams: governedParameterTerms,
  });
  const privateTreasuryArgs = { feeMintAccess };

  const { creatorFacet: governor } = await E(zoe).startInstance(
    installations.governor,
    harden({}),
    {
      timer,
      electorateInstance,
      governedContractInstallation: installations.treasury,
      governed: {
        terms,
        issuerKeywordRecord: {},
        privateArgs: privateTreasuryArgs,
      },
    },
    harden({ electorateCreatorFacet: committeeCreator }),
  );

  const governedInstance = await E(governor).getInstance();
  const governedPublicFacet = E(zoe).getPublicFacet(governedInstance);

  const {
    issuers: { RUN: runIssuer },
    brands: { Governance: govBrand, RUN: runBrand },
  } = await E(zoe).getTerms(governedInstance);

  const rates = {
    initialPrice: makeRatio(10000n, runBrand, 5n, moolaBrand),
    initialMargin: makeRatio(120n, runBrand),
    liquidationMargin: makeRatio(105n, runBrand),
    interestRate: makeRatio(250n, runBrand, BASIS_POINTS),
    loanFee: makeRatio(200n, runBrand, BASIS_POINTS),
  };

  const addTypeInvitation = await E(
    E(governor).getCreatorFacet(),
  ).makeAddTypeInvitation(moolaIssuer, 'Moola', rates);
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

  return governedPublicFacet;
};

export function buildRootObject(vatPowers) {
  return Far('root', {
    build: (...args) => build(vatPowers.testLog, ...args),
  });
}
