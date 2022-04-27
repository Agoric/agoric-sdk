/* eslint-disable prettier/prettier */

/* eslint-disable quotes */

/* global globalThis */

const E = globalThis.E;

const config = {
  anchor: {
    denom:
      'ibc/287EE075B7AADDEB240AFE74FA2108CDACA50A7CCD013FA4C1FCD142AFA9CA9A',
  },
  installCache: {
    boardId: 'board05736',
  },
  mintHolder: {
    endoZipBase64Sha512:
      '24bf29af13ace1b20b6eb108dfdcb3a888475148924593f9f000e1a7ab985a6250f6ea62a345caef5ee6b493007126c472ab847c47fefb7d203992e184a22e09',
  },
  psm: {
    endoZipBase64Sha512:
      '5e068bd7f3e7b63ec916be60aa8077e8739a6b6871c5c2cece456b9d8be720288fc6254ab544d50adae569ef1936301ae378be5508e58812f2856cbc51a65d2e',
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
