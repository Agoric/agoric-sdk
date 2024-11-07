// @ts-check
import { E } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
import { Fail } from '@endo/errors';
import { makeTracer, deeplyFulfilledObject } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';

const head = ([x, ...xs]) => x;
const ONE_DAY = 86_000n;

const AIRDROP_TIERS_STATIC = [9000n, 6500n, 3500n, 1500n, 750n].map(
  x => x * 1_000_000n,
);

// vstorage paths under published.*
const BOARD_AUX = 'boardAux';

const marshalData = makeMarshal(_val => Fail`data only`);

/**
 * @import {ERef} from '@endo/far';
 * @import {StorageNode} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {BootstrapManifest} from '@agoric/vats/src/core/lib-boot.js';
 */

/**
 * Make a storage node for auxilliary data for a value on the board.
 *
 * @param {ERef<StorageNode>} chainStorage
 * @param {string} boardId
 */
const makeBoardAuxNode = async (chainStorage, boardId) => {
  const boardAux = E(chainStorage).makeChildNode(BOARD_AUX);
  return E(boardAux).makeChildNode(boardId);
};
const trace = makeTracer(':::: START-TRIBBLES-AIRDROP.JS ::::');

const publishBrandInfo = async (chainStorage, board, brand) => {
  trace('publishing info for brand', brand);
  const [id, displayInfo] = await Promise.all([
    E(board).getId(brand),
    E(brand).getDisplayInfo(),
  ]);
  trace('E(board).getId(brand)', id);
  const node = makeBoardAuxNode(chainStorage, id);
  trace('boardAuxNode ####', node);
  const aux = marshalData.toCapData(harden({ displayInfo }));

  const stringifiedAux = JSON.stringify(aux);
  trace('JSON.stringify(aux)', stringifiedAux);
  await E(node).setValue(stringifiedAux);
};

const publishBankAsset = async (
  agoricNamesAdmin,
  bankManager,
  denom,
  keyword,
  description,
  kit,
) => {
  await Promise.all([
    E(E(agoricNamesAdmin).lookupAdmin('issuer')).update(keyword, kit.issuer),
    E(E(agoricNamesAdmin).lookupAdmin('brand')).update(keyword, kit.brand),
    E(bankManager).addAsset(denom, keyword, description, kit),
  ]);

  trace('Asset added to bank');
};

/**
 * @type {{ startTime: bigint, initialPayoutValues: any; targetNumberOfEpochs: number; targetEpochLength: bigint; targetTokenSupply: bigint; tokenName: string; }}
 */

export const defaultCustomTerms = {
  startTime: 0n,
  initialPayoutValues: harden(AIRDROP_TIERS_STATIC),
  targetNumberOfEpochs: 5,
  targetEpochLength: 12_000n / 2n,
  targetTokenSupply: 10_000_000n * 1_000_000n,
  tokenName: 'Tribbles',
};

export const makeTerms = (terms = {}) => ({
  ...defaultCustomTerms,
  ...terms,
});

harden(makeTerms);

const contractName = 'tribblesAirdrop';

/**
 * Core eval script to start contract
 *
 * @param {BootstrapPowers & AirdropSpace} powers
 * @param {{
 *   options: { tribblesAirdrop: { bundleID: string }; customTerms: any };
 * }} config
 *   XXX export AirdropTerms record from contract
 */

/**
 * Core eval script to start contract
  @param {BootstrapPowers & AirdropSpace} powers
  @param {{ options: { customTerms: any }}} config XXX export AirdropTerms record from contract
 */

export const startAirdrop = async (powers, config) => {
  trace('######## inside startAirdrop ###########');
  trace('config ::::', config);
  trace('----------------------------------');
  trace('powers::', powers);
  trace('powers.installation', powers.installation.consume);
  trace('powers.installation', powers.installation.consume[contractName]);
  const {
    consume: {
      namesByAddressAdmin,
      namesByAddress,
      bankManager,
      board,
      chainTimerService,
      chainStorage,
      startUpgradable,
      zoe,
    },
    installation: {
      consume: { [contractName]: installationP },
    },
    instance: {
      produce: { [contractName]: produceInstance },
    },
    issuer: {
      consume: { IST: istIssuer },
      produce: { Tribbles: produceTribblesIssuer },
    },
    brand: {
      consume: { IST: istBrand },
      produce: { Tribbles: produceTribblesBrand },
    },
  } = powers;

  const [issuerIST, feeBrand, timer, storageNode] = await Promise.all([
    istIssuer,
    istBrand,
    chainTimerService,
    makeStorageNodeChild(chainStorage, contractName),
  ]);

  const { customTerms } = config.options;

  /** @type {CustomContractTerms} */
  const terms = {
    ...customTerms,
    feeAmount: harden({
      brand: feeBrand,
      value: 5n,
    }),
  };
  trace('BEFORE assert(config?.options?.merkleRoot');
  assert(
    customTerms?.merkleRoot,
    'can not start contract without merkleRoot???',
  );
  trace('AFTER assert(config?.options?.merkleRoot');

  const marshaller = await E(board).getReadonlyMarshaller();

  const startOpts = {
    installation: await installationP,
    label: contractName,
    terms,
    issuerKeywordRecord: {
      Fee: issuerIST,
    },
    issuerNames: ['Tribbles'],
    privateArgs: await deeplyFulfilledObject(
      harden({
        timer,
        storageNode,
        marshaller,
      }),
    ),
  };
  trace('BEFORE astartContract(permittedPowers, startOpts);', { startOpts });

  const { instance, creatorFacet } = await E(startUpgradable)(startOpts);
  trace('contract installation started');
  trace(instance);
  const instanceTerms = await E(zoe).getTerms(instance);
  trace('instanceTerms::', instanceTerms);
  const {
    brands: { Tribbles: tribblesBrand },
    issuers: { Tribbles: tribblesIssuer },
  } = instanceTerms;

  produceInstance.reset();
  produceInstance.resolve(instance);

  produceTribblesBrand.reset();
  produceTribblesIssuer.reset();
  produceTribblesBrand.resolve(tribblesBrand);
  produceTribblesIssuer.resolve(tribblesIssuer);

  // Sending invitation for pausing contract to a specific wallet
  // TODO: add correct wallet address
  const adminWallet = 'agoric1jng25adrtpl53eh50q7fch34e0vn4g72j6zcml';
  await E(namesByAddressAdmin).reserve(adminWallet);
  const adminDepositFacet = E(namesByAddress).lookup(
    adminWallet,
    'depositFacet',
  );

  await E(creatorFacet).makePauseContractInvitation(adminDepositFacet);

  // Add utribbles token to vbank
  const tribblesMint = await E(creatorFacet).getBankAssetMint();

  await E(bankManager).addAsset(
    'utribbles',
    'Tribbles',
    'Tribbles Intersubjective Token',
    harden({
      issuer: tribblesIssuer,
      brand: tribblesBrand,
      mint: tribblesMint,
    }),
  );
  await publishBrandInfo(chainStorage, board, tribblesBrand);
  trace('deploy script complete.');
};

/** @type {import('@agoric/vats/src/core/lib-boot').BootstrapManifest} */
const airdropManifest = harden({
  [startAirdrop.name]: {
    consume: {
      namesByAddress: true,
      namesByAddressAdmin: true,
      bankManager: true,
      board: true,
      chainStorage: true,
      chainTimerService: true,
      agoricNames: true,
      brandAuxPublisher: true,
      startUpgradable: true, // to start contract and save adminFacet
      zoe: true, // to get contract terms, including issuer/brand,
    },
    installation: {
      consume: { [contractName]: true },
      produce: { [contractName]: true },
    },
    issuer: {
      consume: { IST: true, Tribbles: true },
      produce: { Tribbles: true },
    },
    brand: {
      consume: { IST: true, Tribbles: true },
      produce: { Tribbles: true },
    },
    instance: { produce: { [contractName]: true } },
  },
});

/**
 * Core eval script to start contract
 *
 * @param {BootstrapPowers} powers
 * @param {*} config
 *
 * @typedef {{
 *   brand: PromiseSpaceOf<{ Tribbles: import('@agoric/ertp/src/types.js').Brand }>;
 *   issuer: PromiseSpaceOf<{ Tribbles: import('@agoric/ertp/src/types.js').Issuer }>;
 *   instance: { produce: { tribblesAirdrop: Instance } };
 *   installation: { consume: { tribblesAirdrop: Installation } };
 * }} AirdropSpace
 */

export const permit = Object.values(airdropManifest)[0];

export const getManifestForAirdrop = (
  { restoreRef },
  {
    installKeys,
    options = {
      customTerms: {
        ...defaultCustomTerms,
        merkleRoot:
          '236622f77321731f25d19cef0532d2f55287fc58608d74f694ce8ea3e7e91f61',
      },
    },
  },
) => {
  trace('getManifestForAirdrop');
  trace('installKeys', installKeys);
  trace('options ::::', options);
  return harden({
    manifest: airdropManifest,
    installations: {
      tribblesAirdrop: restoreRef(installKeys.tribblesAirdrop),
    },
    options,
  });
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) => {
  return harden({
    // Somewhat unorthodox, source the exports from this builder module
    sourceSpec: '@agoric/builders/scripts/testing/start-tribbles-airdrop.js',
    getManifestCall: [
      'getManifestForAirdrop',
      {
        installKeys: {
          tribblesAirdrop: publishRef(
            install(
              '@agoric/orchestration/src/examples/airdrop/airdrop.contract.js',
            ),
          ),
        },
      },
    ],
  });
};

export default async (homeP, endowments) => {
  // import dynamically so the module can work in CoreEval environment
  const dspModule = await import('@agoric/deploy-script-support');
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(startAirdrop.name, defaultProposalBuilder);
};
