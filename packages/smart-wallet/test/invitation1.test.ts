/* global setTimeout */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import { createRequire } from 'module';
import type { Baggage } from '@agoric/vat-data';
import type { Installation, InvitationDetails } from '@agoric/zoe';
import { E, Far } from '@endo/far';
import { makeScalarMapStore } from '@agoric/store';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { makeNameHubKit, makePromiseSpace } from '@agoric/vats';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKitForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { makeWellKnownSpaces } from '@agoric/vats/src/core/utils.js';
import { makeMockChainStorageRoot } from '@agoric/internal/src/storage-test-utils.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { allValues } from '@agoric/internal';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import type { Brand, Issuer } from '@agoric/ertp';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { prepareSmartWallet } from '../src/smartWallet.js';
import type {
  BrandDescriptor,
  BrandDescriptorRegistry,
  BridgeAction,
} from '../src/smartWallet.js';

type WalletFactoryPrepare = typeof import('../src/walletFactory.js').prepare;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const nodeRequire = createRequire(import.meta.url);
const asset = {
  anyContract: nodeRequire.resolve(
    '@agoric/zoe/src/contracts/automaticRefund.js',
  ),
};

const mockBootstrapPowers = async (
  log,
  spaceNames = ['installation', 'instance', 'issuer', 'brand'],
) => {
  const baggage = makeScalarMapStore<string, unknown>('bootstrap');
  const zone = makeDurableZone(baggage as unknown as Baggage);
  const { produce, consume } = makePromiseSpace();

  const { admin, vatAdminState } = makeFakeVatAdmin();
  const { zoeService: zoe } = makeZoeKitForTest(admin);
  produce.zoe.resolve(zoe);

  const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } =
    makeNameHubKit();
  produce.agoricNames.resolve(agoricNames);

  const spaces = await makeWellKnownSpaces(agoricNamesAdmin, log, spaceNames);

  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const invitationBrand = await E(invitationIssuer).getBrand();
  spaces.brand.produce.Invitation.resolve(invitationBrand);
  spaces.issuer.produce.Invitation.resolve(invitationIssuer);

  const chainStorage = makeMockChainStorageRoot();
  produce.chainStorage.resolve(chainStorage);

  const board = makeFakeBoard();
  produce.board.resolve(board);

  const powers = {
    produce,
    consume,
    ...spaces,
    zone,
  } as unknown as BootstrapPowers;
  const shared: Record<string, any> = {};

  return { powers, vatAdminState, chainStorage, shared };
};

const makeTestContext = async t => {
  const bootKit = await mockBootstrapPowers(t.log);
  const bundleCache = await makeNodeBundleCache('bundles/', {}, s => import(s));

  const consume = bootKit.powers.consume as Record<string, any>;
  const powers = bootKit.powers as Record<string, any>;
  const agoricNames = consume.agoricNames;
  const board = consume.board;
  const zoe = consume.zoe;
  const startAnyContract = async () => {
    const bundle = await bundleCache.load(asset.anyContract, 'automaticRefund');
    const installation: Promise<Installation<WalletFactoryPrepare>> =
      E(zoe).install(bundle);
    return E(zoe).startInstance(installation);
  };
  const { instance: anyInstance } = await startAnyContract();

  const makeSpendableAsset = () => {
    const tok1 = makeIssuerKit('Tok1');
    const { issuer, brand } = powers;
    issuer.produce.Token1.resolve(tok1.issuer);
    brand.produce.Token1.resolve(tok1.brand);
    return tok1;
  };
  const spendable = makeSpendableAsset();

  const makeRegistry = async () => {
    const be = (await E(E(agoricNames).lookup('brand')).entries()) as Array<
      [string, Brand]
    >;
    const ie = (await E(E(agoricNames).lookup('issuer')).entries()) as Array<
      [string, Issuer]
    >;
    const byName = Object.fromEntries(ie);
    const descriptors = await Promise.all(
      be.map(([name, b]) => {
        const d: Promise<BrandDescriptor> = allValues({
          brand: b,
          displayInfo: E(b).getDisplayInfo(),
          issuer: byName[name],
          petname: name,
        });
        return d;
      }),
    );
    const store = makeScalarMapStore<Brand, BrandDescriptor>('registry');
    store.addAll(
      harden(descriptors.map(d => [d.brand, d] as [Brand, BrandDescriptor])),
    );
    return store as BrandDescriptorRegistry;
  };
  const registry = await makeRegistry();

  const swBaggage = makeScalarMapStore<string, unknown>(
    'smart-wallet',
  ) as unknown as Baggage;

  const { brand: brandSpace, issuer: issuerSpace } = powers;
  const invitationIssuer = (await issuerSpace.consume
    .Invitation) as Issuer<'set'>;
  const invitationBrand = (await brandSpace.consume.Invitation) as Brand<'set'>;
  const invitationDisplayInfo = await E(invitationBrand).getDisplayInfo();
  const publicMarshaller = await E(board).getPublishingMarshaller();
  const makeSmartWallet = prepareSmartWallet(swBaggage, {
    agoricNames,
    invitationBrand,
    invitationDisplayInfo,
    invitationIssuer,
    publicMarshaller,
    zoe,
    registry,
  });

  return { ...bootKit, makeSmartWallet, anyInstance, spendable };
};

type TestContext = Awaited<ReturnType<typeof makeTestContext>>;

const test = anyTest as TestFn<TestContext>;

test.before(async t => (t.context = await makeTestContext(t)));

const OFFER_ID = 'offer1';

test.serial('handle failure to create invitation', async t => {
  const { powers, makeSmartWallet, spendable, shared } = t.context;
  const { chainStorage, board } = powers.consume as Record<string, any>;
  const invitationIssuer = (await powers.issuer.consume.Invitation) as Issuer<
    'set',
    InvitationDetails
  >;
  const address = 'agoric1234';

  //  Test setup ensures that chainStorage resolution is not undefined. (see #8247)
  const walletsStorage = E(chainStorage).makeChildNode('wallet');
  const walletStorageNode = await E(walletsStorage).makeChildNode(address);

  const invitationPurse = await E(invitationIssuer).makeEmptyPurse();

  const makeBank = (): import('@agoric/vats/src/vat-bank.js').Bank =>
    Far('Bank', {
      getPurse: async brand => {
        assert(brand === spendable.brand);
        if (shared.thePurse) return shared.thePurse;

        const purse = await E(spendable.issuer).makeEmptyPurse();
        const amt = AmountMath.make(spendable.brand, 100n);
        const pmt = await E(spendable.mint).mintPayment(amt);
        await E(purse).deposit(pmt);
        const slowWithdrawPurse = {
          ...purse,
          withdraw: async a => {
            await delay(100);
            console.log('@@slow withdraw', a);
            return E(purse).withdraw(a);
          },
          getCurrentAmount: () => purse.getCurrentAmount(),
        };
        return slowWithdrawPurse;
      },
      getAssetSubscription: () => {
        throw Error('TODO');
      },
    });

  const theBank = makeBank();
  shared.thePurse = await theBank.getPurse(spendable.brand);

  const smartWallet = await makeSmartWallet({
    address,
    walletStorageNode,
    bank: theBank,
    invitationPurse,
  });
  shared.theWallet = smartWallet;

  const { anyInstance } = t.context;
  const In = AmountMath.make(spendable.brand, 5n);

  const spec1 = {
    method: 'executeOffer',
    offer: {
      id: OFFER_ID,
      invitationSpec: {
        source: 'contract',
        instance: anyInstance,
        publicInvitationMaker: 'noSuchMethod',
      },
      proposal: {
        give: { In },
      },
    },
  } as BridgeAction;

  const publicMarshaller = await E(board).getPublishingMarshaller();
  const actionCapData = await E(publicMarshaller).toCapData(spec1);
  await t.throwsAsync(E(smartWallet).handleBridgeAction(actionCapData, true));
  await delay(200);
});

test.serial('funds should be back in the purse', async t => {
  t.like(t.context.shared.thePurse.getCurrentAmount(), { value: 100n });
});

test.serial('recover withdrawn payments', async t => {
  const { powers, shared } = t.context;
  const { thePurse, theWallet } = shared;

  const spec1 = {
    method: 'tryExitOffer',
    offerId: OFFER_ID,
  } satisfies BridgeAction;

  const { board } = powers.consume;
  const publicMarshaller = await E(board).getPublishingMarshaller();

  const actionCapData = await E(publicMarshaller).toCapData(spec1);
  await t.throwsAsync(E(theWallet).handleBridgeAction(actionCapData, true), {
    message: /key "offer1" not found in collection "live offer seats"/,
  });
  await eventLoopIteration();
  await delay(10);
  t.like(thePurse.getCurrentAmount(), { value: 100n });
});
