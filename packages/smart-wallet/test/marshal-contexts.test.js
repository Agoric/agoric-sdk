// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { Far } from '@endo/far';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import {
  makeExportContext,
  makeImportContext,
} from '../src/marshal-contexts.js';

/** @param {import('@agoric/vats').Board} board */
const makeAMM = board => {
  const atom = Far('ATOM brand', {});
  const pub = board.getPublishingMarshaller();
  return harden({ getMetrics: () => pub.toCapData(harden([atom])) });
};

/** @param {import('@agoric/vats').Board} board */
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
      context.initBoardId(boardId, brand);
      // @ts-expect-error mock purse
      context.initPurseId(name, purse); // TODO: strong id rather than name?
    },
    publish: () =>
      context.toCapData(
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

  const board = makeFakeBoard(0, { prefix: 'board' });
  const amm = makeAMM(board);
  const ammMetricsCapData = amm.getMetrics();

  t.deepEqual(ammMetricsCapData, {
    body: '#["$0.Alleged: ATOM brand"]',
    slots: ['board011'],
  });

  const [b1] = /** @type {Brand[]} */ (
    context.fromBoard.fromCapData(ammMetricsCapData)
  );

  const [b2] = /** @type {Brand[]} */ (
    context.fromBoard.fromCapData(amm.getMetrics())
  );
  t.is(b1, b2, 'unserialization twice from same source');

  const myWallet = makeOnChainWallet(board);
  myWallet.suggestIssuer('ATOM', 'board011');
  const walletCapData = myWallet.publish();
  t.deepEqual(walletCapData, {
    body: `#${JSON.stringify([
      {
        brand: '$0.Alleged: ATOM brand',
        brandPetname: 'ATOM',
        currentAmount: { brand: '$0', value: 100 },
        meta: { id: 0 },
        purse: '$1.Alleged: ATOM purse',
        pursePetname: 'ATOM purse',
      },
    ])}`,
    slots: ['board011', 'purse:ATOM'],
  });

  /** @type {any} */
  const walletState = context.fromMyWallet.fromCapData(walletCapData);
  t.is(walletState[0].brand, b1, 'unserialization across sources');

  t.throws(
    () => context.fromBoard.fromCapData(walletCapData),
    { message: /bad board slot/ },
    'AMM cannot refer to purses',
  );

  t.throws(
    () => context.fromMyWallet.toCapData(Far('widget', {})),
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
  const actual = context.toCapData(invitationAmount);

  t.deepEqual(actual, {
    body: `#${JSON.stringify({
      brand: '$0.Alleged: Zoe invitation brand',
      value: [
        {
          instance: '$1.Alleged: amm instance',
        },
      ],
    })}`,
    slots: ['board01', 'unknown:1'],
  });

  t.deepEqual(context.fromCapData(actual), invitationAmount);

  const myPayment = /** @type {Payment} */ (
    Far('payment', { getAllegedBrand: () => assert.fail('no impl') })
  );
  context.savePaymentActions(myPayment);
  const cap2 = context.toCapData(myPayment);
  t.deepEqual(cap2, {
    body: '#"$0.Alleged: payment"',
    slots: ['payment:1'],
  });
  t.deepEqual(context.fromCapData(cap2), myPayment);
});

test('fromBoard.serialize requires board ids', t => {
  const context = makeImportContext();

  const unpassable = harden({
    instance: makeHandle('Instance'),
  });
  t.throws(() => context.fromBoard.toCapData(unpassable), {
    message: '"key" not found: "[Alleged: InstanceHandle]"',
  });

  context.ensureBoardId('board0123', unpassable.instance);
  t.deepEqual(context.fromBoard.toCapData(unpassable), {
    body: '#{"instance":"$0.Alleged: InstanceHandle"}',
    slots: ['board0123'],
  });
});
