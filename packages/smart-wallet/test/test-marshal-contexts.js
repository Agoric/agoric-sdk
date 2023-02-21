// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Far } from '@endo/far';
import { makeBoard } from '@agoric/vats/src/lib-board.js';
import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import {
  makeExportContext,
  makeImportContext,
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
  context.initBoardId('board01', brandM);
  t.throws(() => context.initBoardId('board01', brandM));
  context.ensureBoardId('board01', brandM);
  t.throws(() => context.ensureBoardId('board012', brandM));
  context.ensureBoardId('board012', brandS);
  t.throws(() => context.initBoardId('board012', brandM));
});

test('makeExportContext.serialize handles unregistered identities', t => {
  const brand = Far('Zoe invitation brand', {});
  const instance = Far('amm instance', {});
  const invitationAmount = harden({ brand, value: [{ instance }] });

  const context = makeExportContext();
  context.initBoardId('board01', brand);
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
    slots: ['board01', 'unknown:1'],
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

test('fromBoard.serialize requires board ids', t => {
  const context = makeImportContext();

  const unpassable = harden({
    instance: makeHandle('Instance'),
  });
  t.throws(() => context.fromBoard.serialize(unpassable), {
    message: '"key" not found: "[Alleged: InstanceHandle]"',
  });

  context.ensureBoardId('board0123', unpassable.instance);
  t.deepEqual(context.fromBoard.serialize(unpassable), {
    body: '{"instance":{"@qclass":"slot","iface":"Alleged: InstanceHandle","index":0}}',
    slots: ['board0123'],
  });
});
