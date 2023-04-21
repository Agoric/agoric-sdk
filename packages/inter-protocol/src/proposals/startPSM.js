// @jessie-check

import { makeMap, makeSet } from 'jessie.js';
import { AmountMath, AssetKind } from '@agoric/ertp';
import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/far';
import { Stable } from '@agoric/vats/src/tokens.js';
import { boardSlottingMarshaller } from '@agoric/vats/tools/board-utils.js';
import { deeplyFulfilledObject } from '@agoric/internal';
import { makeScalarMapStore } from '@agoric/vat-data';

import { reserveThenGetNamePaths } from './utils.js';

import {
  inviteCommitteeMembers,
  startEconCharter,
  inviteToEconCharter,
} from './committee-proposal.js';

/** @typedef {import('@agoric/vats/src/core/lib-boot.js').BootstrapManifest} BootstrapManifest */
/** @typedef {import('../psm/psm.js').MetricsNotification} MetricsNotification */
/** @typedef {import('./econ-behaviors.js').EconomyBootstrapPowers} EconomyBootstrapPowers */

const BASIS_POINTS = 10000n;
const { details: X, Fail } = assert;

export { inviteCommitteeMembers, startEconCharter, inviteToEconCharter };

/**
 * Decode vstorage value to CapData
 * XXX already written somewhere?
 *
 * @param {unknown} value
 */
const decodeToCapData = value => {
  assert.typeof(value, 'string');

  // { blockHeight: 123, values: [ ... ] }
  const item = JSON.parse(value); // or throw
  assert.typeof(item, 'object');
  assert(item);
  const { values } = item;
  assert(Array.isArray(values));

  assert.equal(values.length, 1);
  // { body: "...", slots: [ ... ] }
  const data = JSON.parse(values[0]);
  assert.typeof(data, 'object');
  assert(data);
  assert.typeof(data.body, 'string');
  assert(Array.isArray(data.slots));

  /** @type {import('@endo/marshal').CapData<string>} */
  // @ts-expect-error cast
  const capData = data;
  return capData;
};

/**
 * Provide access to object graphs serialized in vstorage.
 *
 * @param {Array<[string, string]>} entries
 * @param {(slot: string, iface?: string) => any} [slotToVal]
 */
export const makeHistoryReviver = (entries, slotToVal = undefined) => {
  const board = boardSlottingMarshaller(slotToVal);
  const vsMap = makeMap(entries);

  const getItem = key => {
    const raw = vsMap.get(key) || Fail`no ${key}`;
    const capData = decodeToCapData(raw);
    return harden(board.fromCapData(capData));
  };
  const children = prefix => [
    ...makeSet(
      entries
        .map(([k, _]) => k)
        .filter(k => k.length > prefix.length && k.startsWith(prefix))
        .map(k => k.slice(prefix.length).split('.')[0]),
    ),
  ];
  return harden({ getItem, children, has: k => vsMap.has(k) });
};

/**
 * @param {Array<[key: string, value: string]>} chainStorageEntries
 * @param {string} keyword
 * @param {{ minted: Brand<'nat'>, anchor: Brand<'nat'> }} brands
 * @returns {{ metrics?: MetricsNotification, governance?: Record<string, *> }}
 */
const findOldPSMState = (chainStorageEntries, keyword, brands) => {
  // In this reviver, object references are revived as boardIDs
  // from the pre-bulldozer board.
  const toSlotReviver = makeHistoryReviver(chainStorageEntries);
  if (!toSlotReviver.has(`published.psm.${Stable.symbol}.${keyword}.metrics`)) {
    return {};
  }
  const metricsWithOldBoardIDs = toSlotReviver.getItem(
    `published.psm.${Stable.symbol}.${keyword}.metrics`,
  );
  const oldIDtoNewBrand = makeMap([
    [metricsWithOldBoardIDs.feePoolBalance.brand, brands.minted],
    [metricsWithOldBoardIDs.anchorPoolBalance.brand, brands.anchor],
  ]);
  // revive brands; other object references map to undefined
  const brandReviver = makeHistoryReviver(chainStorageEntries, s =>
    oldIDtoNewBrand.get(s),
  );
  return {
    metrics: brandReviver.getItem(`published.psm.IST.${keyword}.metrics`),
    governance: brandReviver.getItem(`published.psm.IST.${keyword}.governance`)
      .current,
  };
};

/**
 * Mint IST needed to restore feePoolBalance for each PSM.
 *
 * @param { EconomyBootstrapPowers &  ChainStorageVatParams } powers
 */
export const mintPSMFees = async ({
  vatParameters: { chainStorageEntries },
  consume: { feeMintAccess: feeMintAccessP, zoe },
  produce: { psmFeePurse },
  installation: {
    consume: { centralSupply },
  },
}) => {
  const old = makeHistoryReviver(chainStorageEntries || []);
  const psmRootKey = `published.psm.${Stable.symbol}.`;
  const psmNames = old.children(psmRootKey);
  const purse = E(E(zoe).getFeeIssuer()).makeEmptyPurse();

  const depositPayment = async () => {
    const values = psmNames.map(
      a => old.getItem(`${psmRootKey}${a}.metrics`).feePoolBalance.value,
    );
    const total = values.reduce((tot, v) => tot + v);
    console.log('minting', total, ' fees for ', psmNames);

    const feeMintAccess = await feeMintAccessP;
    /** @type {Awaited<ReturnType<typeof import('@agoric/vats/src/centralSupply.js').start>>} */
    const { creatorFacet } = await E(zoe).startInstance(
      centralSupply,
      {},
      { bootstrapPaymentValue: total },
      { feeMintAccess },
      'centralSupply',
    );
    const payment = await E(creatorFacet).getBootstrapPayment();
    await E(purse).deposit(payment);
  };
  await (psmNames.length > 0 && depositPayment());
  psmFeePurse.resolve(purse);
};
harden(mintPSMFees);

/**
 * @typedef {{
 *   vatParameters: { chainStorageEntries?: Array<[k: string, v: string]>,
 * }}} ChainStorageVatParams
 * @param {EconomyBootstrapPowers & WellKnownSpaces & ChainStorageVatParams} powers
 * @param {object} [config]
 * @param {bigint} [config.WantMintedFeeBP]
 * @param {bigint} [config.GiveMintedFeeBP]
 * @param {bigint} [config.MINT_LIMIT]
 * @param {{ anchorOptions?: AnchorOptions } } [config.options]
 */
export const startPSM = async (
  {
    vatParameters: { chainStorageEntries },
    consume: {
      agoricNamesAdmin,
      board,
      zoe,
      feeMintAccess: feeMintAccessP,
      economicCommitteeCreatorFacet,
      econCharterKit,
      provisionPoolStartResult,
      chainStorage,
      chainTimerService,
      psmKit,
      anchorBalancePayments: anchorBalancePaymentsP,
      psmFeePurse,
    },
    produce: { psmKit: producepsmKit },
    installation: {
      consume: { contractGovernor, psm: psmInstall },
    },
    brand: {
      consume: { [Stable.symbol]: mintedP },
    },
  },
  {
    options: { anchorOptions = {} } = {},
    WantMintedFeeBP = 0n,
    GiveMintedFeeBP = 0n,
    MINT_LIMIT = 1_000n * 1_000_000n,
  } = {},
) => {
  const { denom, keyword = 'AUSD' } = anchorOptions;
  assert.typeof(
    denom,
    'string',
    X`anchorOptions.denom must be a string, not ${denom}`,
  );
  /** @type {[Brand<'nat'>, [Brand<'nat'>, Issuer<'nat'>], FeeMintAccess]} */
  // @ts-expect-error cast
  const [minted, [anchorBrand, anchorIssuer], feeMintAccess] =
    await Promise.all([
      mintedP,
      reserveThenGetNamePaths(agoricNamesAdmin, [
        ['brand', keyword],
        ['issuer', keyword],
      ]),
      feeMintAccessP,
    ]);

  const poserInvitationP = E(
    economicCommitteeCreatorFacet,
  ).getPoserInvitation();
  const [initialPoserInvitation, electorateInvitationAmount] =
    await Promise.all([
      poserInvitationP,
      E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
    ]);

  const [anchorInfo, mintedInfo] = await Promise.all(
    [anchorBrand, minted].map(b => E(b).getDisplayInfo()),
  );

  const mintLimit = AmountMath.make(minted, MINT_LIMIT);
  const anchorDecimalPlaces = anchorInfo.decimalPlaces || 1n;
  const mintedDecimalPlaces = mintedInfo.decimalPlaces || 1n;

  const oldState = findOldPSMState(chainStorageEntries || [], keyword, {
    minted,
    anchor: anchorBrand,
  });

  const terms = await deeplyFulfilledObject(
    harden({
      anchorBrand,
      anchorPerMinted: makeRatio(
        10n ** BigInt(anchorDecimalPlaces),
        anchorBrand,
        10n ** BigInt(mintedDecimalPlaces),
        minted,
      ),
      governedParams: {
        WantMintedFee: {
          type: ParamTypes.RATIO,
          value: makeRatio(WantMintedFeeBP, minted, BASIS_POINTS),
        },
        GiveMintedFee: {
          type: ParamTypes.RATIO,
          value: makeRatio(GiveMintedFeeBP, minted, BASIS_POINTS),
        },
        MintLimit: { type: ParamTypes.AMOUNT, value: mintLimit },
        ...oldState.governance,
        [CONTRACT_ELECTORATE]: {
          type: ParamTypes.INVITATION,
          value: electorateInvitationAmount,
        },
      },
      [CONTRACT_ELECTORATE]: {
        type: ParamTypes.INVITATION,
        value: electorateInvitationAmount,
      },
    }),
  );

  const psmStorageNode = await makeStorageNodeChild(chainStorage, 'psm');
  const storageNode = E(
    E(psmStorageNode).makeChildNode(Stable.symbol),
  ).makeChildNode(keyword);

  const marshaller = await E(board).getPublishingMarshaller();

  const instanceKey = `psm-${Stable.symbol}-${keyword}`;
  const governorTerms = await deeplyFulfilledObject(
    harden({
      timer: chainTimerService,
      governedContractInstallation: psmInstall,
      governed: {
        terms,
        issuerKeywordRecord: { [keyword]: anchorIssuer },
        label: instanceKey,
      },
    }),
  );
  /** @type {GovernorStartedInstallationKit<typeof psmInstall>} */
  const governorFacets = await E(zoe).startInstance(
    contractGovernor,
    {},
    governorTerms,
    harden({
      economicCommitteeCreatorFacet,
      governed: {
        feeMintAccess,
        initialPoserInvitation,
        marshaller,
        storageNode,
      },
    }),
    `${instanceKey}.governor`,
  );

  const [psm, psmCreatorFacet, psmAdminFacet] = await Promise.all([
    E(governorFacets.creatorFacet).getInstance(),
    E(governorFacets.creatorFacet).getCreatorFacet(),
    E(governorFacets.creatorFacet).getAdminFacet(),
  ]);

  /** @param {MetricsNotification} metrics */
  const restoreMetrics = async metrics => {
    const anchorBalancePayments = await anchorBalancePaymentsP;
    const anchorPmt = anchorBalancePayments.get(anchorBrand);
    const feePoolPmt = await E(psmFeePurse).withdraw(metrics.feePoolBalance);

    const {
      feePoolBalance: _f,
      anchorPoolBalance: _a,
      ...nonPaymentMetrics
    } = metrics;

    const seat = E(zoe).offer(
      E(psmCreatorFacet).makeRestoreMetricsInvitation(),
      harden({
        give: {
          Anchor: metrics.anchorPoolBalance,
          Minted: metrics.feePoolBalance,
        },
      }),
      harden({ Anchor: anchorPmt, Minted: feePoolPmt }),
      harden(nonPaymentMetrics),
    );
    await E(seat).getPayouts();
  };
  await (oldState.metrics && restoreMetrics(oldState.metrics));

  /** @typedef {import('./econ-behaviors.js').PSMKit} psmKit */
  /** @type {psmKit} */
  const newpsmKit = {
    psm,
    psmGovernor: governorFacets.instance,
    psmCreatorFacet,
    psmAdminFacet,
    psmGovernorCreatorFacet: governorFacets.creatorFacet,
  };

  // Provide pattern with a promise.
  producepsmKit.resolve(makeScalarMapStore());

  /** @type {MapStore<Brand,psmKit>} */
  const psmKitMap = await psmKit;

  psmKitMap.init(anchorBrand, newpsmKit);
  const instanceAdmin = E(agoricNamesAdmin).lookupAdmin('instance');

  await Promise.all([
    E(instanceAdmin).update(instanceKey, newpsmKit.psm),
    E(E.get(econCharterKit).creatorFacet).addInstance(
      psm,
      governorFacets.creatorFacet,
      instanceKey,
    ),
    // @ts-expect-error TODO type for provisionPoolStartResult
    E(E.get(provisionPoolStartResult).creatorFacet).initPSM(
      anchorBrand,
      newpsmKit.psm,
    ),
  ]);
};
harden(startPSM);

/**
 * @typedef {object} AnchorOptions
 * @property {string} [denom]
 * @property {string} [keyword]
 * @property {number} [decimalPlaces]
 * @property {string} [proposedName]
 */

/**
 * Make anchor issuer out of a Cosmos asset; presumably
 * USDC over IBC. Add it to BankManager.
 *
 * Also, if vatParameters shows an anchorPoolBalance for this asset,
 * mint a payment for that balance.
 *
 * TODO: address redundancy with publishInterchainAssetFromBank
 *
 * @param {EconomyBootstrapPowers & WellKnownSpaces & ChainStorageVatParams} powers
 * @param {{options?: { anchorOptions?: AnchorOptions } }} [config]
 */
export const makeAnchorAsset = async (
  {
    vatParameters: { chainStorageEntries },
    consume: { agoricNamesAdmin, bankManager, zoe, anchorBalancePayments },
    installation: {
      consume: { mintHolder },
    },
    // XXX: prune testFirstAnchorKit in favor of anchorMints
    produce: {
      testFirstAnchorKit,
      anchorBalancePayments: produceAnchorBalancePayments,
    },
  },
  { options: { anchorOptions = {} } = {} },
) => {
  assert.typeof(anchorOptions, 'object', X`${anchorOptions} must be an object`);
  const {
    denom,
    keyword = 'AUSD',
    decimalPlaces = 6,
    proposedName = 'AUSD',
  } = anchorOptions;
  assert.typeof(
    denom,
    'string',
    X`anchorOptions.denom must be a string, not ${denom}`,
  );

  const terms = await deeplyFulfilledObject(
    harden({
      keyword,
      assetKind: AssetKind.NAT,
      displayInfo: {
        decimalPlaces,
        assetKind: AssetKind.NAT,
      },
    }),
  );
  // TODO: save adminFacet of this contract, like all others.
  /** @type {{ creatorFacet: ERef<Mint<'nat'>>, publicFacet: ERef<Issuer<'nat'>> }} */
  // @ts-expect-error cast
  const { creatorFacet: mint, publicFacet: issuerP } = E.get(
    E(zoe).startInstance(mintHolder, {}, terms, undefined, keyword),
  );
  const issuer = await issuerP; // identity of issuers is important

  const brand = await E(issuer).getBrand();
  const kit = { mint, issuer, brand };

  testFirstAnchorKit.resolve(kit);

  const toSlotReviver = makeHistoryReviver(chainStorageEntries || []);
  const metricsKey = `published.psm.${Stable.symbol}.${keyword}.metrics`;
  if (toSlotReviver.has(metricsKey)) {
    const metrics = toSlotReviver.getItem(metricsKey);
    produceAnchorBalancePayments.resolve(makeScalarMapStore());
    // XXX this rule should only apply to the 1st await
    // eslint-disable-next-line @jessie.js/no-nested-await
    const anchorPaymentMap = await anchorBalancePayments;

    // eslint-disable-next-line @jessie.js/no-nested-await
    const pmt = await E(mint).mintPayment(
      AmountMath.make(brand, metrics.anchorPoolBalance.value),
    );
    anchorPaymentMap.init(brand, pmt);
  }

  await Promise.all([
    E(E(agoricNamesAdmin).lookupAdmin('issuer')).update(keyword, kit.issuer),
    E(E(agoricNamesAdmin).lookupAdmin('brand')).update(keyword, kit.brand),
    E(bankManager).addAsset(
      denom,
      keyword,
      proposedName,
      kit, // with mint
    ),
  ]);
};
harden(makeAnchorAsset);

/** @typedef {import('./econ-behaviors.js').EconomyBootstrapSpace} EconomyBootstrapSpace */

/** @param {BootstrapSpace & EconomyBootstrapSpace} powers */
export const installGovAndPSMContracts = async ({
  consume: { vatAdminSvc, zoe },
  produce: { psmKit },
  installation: {
    produce: {
      contractGovernor,
      committee,
      binaryVoteCounter,
      psm,
      econCommitteeCharter,
    },
  },
}) => {
  // In order to support multiple instances of the PSM, we store all the facets
  // indexed by the brand. Since each name in the BootstrapSpace can only be
  // produced  once, we produce an empty store here, and each time a PSM is
  // started up, the details are added to the store.
  psmKit.resolve(makeScalarMapStore());

  return Promise.all(
    Object.entries({
      contractGovernor,
      committee,
      binaryVoteCounter,
      psm,
      econCommitteeCharter,
    }).map(async ([name, producer]) => {
      const bundleID = await E(vatAdminSvc).getBundleIDByName(name);
      const installation = await E(zoe).installBundleID(bundleID, name);

      producer.resolve(installation);
    }),
  );
};

/**
 * PSM and gov contracts are available as
 * named swingset bundles only in
 * decentral-psm-config.json
 *
 * @type {BootstrapManifest}
 */
export const PSM_GOV_MANIFEST = {
  [installGovAndPSMContracts.name]: {
    consume: { vatAdminSvc: 'true', zoe: 'zoe' },
    produce: { psmKit: 'true' },
    installation: {
      produce: {
        contractGovernor: 'zoe',
        committee: 'zoe',
        binaryVoteCounter: 'zoe',
        psm: 'zoe',
        econCommitteeCharter: 'zoe',
      },
    },
  },
  [startEconCharter.name]: {
    consume: { zoe: 'zoe', agoricNames: true },
    produce: {
      econCharterKit: 'econCommitteeCharter',
    },
    installation: {
      consume: { binaryVoteCounter: 'zoe', econCommitteeCharter: 'zoe' },
    },
    instance: {
      produce: { econCommitteeCharter: 'econCommitteeCharter' },
    },
  },
};

export const INVITE_PSM_COMMITTEE_MANIFEST = harden(
  /** @type {BootstrapManifest} */ ({
    [inviteCommitteeMembers.name]: {
      consume: {
        namesByAddressAdmin: true,
        economicCommitteeCreatorFacet: true,
        econCharterKit: true,
      },
    },
    [inviteToEconCharter.name]: {
      consume: {
        namesByAddressAdmin: true,
        econCharterKit: true,
      },
    },
  }),
);

/** @type {BootstrapManifest} */
export const PSM_MANIFEST = {
  [mintPSMFees.name]: {
    vatParameters: { chainStorageEntries: true },
    consume: { feeMintAccess: 'zoe', zoe: 'zoe' },
    produce: { psmFeePurse: true },
    installation: {
      consume: { centralSupply: 'zoe' },
    },
  },
  [makeAnchorAsset.name]: {
    vatParameters: { chainStorageEntries: true },
    consume: {
      agoricNamesAdmin: true,
      bankManager: 'bank',
      zoe: 'zoe',
      anchorBalancePayments: true,
    },
    installation: { consume: { mintHolder: 'zoe' } },
    produce: { testFirstAnchorKit: true, anchorBalancePayments: true },
  },
  [startPSM.name]: {
    vatParameters: { chainStorageEntries: true },
    consume: {
      agoricNamesAdmin: true,
      board: true,
      chainStorage: true,
      zoe: 'zoe',
      feeMintAccess: 'zoe',
      economicCommitteeCreatorFacet: 'economicCommittee',
      provisionPoolStartResult: true,
      econCharterKit: 'econCommitteeCharter',
      chainTimerService: 'timer',
      psmKit: true,
      anchorBalancePayments: true,
      psmFeePurse: true,
    },
    produce: { psmKit: 'true' },
    installation: {
      consume: { contractGovernor: 'zoe', psm: 'zoe' },
    },
    instance: {
      consume: { economicCommittee: 'economicCommittee' },
    },
    brand: {
      consume: { [Stable.symbol]: 'zoe' },
    },
  },
};
harden(PSM_MANIFEST);

export const getManifestForPsmGovernance = (
  { restoreRef },
  { installKeys },
) => {
  const { [installGovAndPSMContracts.name]: _, ...manifest } = PSM_GOV_MANIFEST;
  return {
    manifest,
    installations: {
      econCommitteeCharter: restoreRef(installKeys.econCommitteeCharter),
      contractGovernor: restoreRef(installKeys.contractGovernor),
      committee: restoreRef(installKeys.committee),
      binaryVoteCounter: restoreRef(installKeys.binaryVoteCounter),
    },
  };
};

export const getManifestForPsm = (
  { restoreRef },
  { installKeys, anchorOptions },
) => {
  return {
    manifest: PSM_MANIFEST,
    installations: {
      psm: restoreRef(installKeys.psm),
      mintHolder: restoreRef(installKeys.mintHolder),
    },
    options: {
      anchorOptions,
    },
  };
};
