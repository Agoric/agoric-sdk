// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test as unknownTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import path from 'path';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import {
  makeMockChainStorageRoot,
  setUpZoeForTest,
  withAmountUtils,
} from '@agoric/inter-protocol/test/supports.js';
import committeeBundle from '@agoric/governance/bundles/bundle-committee.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { E, Far } from '@endo/far';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio.js';
import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';
import { makeScalarMap } from '@agoric/store';
import { makeSubscriptionKit } from '@agoric/notifier';
import { eventLoopIteration } from '@agoric/zoe/tools/eventLoopIteration.js';
import { publishDepositFacet } from '@agoric/smart-wallet/src/walletFactory.js';
import { WalletName } from '@agoric/internal';
import { makeBoard } from '../src/lib-board.js';
import centralSupplyBundle from '../bundles/bundle-centralSupply.js';
import { makeBridgeProvisionTool } from '../src/provisionPool.js';
import { makeNameHubKit } from '../src/nameHub.js';
import { PowerFlags } from '../src/core/basic-behaviors.js';
import { buildRootObject as buildBankRoot } from '../src/vat-bank.js';

const pathname = new URL(import.meta.url).pathname;
const dirname = path.dirname(pathname);

const psmRoot = `${dirname}/../../inter-protocol/src/psm/psm.js`;
const policyRoot = `${dirname}/../src/provisionPool.js`;

const scale6 = x => BigInt(Math.round(x * 1_000_000));

const BASIS_POINTS = 10000n;
const WantMintedFeeBP = 1n;
const GiveMintedFeeBP = 3n;
const MINT_LIMIT = scale6(20_000_000);

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = unknownTest;

const makeTestContext = async () => {
  const bundleCache = await unsafeMakeBundleCache('bundles/');
  const psmBundle = await bundleCache.load(psmRoot, 'psm');
  const policyBundle = await bundleCache.load(policyRoot, 'provisionPool');
  const { zoe, feeMintAccess } = setUpZoeForTest();

  const mintedIssuer = await E(zoe).getFeeIssuer();
  /** @type {Brand<'nat'>} */
  const mintedBrand = await E(mintedIssuer).getBrand();
  const anchor = withAmountUtils(makeIssuerKit('aUSD'));

  const committeeInstall = await E(zoe).install(committeeBundle);
  const psmInstall = await E(zoe).install(psmBundle);
  const centralSupply = await E(zoe).install(centralSupplyBundle);
  /** @type {Installation<import('../src/provisionPool').start>} */
  const policyInstall = await E(zoe).install(policyBundle);

  const mintLimit = AmountMath.make(mintedBrand, MINT_LIMIT);

  const marshaller = makeBoard().getReadonlyMarshaller();

  const storageRoot = makeMockChainStorageRoot();
  const { creatorFacet: committeeCreator } = await E(zoe).startInstance(
    committeeInstall,
    harden({}),
    {
      committeeName: 'Demos',
      committeeSize: 1,
    },
    {
      storageNode: storageRoot.makeChildNode('thisCommittee'),
      marshaller,
    },
  );

  const initialPoserInvitation = await E(committeeCreator).getPoserInvitation();
  const invitationAmount = await E(E(zoe).getInvitationIssuer()).getAmountOf(
    initialPoserInvitation,
  );

  return {
    bundles: { psmBundle },
    storageRoot,
    zoe: await zoe,
    feeMintAccess: await feeMintAccess,
    committeeCreator,
    initialPoserInvitation,
    minted: { issuer: mintedIssuer, brand: mintedBrand },
    anchor,
    installs: {
      committeeInstall,
      psmInstall,
      centralSupply,
      provisionPool: policyInstall,
    },
    mintLimit,
    marshaller,
    terms: {
      anchorBrand: anchor.brand,
      anchorPerMinted: makeRatio(100n, anchor.brand, 100n, mintedBrand),
      governedParams: {
        [CONTRACT_ELECTORATE]: {
          type: ParamTypes.INVITATION,
          value: invitationAmount,
        },
        GiveMintedFee: {
          type: ParamTypes.RATIO,
          value: makeRatio(GiveMintedFeeBP, mintedBrand, BASIS_POINTS),
        },
        MintLimit: { type: ParamTypes.AMOUNT, value: mintLimit },
        WantMintedFee: {
          type: ParamTypes.RATIO,
          value: makeRatio(WantMintedFeeBP, mintedBrand, BASIS_POINTS),
        },
      },
    },
  };
};

test.before(async t => {
  t.context = await makeTestContext();
});

/** @param {Awaited<ReturnType<typeof makeTestContext>>} context */
const tools = context => {
  const { zoe, anchor, installs, storageRoot } = context;
  // @ts-expect-error missing mint
  const minted = withAmountUtils(context.minted);
  const makeBank = () => {
    const issuers = makeScalarMap();
    [minted, anchor].forEach(kit => issuers.init(kit.brand, kit.issuer));
    const purses = makeScalarMap();
    [minted, anchor].forEach(kit => {
      assert(kit.issuer);
      purses.init(kit.brand, E(kit.issuer).makeEmptyPurse());
    });

    /** @type {SubscriptionRecord<import('../src/vat-bank.js').AssetDescriptor>} */
    const { subscription, publication } = makeSubscriptionKit();

    /** @type {import('../src/vat-bank.js').Bank} */
    const bank = Far('mock bank', {
      /** @param {Brand} brand */
      getPurse: brand => purses.get(brand),
      getAssetSubscription: () => subscription,
    });

    return { assetPublication: publication, bank };
  };
  const { assetPublication, bank: poolBank } = makeBank();

  // Each driver needs its own to avoid state pollution between tests
  context.mockChainStorage = makeMockChainStorageRoot();
  const { feeMintAccess, initialPoserInvitation } = context;
  const startPSM = name => {
    return E(zoe).startInstance(
      installs.psmInstall,
      harden({ AUSD: anchor.issuer }),
      context.terms,
      {
        feeMintAccess,
        initialPoserInvitation,
        storageNode: storageRoot.makeChildNode(name),
        marshaller: makeBoard().getReadonlyMarshaller(),
      },
    );
  };

  const publishAnchorAsset = async () => {
    assetPublication.updateState({
      brand: anchor.brand,
      issuer: anchor.issuer || assert.fail(),
      issuerName: 'USDref',
      denom: 'ibc/toyusdc',
      proposedName: 'toy USDC',
    });
  };
  return { minted, poolBank, startPSM, publishAnchorAsset };
};

test('provisionPool trades provided assets for IST', async t => {
  const { zoe, anchor, installs, storageRoot, committeeCreator } = t.context;

  const { minted, poolBank, startPSM, publishAnchorAsset } = tools(t.context);

  t.log('prepare anchor purse with 100 aUSD');
  const anchorPurse = E(poolBank).getPurse(anchor.brand);
  assert(anchor.mint);
  await E(anchorPurse).deposit(
    await E(anchor.mint).mintPayment(anchor.make(scale6(100))),
  );

  const initialPoserInvitation = await E(committeeCreator).getPoserInvitation();
  const invitationAmount = await E(E(zoe).getInvitationIssuer()).getAmountOf(
    initialPoserInvitation,
  );

  // mock gov terms
  /** @type {Instance} */
  const electionManager = /** @type {any} */ (null);
  const govTerms = {
    electionManager,
    initialPoserInvitation,
    governedParams: {
      [CONTRACT_ELECTORATE]: {
        type: ParamTypes.INVITATION,
        value: invitationAmount,
      },
      PerAccountInitialAmount: {
        type: ParamTypes.AMOUNT,
        value: minted.make(scale6(0.25)),
      },
    },
  };
  t.log('startInstance(provisionPool)');
  const facets = await E(zoe).startInstance(
    installs.provisionPool,
    {},
    govTerms,
    {
      poolBank,
      initialPoserInvitation,
      storageNode: storageRoot.makeChildNode('provisionPool'),
      marshaller: makeBoard().getReadonlyMarshaller(),
    },
  );

  t.log('introduce PSM instance to provisionPool');
  const psm = await startPSM('IST-AUSD');
  await E(E(facets.creatorFacet).getLimitedCreatorFacet()).initPSM(
    anchor.brand,
    psm.instance,
  );

  t.log('publish anchor asset to initiate trading');
  await publishAnchorAsset();
  await eventLoopIteration(); // wait for trade

  const mintedPurse = E(poolBank).getPurse(minted.brand);
  const poolBalanceAfter = await E(mintedPurse).getCurrentAmount();
  t.log('post-trade pool balance:', poolBalanceAfter);
  t.deepEqual(
    poolBalanceAfter,
    minted.make(scale6(100) - WantMintedFeeBP * BASIS_POINTS),
  );
  const anchorBalanceAfter = await E(anchorPurse).getCurrentAmount();
  t.log('post-trade anchor balance:', anchorBalanceAfter);
  t.deepEqual(anchorBalanceAfter, anchor.makeEmpty());
});

/**
 * This is a bit of a short-cut; rather than scaffold
 * everything needed to make a walletFactory, we factored
 * out the part that had a bug as `publishDepositFacet`
 * and we make a mock walletFactory that uses it.
 *
 * @param {string} address
 */
const makeWalletFactoryKitFor1 = async address => {
  const bankManager = await buildBankRoot().makeBankManager();

  const fees = withAmountUtils(makeIssuerKit('FEE'));
  await bankManager.addAsset('ufee', 'FEE', 'FEE', fees);

  const sendInitialPayment = async (_addr, dest) => {
    const pmt = fees.mint.mintPayment(fees.make(250n));
    return E(E(dest).getPurse(fees.brand)).deposit(pmt);
  };

  const b1 = bankManager.getBankForAddress(address);
  const p1 = b1.getPurse(fees.brand);

  /** @type {import('@agoric/smart-wallet/src/smartWallet.js').SmartWallet} */
  // @ts-expect-error mock
  const smartWallet = harden({
    getDepositFacet: () => {
      pmt => E(p1).deposit(pmt);
    },
  });

  const done = new Set();
  /** @type {import('@agoric/vats/src/core/startWalletFactory').WalletFactoryStartResult['creatorFacet']} */
  // @ts-expect-error mock
  const walletFactory = {
    provideSmartWallet: async (a, _b, nameAdmin) => {
      assert.equal(a, address);

      const created = !done.has(a);
      if (created) {
        await publishDepositFacet(address, smartWallet, nameAdmin);
        done.add(a);
      }
      return [smartWallet, created];
    },
  };

  return { fees, sendInitialPayment, bankManager, walletFactory, p1 };
};

test('makeBridgeProvisionTool handles duplicate requests', async t => {
  const address = 'addr123';
  t.log('make a wallet factory just for', address);
  const { walletFactory, p1, fees, sendInitialPayment, bankManager } =
    await makeWalletFactoryKitFor1(address);

  t.log('use makeBridgeProvisionTool to make a bridge handler');
  const { nameHub: namesByAddress, nameAdmin: namesByAddressAdmin } =
    makeNameHubKit();
  const publishMetrics = () => {};
  const makeHandler = makeBridgeProvisionTool(
    sendInitialPayment,
    publishMetrics,
  );
  const handler = makeHandler({
    bankManager,
    namesByAddressAdmin,
    walletFactory,
  });

  t.log('1st request to provision a SMART_WALLET for', address);
  await handler.fromBridge('wallet', {
    type: 'PLEASE_PROVISION',
    address,
    powerFlags: PowerFlags.SMART_WALLET,
  });

  t.deepEqual(
    await E(p1).getCurrentAmount(),
    fees.make(250n),
    'received starter funds',
  );
  const myDepositFacet = await namesByAddress.lookup(
    address,
    WalletName.depositFacet,
  );

  t.log('2nd request to provision a SMART_WALLET for', address);
  await handler.fromBridge('wallet', {
    type: 'PLEASE_PROVISION',
    address,
    powerFlags: PowerFlags.SMART_WALLET,
  });
  t.is(
    myDepositFacet,
    await namesByAddress.lookup(address, WalletName.depositFacet),
    'depositFacet lookup finds the same object',
  );
  t.deepEqual(
    await E(p1).getCurrentAmount(),
    fees.make(500n),
    'received more starter funds',
  );
});
