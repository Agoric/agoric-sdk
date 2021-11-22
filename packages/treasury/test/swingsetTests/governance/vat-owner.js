// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeRatio } from '@agoric/zoe/src/contractSupport';
import { governedParameterTerms } from '../../../src/params';
import { ammMock } from '../../mockAmm.js';

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
  electorateInstance,
  electorateCreatorFacet,
) => {
  const [moolaBrand] = brands;
  const [moolaIssuer] = issuers;

  const loanParams = {
    chargingPeriod: SECONDS_PER_DAY,
    recordingPeriod: SECONDS_PER_DAY,
  };

  const priceAuthorityKit = await E(priceAuthorityVat).makePriceAuthority();
  const terms = harden({
    priceAuthority: priceAuthorityKit.priceAuthority,
    loanParams,
    liquidationInstall: installations.liquidateMinimum,
    timerService: timer,
    governedParams: governedParameterTerms,
    ammPublicFacet: ammMock,
  });
  const privateArgs = harden({ electorateCreatorFacet });
  const privateTreasuryArgs = { feeMintAccess };

  const governorFacets = await E(zoe).startInstance(
    installations.governor,
    harden({}),
    harden({
      timer,
      electorateInstance,
      governedContractInstallation: installations.treasury,
      governed: {
        terms,
        issuerKeywordRecord: {},
        privateArgs: privateTreasuryArgs,
      },
    }),
    privateArgs,
  );

  const governedInstance = await E(governorFacets.creatorFacet).getInstance();
  const governedPublicFacet = E(zoe).getPublicFacet(governedInstance);

  const {
    issuers: { RUN: runIssuer },
    brands: { RUN: runBrand },
  } = await E(zoe).getTerms(governedInstance);

  const rates = {
    initialMargin: makeRatio(120n, runBrand),
    liquidationMargin: makeRatio(105n, runBrand),
    interestRate: makeRatio(250n, runBrand, BASIS_POINTS),
    loanFee: makeRatio(200n, runBrand, BASIS_POINTS),
  };

  await E(E(governorFacets.creatorFacet).getCreatorFacet()).addVaultType(
    moolaIssuer,
    'Moola',
    rates,
  );

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

  const voteCreator = Far('treasury vote creator', {
    voteOnParamChange: E(governorFacets.creatorFacet).voteOnParamChange,
  });

  const governed = {
    instance: governedInstance,
    creatorFacet: E(governorFacets.creatorFacet).getCreatorFacet(),
    publicFacet: governedPublicFacet,
    voteCreator,
  };

  return { governor: governorFacets, governed, runBrand };
};

export function buildRootObject(vatPowers) {
  return Far('root', {
    build: (...args) => build(vatPowers.testLog, ...args),
  });
}
