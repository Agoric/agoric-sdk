/* eslint-disable prettier/prettier */

/* eslint-disable quotes */

/* global globalThis */

const E = globalThis.E;

const config = {
  anchor: {
    denom:
      'ibc/949E954E05CE9E63E072ABD13A7DAAAB338A1E57FFBC148C50D74451AB5067D1',
  },
  installCache: {
    boardId: 'board02021',
  },
  mintHolder: {
    endoZipBase64Sha512:
      '43835ca139d81851cc4da8b987309ec9f1fd478677ba15fc8e5cc13737fac036d09dd2eb4a7cf6867a0ca92dae6e15bb4d8b339c46cbf30fd053468c1c8fc7bf',
  },
  psm: {
    endoZipBase64Sha512:
      '24b9336ef4a06c46d041f4ccca6680255aa00ec19fff7ee64ebde388a0f95f863b3bb0eec0ebef8dfe4b8e36f4afe23e7893782e55aa83c3a813ae0124577508',
  },
};

const { details: X, quote: q } = assert;

const AssetKind = {
  COPY_BAG: 'copyBag',
  COPY_SET: 'copySet',
  NAT: 'nat',
  SET: 'set',
};

const CONTRACT_ELECTORATE = 'Electorate';

const ParamTypes = {
  AMOUNT: 'amount',
  BRAND: 'brand',
  INSTALLATION: 'installation',
  INSTANCE: 'instance',
  INVITATION: 'invitation',
  NAT: 'nat',
  RATIO: 'ratio',
  STRING: 'string',
  UNKNOWN: 'unknown',
};

const PERCENT = 100n;

const BASIS_POINTS = 10000n;

const makeAmount = (brand, value) => harden({ brand, value });
harden(makeAmount);

const AmountMath = harden({ make: makeAmount });

const makeRatio = (
  numerator,
  numeratorBrand,
  denominator = PERCENT,
  denominatorBrand = numeratorBrand,
) => {
  assert(
    denominator > 0n,
    X`No infinite ratios! Denominator was 0/${q(denominatorBrand)}`,
  );

  return harden({
    numerator: AmountMath.make(numeratorBrand, numerator),
    denominator: AmountMath.make(denominatorBrand, denominator),
  });
};
harden(makeRatio);

const makeAnchorAsset = async (
  {
    consume: { bankManager, zoe },
    installation: {
      consume: { mintHolder },
    },
    issuer: {
      produce: { AUSD: issuerP },
    },
    brand: {
      produce: { AUSD: brandP },
    },
  },
  {
    options: {
      denom,
      proposedName = 'USDC Anchor',
      keyword = 'AUSD',
      decimalPlaces = 6,
    },
  },
) => {
  /** @type {import\('@agoric/vats/src/mintHolder.js').AssetTerms} */
  const terms = {
    keyword,
    assetKind: AssetKind.NAT,
    displayInfo: { decimalPlaces, assetKind: AssetKind.NAT },
  };
  const { creatorFacet: mint, publicFacet: issuer } = E.get(
    E(zoe).startInstance(mintHolder, {}, terms),
  );

  const brand = await E(issuer).getBrand();
  const kit = { mint, issuer, brand };
  issuerP.resolve(kit.issuer);
  brandP.resolve(kit.brand);
  return E(bankManager).addAsset(
    denom,
    keyword,
    proposedName,
    kit, // with mint
  );
};
harden(makeAnchorAsset);

const startPSM = async (
  {
    consume: {
      zoe,
      feeMintAccess: feeMintAccessP,
      economicCommitteeCreatorFacet,
      chainTimerService,
    },
    produce: { psmCreatorFacet, psmGovernorCreatorFacet },
    installation: {
      consume: { contractGovernor, psm: psmInstallP },
    },
    instance: {
      consume: { economicCommittee },
      produce: { psm: psmInstanceR, psmGovernor: psmGovernorR },
    },
    brand: {
      consume: { AUSD: anchorBrandP, RUN: runBrandP },
    },
    issuer: {
      consume: { AUSD: anchorIssuerP },
    },
  },
  {
    WantStableFeeBP = 1n,
    GiveStableFeeBP = 3n,
    MINT_LIMIT = 20_000_000n * 1_000_000n,
  } = {},
) => {
  const [
    feeMintAccess,
    runBrand,
    anchorBrand,
    anchorIssuer,
    governor,
    psmInstall,
    timer,
  ] = await Promise.all([
    feeMintAccessP,
    runBrandP,
    anchorBrandP,
    anchorIssuerP,
    contractGovernor,
    psmInstallP,
    chainTimerService,
  ]);

  const poserInvitationP = E(
    economicCommitteeCreatorFacet,
  ).getPoserInvitation();
  const [initialPoserInvitation, electorateInvitationAmount] =
    await Promise.all([
      poserInvitationP,
      E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
    ]);

  const mintLimit = AmountMath.make(anchorBrand, MINT_LIMIT);
  const terms = {
    anchorBrand,
    anchorPerStable: makeRatio(100n, anchorBrand, 100n, runBrand),
    governedParams: {
      [CONTRACT_ELECTORATE]: {
        type: ParamTypes.INVITATION,
        value: electorateInvitationAmount,
      },
      WantStableFee: {
        type: ParamTypes.RATIO,
        value: makeRatio(WantStableFeeBP, runBrand, BASIS_POINTS),
      },
      GiveStableFee: {
        type: ParamTypes.RATIO,
        value: makeRatio(GiveStableFeeBP, runBrand, BASIS_POINTS),
      },
      MintLimit: { type: ParamTypes.AMOUNT, value: mintLimit },
    },
    [CONTRACT_ELECTORATE]: {
      type: ParamTypes.INVITATION,
      value: electorateInvitationAmount,
    },
  };

  const governorFacets = await E(zoe).startInstance(
    governor,
    {},
    {
      timer,
      economicCommittee,
      governedContractInstallation: psmInstall,
      governed: harden({
        terms,
        issuerKeywordRecord: { AUSD: anchorIssuer },
        privateArgs: { feeMintAccess, initialPoserInvitation },
      }),
    },
    harden({ economicCommitteeCreatorFacet }),
  );

  const governedInstance = await E(governorFacets.creatorFacet).getInstance();
  const creatorFacet = E(governorFacets.creatorFacet).getCreatorFacet();

  psmInstanceR.resolve(governedInstance);
  psmGovernorR.resolve(governorFacets.instance);
  psmCreatorFacet.resolve(creatorFacet);
  psmGovernorCreatorFacet.resolve(governorFacets.creatorFacet);
  psmInstanceR.resolve(governedInstance);
};
harden(startPSM);

const startPSMWorkAround = async agoricdev10Powers => {
  const {
    consume: { agoricNamesAdmin, board },
    installation,
    instance,
    brand,
  } = agoricdev10Powers;
  const names = {
    instance: E(agoricNamesAdmin).lookupAdmin('instance'),
    brand: E(agoricNamesAdmin).lookupAdmin('brand'),
    issuer: E(agoricNamesAdmin).lookupAdmin('issuer'),
  };

  /**
   * @param {ERef<NameAdmin>} admin
   * @param {string} key
   */
  const produceIt = (admin, key) => {
    return harden({ resolve: it => E(admin).update(key, it) });
  };
  /**
   * @param {ERef<NameAdmin>} admin
   * @param {string} key
   */
  const syncIt = (admin, key) => {
    /** @type {(v: unknown) => void } */
    let resolve;
    const promise = new Promise(pResolve => {
      resolve = pResolve;
    });
    promise.then(it => E(admin).update(key, it));
    // @ts-expect-error Promise executor always fires
    const produce = { resolve };
    return harden({ consume: promise, produce });
  };

  const syncBrand = syncIt(names.brand, 'AUSD');
  const syncIssuer = syncIt(names.issuer, 'AUSD');

  const installCacheJSON = await E(board).getValue(config.installCache.boardId);
  /** @type {{sha512: string, boardId: string}[]} */
  const installInfo = JSON.parse(installCacheJSON);
  console.info('startPSMWorkAround', { installInfo });
  const toBoardId = new Map(
    installInfo.map(({ sha512, boardId }) => [sha512, boardId]),
  );

  const getInstall = ({ endoZipBase64Sha512: key }) =>
    E(board).getValue(toBoardId.get(key) || assert.fail(key));

  const psmPowers = {
    ...agoricdev10Powers,
    installation: {
      consume: {
        contractGovernor: installation.consume.contractGovernor,
        psm: getInstall(config.psm),
        mintHolder: getInstall(config.mintHolder),
      },
    },
    instance: {
      consume: instance.consume,
      produce: {
        psm: produceIt(names.instance, 'psm'),
        psmGovernor: produceIt(names.instance, 'psmGovernor'),
      },
    },
    brand: {
      consume: { AUSD: syncBrand.consume, RUN: brand.consume.RUN },
      produce: { AUSD: syncBrand.produce },
    },
    issuer: {
      consume: { AUSD: syncIssuer.consume },
      produce: { AUSD: syncIssuer.produce },
    },
  };

  await Promise.all([
    // @ts-ignore bootstrap types are out of sync
    makeAnchorAsset(psmPowers, { options: config.anchor }),
    // @ts-ignore bootstrap types are out of sync
    startPSM(psmPowers),
  ]);
};
harden(startPSMWorkAround);

startPSMWorkAround; // "exported" completion value
