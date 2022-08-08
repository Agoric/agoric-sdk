// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Far } from '@endo/far';
import { makeBoard } from '@agoric/vats/src/lib-board.js';
import {
  makeExportContext,
  makeImportContext,
} from '../src/marshal-contexts.js';

/**
 * @param {ReturnType<typeof makeBoard>} board
 */
const makeAMM = board => {
  const atom = Far('ATOM brand', {});
  const pub = board.getPublishingMarshaller();
  return harden({ getMetrics: () => pub.serialize(harden([atom])) });
};

/**
 * @param {ReturnType<typeof makeBoard>} board
 */
const makeWallet = board => {
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

test('preserve identity of brands across AMM and wallet', t => {
  const context = makeImportContext();

  const board = makeBoard(0, { prefix: 'board' });
  const amm = makeAMM(board);
  const ammMetricsCapData = amm.getMetrics();

  t.deepEqual(ammMetricsCapData, {
    body: '[{"@qclass":"slot","iface":"Alleged: ATOM brand","index":0}]',
    slots: ['board011'],
  });

  /** @type {Brand[]} */
  const [b1] = context.fromBoard.unserialize(ammMetricsCapData);
  /** @type {Brand[]} */
  const [b2] = context.fromBoard.unserialize(amm.getMetrics());
  t.is(b1, b2, 'unserialization twice from same source');

  const myWallet = makeWallet(board);
  myWallet.suggestIssuer('ATOM', 'board011');
  const walletCapData = myWallet.publish();
  t.deepEqual(walletCapData, {
    body: '[{"brand":{"@qclass":"slot","iface":"Alleged: ATOM brand","index":0},"brandPetname":"ATOM","currentAmount":{"brand":{"@qclass":"slot","index":0},"value":100},"meta":{"id":0},"purse":{"@qclass":"slot","iface":"Alleged: ATOM purse","index":1},"pursePetname":"ATOM purse"}]',
    slots: ['board011', 'purse:ATOM'],
  });

  const walletState = context.fromMyWallet.unserialize(walletCapData);
  t.is(walletState[0].brand, b1, 'unserialization across sources');

  t.throws(
    () => context.fromBoard.unserialize(walletCapData),
    { message: /bad shared slot/ },
    'AMM cannot refer to purses',
  );
});

test('handle unregistered identites in serialization', t => {
test('ensureBoardId allows re-registration; initBoardId does not', t => {
  const brand = Far('Moola brand', {});

  const context = makeExportContext();
  context.initBoardId('b1', brand);
  t.throws(() => context.initBoardId('b1', brand));
  context.ensureBoardId('b1', brand);
  t.throws(() => context.ensureBoardId('b2', brand));
});

  const brand = Far('Zoe invitation brand', {});
  const instance = Far('amm instance', {});
  const invitationAmount = harden({ brand, value: [{ instance }] });

  const context = makeExportContext();
  context.initBoardId('b1', brand);
  const actual = context.serialize(invitationAmount);

  t.deepEqual(actual, {
    body: '{"brand":{"@qclass":"slot","iface":"Alleged: Zoe invitation brand","index":0},"value":[{"instance":{"@qclass":"slot","iface":"Alleged: amm instance","index":1}}]}',
    slots: ['b1', 'unknown:1'],
  });
});
