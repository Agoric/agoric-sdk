// @ts-check
/* global setTimeout */

import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import { E, Far, passStyleOf } from '@endo/far';
import { makeBoard } from '@agoric/vats/src/lib-board.js';
import { makePromiseKit } from '@endo/promise-kit';
import { makeScalarMap } from '@agoric/store';
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
  const zoe = Far('Zoe Service', {
    getPublicFacet: async instance => pub.get(instance),
  });
  const agoricNames = Far('NameHub', {
    lookup: (...path) => assert.fail('TODO'),
  });
  const walletBoot = Far('Wallet Facet???', {
    getZoeService: () => zoe,
    getAgoricNames: () => agoricNames,
  });
  context.saveUnknown(walletBoot);

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
  const flush = async () => {
    if (!msgs.length) {
      return;
    }

    const theseMsgs = msgs.map(({ msg }) => msg);
    msgs.splice(0);

    // eslint-disable-next-line no-use-before-define
    const capData = ctx.fromMyWallet.serialize(harden(theseMsgs));

    console.log('@@@bg send serialized', { capData });
    await backgroundSigner.submitAction(JSON.stringify(capData));
  };

  const seqToKit = new Map();
  let lastSeq = 0;
  let flushLaterTimeout;
  const mkp = iface =>
    makeLoggingPresence(iface, (msg, resultP) => {
      msgs.push({ msg, resultP });
      const kit = makePromiseKit();
      // console.log('walletUI registered logging presence', seq);
      lastSeq += 1;
      const seq = lastSeq;
      seqToKit.set(seq, kit);

      // Automatically flush (Nagle) after a short delay.
      if (!flushLaterTimeout) {
        flushLaterTimeout = setTimeout(() => {
          flushLaterTimeout = undefined;
          flush();
        }, 100);
      }
      return kit.promise;
    });
  const ctx = makeImportContext(mkp);
  const walletP = ctx.getBootstrap();

  const zoe = E(walletP).getZoeService();
  const agoricNames = E(walletP).getAgoricNames();

  (async () => {
    for await (const json of follower.getLatestIterable()) {
      const { answers } = ctx.fromMyWallet.unserialize(JSON.parse(json));
      console.log('RPC returned', answers);
      for (const [ix, result] of answers) {
        if (seqToKit.has(ix)) {
          const kit = seqToKit.get(ix);
          seqToKit.delete(ix);
          console.log('deliver', result);
          if (result.ok) {
            kit.resolve(result.value);
          } else {
            kit.reject(result.reason);
          }
          console.log('@@@pending', seqToKit);
        }
      }
      console.log('@@waiting for', msgs);
    }
  })();

  return harden({
    getScopedBridge: async () =>
      harden({
        getZoeService: async () => zoe,
        getAgoricNames: async () => agoricNames,
      }),
  });
};

test('get IST brand via agoricNames', async t => {
  const board = makeBoard(0, { prefix: 'board' });

  const makeOnChain = () => {
    const brand = Far('IST brand', {});

    const ctx = makeExportContext();
    const nameHubState = [[['brand', 'IST'], brand]];
    const agoricNames = Far('NameHub', {
      lookup: async (...path) => {
        for (const [k, v] of nameHubState) {
          if (JSON.stringify(path) === JSON.stringify(k)) return v;
        }
        throw Error('not found');
      },
    });
    const publicFacets = makeScalarMap();
    const zoe = Far('Zoe Service', {
      getPublicFacet: instance => publicFacets.get(instance),
    });
    const boot = Far('OnChain Wallet', {
      getZoeService: () => zoe,
      getAgoricNames: () => agoricNames,
    });
    ctx.saveUnknown(boot);
    ctx.saveUnknown(agoricNames);
    ctx.saveUnknown(zoe);

    const answers = [];

    const queryWallet = _addr => {
      const state = harden({ purses: [], answers: [...answers] });
      const capData = ctx.serialize(state);
      return JSON.stringify(capData);
    };

    const registered = makePromiseKit();
    const run = async () => {
      const id = await E(board).getId(brand);
      ctx.initBoardId(id, brand);
      registered.resolve('go');
    };

    let seq = 1; // ???
    const submitActionTx = async action => {
      const capData = JSON.parse(action);
      await registered.promise;
      const msgs = ctx.unserialize(capData);
      console.log('TODO: deserialize, execute action', {
        action,
        // capData,
        msgs,
      });
      assert(Array.isArray(msgs));
      const start = seq;
      seq += msgs.length;
      return Promise.all(
        msgs.map((msg, ix) => {
          console.log('@@@tag', ix, msg[0]);
          switch (msg[0]) {
            case 'applyMethod': {
              const [_tag, target, method, args] = msg;
              E(target)
                [method](...args)
                .then(
                  result =>
                    answers.push([start + ix, { ok: true, value: result }]),
                  reason => answers.push([start + ix, { ok: false, reason }]),
                );
              break;
            }
            case 'applyFunction': {
              const [_tag, target, args] = msg;
              E(target)(...args).then(
                result =>
                  answers.push([start + ix, { ok: true, value: result }]),
                reason => answers.push([start + ix, { ok: false, reason }]),
              );
              break;
            }
            default:
              assert.fail(`bad message: ${msg}`);
          }
          return undefined;
        }),
      );
    };

    return harden({
      run,
      submitActionTx,
      queryWallet,
    });
  };
  const onChain = makeOnChain();

  let queryWalletPK = makePromiseKit();
  const offChain = async () => {
    const bgSigner = harden({
      submitAction: async action => {
        await onChain.submitActionTx(action);
        queryWalletPK.resolve('go');
      },
    });
    async function* getLatestIterable() {
      while (true) {
        yield onChain.queryWallet();
        // eslint-disable-next-line no-await-in-loop
        await queryWalletPK.promise;
        queryWalletPK = makePromiseKit();
      }
    }
    const follower = harden({
      getLatestIterable,
    });
    const wallet = makeWalletUI(board, bgSigner, follower);
    const bridge = E(wallet).getScopedBridge();
    const agoricNames = E(bridge).getAgoricNames();
    const [brand] = await Promise.all([E(agoricNames).lookup('brand', 'IST')]);
    t.is(passStyleOf(brand), 'remotable');
  };

  await Promise.all([onChain.run(), offChain()]);
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
