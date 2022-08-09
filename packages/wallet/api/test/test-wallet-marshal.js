// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import { E, Far } from '@endo/far';
import { makeBoard } from '@agoric/vats/src/lib-board.js';
import { isPromise, makePromiseKit } from '@endo/promise-kit';
import {
  makeExportContext,
  makeImportContext,
  makeLoggingPresence,
} from '../src/marshal-contexts.js';

/** @param {ReturnType<typeof makeBoard>} board */
const makeAMM = board => {
  const atom = Far('ATOM brand', {});
  const pub = board.getPublishingMarshaller();
  return harden({ getMetrics: () => pub.serialize(harden([atom])) });
};

/** @param {ReturnType<typeof makeBoard>} board */
const makeOnChainWallet = board => {
  const context = makeExportContext();
  let brand;

  const pub = new Map();
  const zoe = harden({
    getPublicFacet: async instance => pub.get(instance),
  });
  const agoricNames = harden({
    lookup: (...path) => assert.fail('TODO'),
  });

  return harden({
    suggestIssuer: (name, boardId) => {
      brand = board.getValue(boardId);
      const purse = Far(`${name} purse`, {
        getCurrentAmount: () => harden({ brand, value: 100 }),
      });
      // only for private brands
      //   context.initBrandId(boardId, brand);
      context.initBoardId(boardId, brand);
      // @ts-expect-error mock purse
      context.initPurseId(name, purse); // TODO: strong id rather than name?
    },
    publish: () =>
      context.serialize(
        harden(
          [...context.purseEntries()].map(([name, purse], id) => ({
            meta: { id },
            // displayInfo
            // brandBoardId,
            purse,
            brand,
            currentAmount: purse.getCurrentAmount(),
            // actions
            brandPetname: name,
            pursePetname: `${name} purse`,
          })),
        ),
      ),
  });
};

test('makeImportContext preserves identity across AMM and wallet', t => {
  const context = makeImportContext();

  const board = makeBoard(0, { prefix: 'board' });
  const amm = makeAMM(board);
  const ammMetricsCapData = amm.getMetrics();

  t.deepEqual(ammMetricsCapData, {
    body: JSON.stringify([
      { '@qclass': 'slot', iface: 'Alleged: ATOM brand', index: 0 },
    ]),
    slots: ['board011'],
  });

  /** @type {Brand[]} */
  const [b1] = context.fromBoard.unserialize(ammMetricsCapData);
  /** @type {Brand[]} */
  const [b2] = context.fromBoard.unserialize(amm.getMetrics());
  t.is(b1, b2, 'unserialization twice from same source');

  const myWallet = makeOnChainWallet(board);
  myWallet.suggestIssuer('ATOM', 'board011');
  const walletCapData = myWallet.publish();
  t.deepEqual(walletCapData, {
    body: JSON.stringify([
      {
        brand: { '@qclass': 'slot', iface: 'Alleged: ATOM brand', index: 0 },
        brandPetname: 'ATOM',
        currentAmount: { brand: { '@qclass': 'slot', index: 0 }, value: 100 },
        meta: { id: 0 },
        purse: { '@qclass': 'slot', iface: 'Alleged: ATOM purse', index: 1 },
        pursePetname: 'ATOM purse',
      },
    ]),
    slots: ['board011', 'purse:ATOM'],
  });

  const walletState = context.fromMyWallet.unserialize(walletCapData);
  t.is(walletState[0].brand, b1, 'unserialization across sources');

  t.throws(
    () => context.fromBoard.unserialize(walletCapData),
    { message: /bad board slot/ },
    'AMM cannot refer to purses',
  );

  t.throws(
    () => context.fromMyWallet.serialize(Far('widget', {})),
    {
      message: /unregistered/,
    },
    'import context never exports unregistered objects',
  );
});

test('ensureBoardId allows re-registration; initBoardId does not', t => {
  const brandM = Far('Moola brand', {});
  const brandS = Far('Semolean brand', {});

  const context = makeExportContext();
  context.initBoardId('board1', brandM);
  t.throws(() => context.initBoardId('board1', brandM));
  context.ensureBoardId('board1', brandM);
  t.throws(() => context.ensureBoardId('board12', brandM));
  context.ensureBoardId('board12', brandS);
  t.throws(() => context.initBoardId('board12', brandM));
});

test('makeExportContext.serialize handles unregistered identites', t => {
  const brand = Far('Zoe invitation brand', {});
  const instance = Far('amm instance', {});
  const invitationAmount = harden({ brand, value: [{ instance }] });

  const context = makeExportContext();
  context.initBoardId('board1', brand);
  const actual = context.serialize(invitationAmount);

  t.deepEqual(actual, {
    body: JSON.stringify({
      brand: {
        '@qclass': 'slot',
        iface: 'Alleged: Zoe invitation brand',
        index: 0,
      },
      value: [
        {
          instance: {
            '@qclass': 'slot',
            iface: 'Alleged: amm instance',
            index: 1,
          },
        },
      ],
    }),
    slots: ['board1', 'unknown:1'],
  });

  t.deepEqual(context.unserialize(actual), invitationAmount);

  const myPayment = /** @type {Payment} */ (
    Far('payment', { getAllegedBrand: () => assert.fail('no impl') })
  );
  context.savePaymentActions(myPayment);
  const cap2 = context.serialize(myPayment);
  t.deepEqual(cap2, {
    body: JSON.stringify({
      '@qclass': 'slot',
      iface: 'Alleged: payment',
      index: 0,
    }),
    slots: ['payment:1'],
  });
  t.deepEqual(context.unserialize(cap2), myPayment);
});

const makeWalletUI = (board, backgroundSigner, follower) => {
  const msgs = [];
  const seqToKit = new Map();
  const mkp = iface =>
    makeLoggingPresence(iface, (msg, resultP) => {
      msgs.push({ msg, resultP });
      const kit = makePromiseKit();
      const seq = ctx.registerUnknown(resultP);
      console.log('registered', seq);
      seqToKit.set(seq, kit);
      // TODO: arrange for kit.resolve() to fire when wallet state notification
      // includes an answer to this question (identified by seq???)
      return kit.promise;
    });
  const flush = async () => {
    await null; // wait for E() stuff
    console.warn('@@TODO: bg send', { msgs });
    // eslint-disable-next-line no-use-before-define
    const capData = ctx.fromMyWallet.serialize(harden([...msgs]));
    msgs.splice(0);
    console.warn('@@TODO: bg send serialized', { capData });
    backgroundSigner.submitAction(JSON.stringify(capData));
  };
  const ctx = makeImportContext(flush, mkp);
  const walletP = ctx.getBootstrap();

  const zoe = E(walletP).getZoeService();
  const agoricNames = E(walletP).getAgoricNames();

  (async () => {
    for await (const { answers } of follower.getLatestIterable()) {
      console.log('???', { answers });
      for (const [ix, resultEnc] of answers) {
        if (seqToKit.has(ix)) {
          const kit = seqToKit.get(ix);
          const result = ctx.fromMyWallet.unserialize(JSON.parse(resultEnc));
          if (result.ok) {
            kit.resolve(result.value);
          } else {
            kit.reject(result.reason);
          }
        }
      }
    }
  })();

  return harden({
    all: ctx.all,
    getScopedBridge: async () =>
      harden({
        getZoeService: async () => zoe,
        getAgoricNames: async () => agoricNames,
      }),
  });
};

test('get IST brand via agoricNames', async t => {
  const board = makeBoard(0, { prefix: 'board' });
  const onChain = async () => {
    const brand = Far('IST brand', {});
    await E(board).getId(brand);
  };

  const offChain = async () => {
    const baton = makePromiseKit();
    const bgSigner = harden({
      submitAction: action => {
        console.log('@@submitAction', { action }); // t.log?
        baton.resolve('go');
      },
    });
    async function* getLatestIterable() {
      await baton.promise;
      yield {
        purses: [],
        answers: [
          [
            2,
            JSON.stringify({
              body: JSON.stringify({ ok: true, value: 'blue' }),
              slots: [],
            }),
          ],
          [
            3,
            JSON.stringify({
              body: JSON.stringify({ ok: true, value: 'blue' }),
              slots: [],
            }),
          ],
        ],
      };
    }
    const follower = harden({
      getLatestIterable,
    });
    const wallet = makeWalletUI(board, bgSigner, follower);
    const bridge = E(wallet).getScopedBridge();
    const agoricNames = E(bridge).getAgoricNames();
    const [brand] = await wallet.all([E(agoricNames).lookup('brand', 'IST')]);
    t.deepEqual(brand, '@@@');
  };

  await Promise.all([onChain(), offChain()]);
});

test.skip('get invitation amount via agoricNames, AMM public facet', async t => {
  const wallet = makeWalletUI();
  const bridge = E(wallet).getScopedBridge();
  const zoe = E(bridge).getZoeService();
  const agoricNames = E(bridge).getAgoricNames();
  const ammInstanceP = E(agoricNames).lookup('instance', 'amm');
  // does getPublicFacet allow a Promise<Instance>?
  // how do we deal with identity across this interface?
  const ammPub = E(zoe).getPublicFacet(ammInstanceP);
  const invitationP = E(ammPub).makeSwapInvitation();
  const invitationAmount = await wallet.all([
    E(E(zoe).getInvitationIssuer()).getAmountOf(invitationP),
  ]);
  t.deepEqual(invitationAmount, {});
});
