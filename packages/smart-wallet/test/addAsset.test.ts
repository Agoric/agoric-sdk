import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { Brand } from '@agoric/ertp';
import type { MockChainStorageRoot as MockVStorageRoot } from '@agoric/internal/src/storage-test-utils.js';
import type { ExecutionContext, TestFn } from 'ava';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import type { StorageNode } from '@agoric/internal/src/lib-chainStorage.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeCopyBag } from '@agoric/store';
import { makeFakeBankManagerKit } from '@agoric/vats/tools/bank-utils.js';
import bundleSource from '@endo/bundle-source';
import { Fail } from '@endo/errors';
import { E, Far, type ERef } from '@endo/far';
import { makeMarshal, type CapData } from '@endo/marshal';
import type { PromiseKit } from '@endo/promise-kit';
import { makePromiseKit } from '@endo/promise-kit';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { makeImportContext } from '../src/marshal-contexts.js';
import type { OfferSpec } from '../src/offers.js';
import type { BridgeAction, UpdateRecord } from '../src/smartWallet.js';
import { makeDefaultTestContext } from './contexts.ts';
import { ActionType, headValue, makeMockTestSpace } from './supports.ts';

type BundleLike = Awaited<ReturnType<typeof bundleSource>>;

type DefaultTestContext = Awaited<ReturnType<typeof makeDefaultTestContext>>;

const importSpec = async spec =>
  new URL(importMetaResolve(spec, import.meta.url)).pathname;

const test = anyTest as TestFn<DefaultTestContext>;

test.before(async t => {
  const withBankManager = async () => {
    const { bankManager } = await makeFakeBankManagerKit();
    const noop = () => {};
    const space0 = await makeMockTestSpace(noop);
    space0.produce.bankManager.reset();
    space0.produce.bankManager.resolve(bankManager);
    return space0;
  };
  t.context = await makeDefaultTestContext(t, withBankManager);
});

const LOG_NEWS_HEAD = false;
const bigIntReplacer = (_key, val) =>
  typeof val === 'bigint' ? Number(val) : val;

const range = qty => [...Array(qty).keys()];

// We use test.serial() because
// agoricNames and vstorage are shared mutable state.

/**
 * NOTE: this doesn't test all forms of work. A better test would measure
 * inter-vat messages or some such.
 */
test.serial('avoid O(wallets) storage writes for a new asset', async t => {
  const bankManager = t.context.consume.bankManager;

  let chainStorageWrites = 0;

  const startUser = async ix => {
    const address = `agoric1u${ix}`;
    const smartWallet = t.context.simpleProvideWallet(address);

    // stick around waiting for things to happen
    const current = await E(smartWallet).getCurrentSubscriber();
    let publishCount: bigint | undefined;
    for (;;) {
      const news = await E(current).subscribeAfter(publishCount);
      publishCount = news.publishCount;
      chainStorageWrites += 1;
      if (LOG_NEWS_HEAD) {
        console.log(JSON.stringify(news.head, bigIntReplacer, 2));
      }
    }
  };

  const simulate = async (qty, denom, name) => {
    for (const idx of range(qty)) {
      void startUser(idx);
    }
    await eventLoopIteration();
    const initialWrites = chainStorageWrites;

    const kit = makeIssuerKit(name);
    await E(bankManager).addAsset(denom, name, name, kit);
    await eventLoopIteration();
    return {
      qty,
      initialWrites,
      addedWrites: chainStorageWrites - initialWrites,
    };
  };
  const base = await simulate(2, 'ibc/dai1', 'DAI_axl');
  const exp = await simulate(6, 'ibc/dai2', 'DAI_grv');

  t.true(
    exp.addedWrites <= (base.addedWrites * exp.qty) / base.qty / 2,
    'actual writes should be less than half of linear growth',
  );

  // a stronger requirement for Cosmos balances, though that's
  // the only kind of balance we have yet.
  t.is(base.addedWrites, 0);
  t.is(exp.addedWrites, 0);
});

const BOARD_AUX = 'boardAux';
/**
 * Make a storage node for auxilliary data for a value on the board.
 *
 * @param chainStorage
 * @param boardId
 */
const makeBoardAuxNode = async (
  chainStorage: ERef<StorageNode>,
  boardId: string,
) => {
  const boardAux = E(chainStorage).makeChildNode(BOARD_AUX);
  return E(boardAux).makeChildNode(boardId);
};

const marshalData = makeMarshal(_val => Fail`data only`);

const the: <T>(xP: Promise<T | null | undefined>) => Promise<T> = async xP => {
  const x = await xP;
  assert(x != null, 'resolution is unexpectedly nullish');
  return x;
};

const IST_UNIT = 1_000_000n;
const CENT = IST_UNIT / 100n;

const makeScenario = (
  t: ExecutionContext<Awaited<ReturnType<typeof makeDefaultTestContext>>>,
) => {
  /**
   * A player and their user agent (wallet UI, signer)
   *
   * @param addr
   * @param bridgeKit - to announce UI is ready
   * @param vsRPC - access to vstorage via RPC
   * @param broadcastMsg
   * @param walletUpdates - access to wallet updates via RPC
   */
  const aPlayer = async (
    addr: string,
    bridgeKit: PromiseKit<any>,
    vsRPC: MockVStorageRoot,
    broadcastMsg: typeof t.context.sendToBridge,
    walletUpdates: any,
  ) => {
    const ctx = makeImportContext();
    const vsGet = path =>
      E(vsRPC).getBody(`mockChainStorageRoot.${path}`, ctx.fromBoard);

    // Ingest well-known brands, instances.
    // Wait for vstorage publication to settle first.
    await eventLoopIteration();
    const wkBrand = Object.fromEntries(
      (await vsGet(`agoricNames.brand`)) as Array<[string, Brand]>,
    );
    await vsGet(`agoricNames.instance`);
    t.log(addr, 'wallet UI: ingest well-known brands', wkBrand.Place);

    assert(broadcastMsg);
    const signAndBroadcast = async (action: BridgeAction) => {
      const actionEncoding = ctx.fromBoard.toCapData(action as any);
      const addIssuerMsg = {
        type: ActionType.WALLET_SPEND_ACTION,
        owner: addr,
        spendAction: JSON.stringify(actionEncoding),
        blockTime: 0,
        blockHeight: 0,
      };
      t.log(addr, 'walletUI: broadcast signed message', action.method);
      await broadcastMsg(addIssuerMsg);
    };

    const auxInfo = async (obj: any) => {
      const slot = ctx.fromBoard.toCapData(obj).slots[0];
      return vsGet(`${BOARD_AUX}.${slot}`);
    };

    const { entries } = Object;
    const uiBridge = Far('UIBridge', {
      proposeOffer: async (offerEncoding: CapData<string>) => {
        const offer = ctx.fromBoard.fromCapData(offerEncoding) as OfferSpec;
        const { give, want } = offer.proposal;
        for await (const [kw, amt] of entries({ ...give, ...want } as Record<
          string,
          { brand: Brand }
        >) as Array<[string, { brand: Brand }]>) {
          const { displayInfo } = (await auxInfo(amt.brand as any)) as {
            displayInfo?: { assetKind?: string };
          };
          const kind = displayInfo?.assetKind === 'nat' ? 'fungible' : 'NFT';
          t.log('wallet:', kind, 'display for', kw, amt.brand);
        }
        t.log(addr, 'walletUI: approve offer:', offer.id);
        await signAndBroadcast(harden({ method: 'executeOffer', offer }));
      },
    });
    bridgeKit.resolve(uiBridge);
    return walletUpdates;
  };

  return { aPlayer };
};

test.serial('trading in non-vbank asset: game real-estate NFTs', async t => {
  const pettyCashQty = 1000n;
  const pettyCashPK = makePromiseKit<any>();

  const publishBrandInfo = async (chainStorage, board, brand) => {
    const [id, displayInfo] = await Promise.all([
      E(board).getId(brand),
      E(brand).getDisplayInfo(),
    ]);
    const node = makeBoardAuxNode(chainStorage, id);
    const aux = marshalData.toCapData(harden({ displayInfo }));
    await E(node).setValue(JSON.stringify(aux));
  };

  const finishBootstrap = async (
    { consume }: BootstrapPowers,
    bundles: Record<string, BundleLike>,
  ) => {
    const kindAdmin = kind => E(consume.agoricNamesAdmin).lookupAdmin(kind);

    const publishAgoricNames = async () => {
      const { board, chainStorage } = consume;
      const pubm = E(board).getPublishingMarshaller();
      const namesNode = await E(chainStorage)?.makeChildNode('agoricNames');
      assert(namesNode);
      for (const kind of ['brand', 'instance']) {
        const kindNode = await E(namesNode).makeChildNode(kind);
        const kindUpdater = Far('Updater', {
          write: async x => {
            // console.log('marshal for vstorage write', x);
            const capData = await E(pubm).toCapData(x);
            await E(kindNode).setValue(JSON.stringify(capData));
          },
        });
        await E(kindAdmin(kind)).onUpdate(kindUpdater);
      }
      t.log('bootstrap: share agoricNames updates via vstorage RPC');
    };

    const shareIST = async () => {
      const { chainStorage, bankManager, board, feeMintAccess, zoe } = consume;
      const stable = await E(zoe)
        .getFeeIssuer()
        .then(issuer => {
          return E(issuer)
            .getBrand()
            .then(brand => ({ issuer, brand }));
        });
      await E(kindAdmin('issuer')).update('IST', stable.issuer);
      await E(kindAdmin('brand')).update('IST', stable.brand);
      // TODO: publishBrandInfo for all brands in agoricNames.brand
      await publishBrandInfo(chainStorage, board, stable.brand);

      const invitation = await E(E(zoe).getInvitationIssuer()).getBrand();
      await E(kindAdmin('brand')).update('Zoe Invitation', invitation);

      const { creatorFacet: supplier } = await E(zoe).startInstance(
        E(zoe).install(bundles.centralSupply),
        {},
        { bootstrapPaymentValue: pettyCashQty * IST_UNIT },
        { feeMintAccess: await feeMintAccess },
      );
      const bootPmt = await E(supplier).getBootstrapPayment();
      const stableSupply = E(stable.issuer).makeEmptyPurse();
      await E(stableSupply).deposit(bootPmt);
      pettyCashPK.resolve(stableSupply);

      await E(bankManager).addAsset(
        'uist',
        'IST',
        'Inter Stable Token',
        stable,
      );
    };

    await Promise.all([publishAgoricNames(), shareIST()]);
  };

  /**
   * Core eval script to start contract
   */
  const startGameContract = async (
    { consume }: BootstrapPowers,
    bundle: BundleLike,
  ) => {
    const { agoricNames, agoricNamesAdmin, board, chainStorage, zoe } = consume;
    const istBrand = await E(agoricNames).lookup('brand', 'IST');
    const ist = {
      brand: istBrand,
    };
    const terms = { joinPrice: AmountMath.make(ist.brand, 25n * CENT) };
    const installationP = E(zoe).install(bundle); // in prod: installBundleId
    // in prod: use startUpgradeable() to save adminFacet
    const { instance } = await E(zoe).startInstance(installationP, {}, terms);
    t.log('CoreEval script: started game contract', instance);
    const {
      brands: { Place: brand },
      issuers: { Place: issuer },
    } = await E(zoe).getTerms(instance);

    t.log('CoreEval script: share via agoricNames:', brand);
    const kindAdmin = kind => E(agoricNamesAdmin).lookupAdmin(kind);
    await Promise.all([
      E(kindAdmin('instance')).update('game1', instance),
      E(kindAdmin('issuer')).update('Place', issuer),
      E(kindAdmin('brand')).update('Place', brand),
      publishBrandInfo(the(chainStorage), board, brand),
    ]);
  };

  /**
   * @param rpc - access to vstorage (in prod: via RPC)
   * @param walletBridge - iframe connection to wallet UI
   */
  const dappFrontEnd = async (rpc: MockVStorageRoot, walletBridge: any) => {
    const { fromEntries } = Object;
    const ctx = makeImportContext();
    await eventLoopIteration();
    const vsGet = (path: string) =>
      E(rpc).getBody(`mockChainStorageRoot.${path}`, ctx.fromBoard);

    const wkBrand = fromEntries(
      (await vsGet(`agoricNames.brand`)) as Array<[string, Brand]>,
    );
    const wkInstance = fromEntries(
      (await vsGet(`agoricNames.instance`)) as Array<[string, any]>,
    );
    t.log('game UI: ingested well-known brands:', wkBrand.Place);

    const choices = ['Park Place', 'Boardwalk'];
    const want = {
      Places: AmountMath.make(
        wkBrand.Place,
        makeCopyBag(choices.map(name => [name, 1n])),
      ),
    };
    const give = { Price: AmountMath.make(wkBrand.IST, 25n * CENT) };
    const offer1 = harden({
      id: 'joinGame1234',
      invitationSpec: {
        source: 'contract',
        instance: wkInstance.game1,
        publicInvitationMaker: 'makeJoinInvitation',
      },
      proposal: { give, want },
    }) satisfies OfferSpec;
    t.log('game UI: propose offer of 0.25IST for', choices.join(', '));
    await E(walletBridge).proposeOffer(ctx.fromBoard.toCapData(offer1));
  };

  // TODO: hoist the functions above out of the test
  // so that t.context is not in scope?
  const { consume, simpleProvideWallet, sendToBridge } = t.context;

  const bundles = {
    game: await importSpec('./gameAssetContract.ts').then(spec =>
      bundleSource(spec),
    ),
    centralSupply: await importSpec('@agoric/vats/src/centralSupply.js').then(
      spec => bundleSource(spec),
    ),
  };

  const fundWalletAndSubscribe = async (addr, istQty) => {
    const purse: any = pettyCashPK.promise;
    const spendBrand = await E(purse).getAllegedBrand();
    const spendingPmt = await E(purse).withdraw(
      AmountMath.make(spendBrand, istQty * IST_UNIT),
    );
    const wallet = simpleProvideWallet(addr);
    t.log('deposit', istQty, 'IST into wallet of', addr);
    await E(E(wallet).getDepositFacet()).receive(spendingPmt);
    const updates = await E(wallet).getUpdatesSubscriber();
    return updates;
  };

  const somePowers = { consume } as unknown as BootstrapPowers;

  const mockStorage =
    (await consume.chainStorage) as unknown as MockVStorageRoot;
  await finishBootstrap(somePowers, bundles);
  t.log(
    'install game contract bundle with hash:',
    bundles.game.endoZipBase64Sha512.slice(0, 24),
    '...',
  );

  {
    const addr1 = 'agoric1player1';
    const walletUIbridge = makePromiseKit();
    const { aPlayer } = makeScenario(t);

    const [_1, _2, updates] = await Promise.all([
      startGameContract(somePowers, bundles.game),
      dappFrontEnd(mockStorage, walletUIbridge.promise),
      aPlayer(
        addr1,
        walletUIbridge,
        mockStorage,
        sendToBridge,
        fundWalletAndSubscribe(addr1, 10n),
      ),
    ]);

    const expected = [
      ['Park Place', 1n],
      ['Boardwalk', 1n],
    ] as [string, bigint][];

    const update = (await headValue(updates)) as UpdateRecord;
    assert(update.updated === 'offerStatus');
    // t.log(update.status);
    t.like(update, {
      updated: 'offerStatus',
      status: {
        id: 'joinGame1234',
        invitationSpec: { publicInvitationMaker: 'makeJoinInvitation' },
        numWantsSatisfied: 1,
        payouts: { Places: { value: { payload: expected } } },
        result: 'welcome to the game',
      },
    });
    const {
      status: { id, result, payouts },
    } = update;
    const names = payouts?.Places.value.payload.map(([name, _qty]) => name);
    t.log(id, 'result:', result, ', payouts:', names.join(', '));

    // wallet balance was also updated
    const ctx = makeImportContext();
    const vsGet = (path, ix = -1) =>
      mockStorage.getBody(`mockChainStorageRoot.${path}`, ctx.fromBoard, ix);
    const wkb = Object.fromEntries(
      vsGet(`agoricNames.brand`) as Iterable<[string, Brand]>,
    );
    vsGet(`agoricNames.instance`);

    const balanceUpdate = vsGet(`wallet.${addr1}`, -2);
    t.deepEqual(balanceUpdate, {
      updated: 'balance',
      currentAmount: {
        brand: wkb.Place,
        value: makeCopyBag(expected as Iterable<[string, bigint]>),
      },
    });
  }
});

test.serial('non-vbank asset: give before deposit', async t => {
  /**
   * Goofy client: proposes to give Places before we have any
   *
   * @param rpc - access to vstorage (in prod: via RPC)
   * @param walletBridge - iframe connection to wallet UI
   */
  const goofyClient = async (rpc: MockVStorageRoot, walletBridge: any) => {
    const { fromEntries } = Object;
    const ctx = makeImportContext();
    const vsGet = path =>
      E(rpc).getBody(`mockChainStorageRoot.${path}`, ctx.fromBoard);
    const wkBrand = fromEntries(
      (await vsGet(`agoricNames.brand`)) as Array<[string, Brand]>,
    );
    const wkInstance = fromEntries(
      (await vsGet(`agoricNames.instance`)) as Array<[string, any]>,
    );

    const choices = ['Disney Land'];
    const give = {
      Places: AmountMath.make(
        wkBrand.Place,
        makeCopyBag(choices.map(name => [name, 1n])),
      ),
    };
    const want = { Price: AmountMath.make(wkBrand.IST, 25n * CENT) };

    const offer1 = harden({
      id: 'joinGame2345',
      invitationSpec: {
        source: 'contract',
        instance: wkInstance.game1,
        publicInvitationMaker: 'makeJoinInvitation',
      },
      proposal: { give, want },
    }) satisfies OfferSpec;
    t.log('goofy client: propose to give', choices.join(', '));
    await E(walletBridge).proposeOffer(ctx.fromBoard.toCapData(offer1));
  };

  {
    const addr2 = 'agoric1player2';
    const walletUIbridge = makePromiseKit();
    // await eventLoopIteration();

    const { simpleProvideWallet, consume, sendToBridge } = t.context;
    const wallet = simpleProvideWallet(addr2);
    const updates = await E(wallet).getUpdatesSubscriber();
    const mockStorage =
      (await consume.chainStorage) as unknown as MockVStorageRoot;
    const { aPlayer } = makeScenario(t);

    await aPlayer(addr2, walletUIbridge, mockStorage, sendToBridge, updates);
    const c2 = goofyClient(mockStorage, walletUIbridge.promise);
    await t.throwsAsync(c2, { message: /Withdrawal of {.*} failed/ });
    await eventLoopIteration();

    // wallet balance was also updated
    const ctx = makeImportContext();
    const vsGet = (path, ix = -1) =>
      mockStorage.getBody(`mockChainStorageRoot.${path}`, ctx.fromBoard, ix);
    vsGet(`agoricNames.brand`);
    vsGet(`agoricNames.instance`);

    let offerUpdate: UpdateRecord & { updated: 'offerStatus' };
    let ix = -1;
    for (;;) {
      const update = vsGet(`wallet.${addr2}`, ix) as UpdateRecord;
      if (update.updated === 'offerStatus') {
        offerUpdate = update;
        break;
      }
      ix -= 1;
    }

    t.regex(offerUpdate.status.error || '', /Withdrawal of {.*} failed/);
    t.log(offerUpdate.status.id, offerUpdate.status.error);
  }
});
