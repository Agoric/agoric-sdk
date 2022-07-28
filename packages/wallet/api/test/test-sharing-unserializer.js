// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Far } from '@endo/far';
import { makeBoard } from '@agoric/vats/src/lib-board.js';
import { makeDehydrator } from '../src/lib-dehydrate.js';
import { makeSharingUnserializer } from '../src/sharingUnserializer.js';

const { freeze } = Object;

/**
 * @param {ReturnType<typeof makeBoard>} board
 */
const makeAMM = board => {
  const atom = Far('ATOM brand', {});
  const pub = board.getPublishingMarshaller();
  return freeze({ getMetrics: () => pub.serialize(harden([atom])) });
};

/**
 * @param {ReturnType<typeof makeBoard>} board
 */
const makeWallet = board => {
  const { hydrate: _h, dehydrate, makeMapping } = makeDehydrator();
  const brandMapping = makeMapping('brand');
  const purseMapping = makeMapping('purse');
  let brand;
  return harden({
    suggestIssuer: (name, boardId) => {
      brand = board.getValue(boardId);
      const purse = Far(`${name} purse`, {
        getCurrentAmount: () => harden({ brand, value: 100 }),
      });
      brandMapping.suggestPetname(name, brand);
      brandMapping.addBoardId(boardId, brand);
      purseMapping.suggestPetname(name, purse);
    },
    publish: () =>
      dehydrate(
        harden(
          [...purseMapping.petnameToVal.entries()].map(([name, purse], id) => ({
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
  const { low: fromAMM, high: fromWallet } = makeSharingUnserializer();

  const board = makeBoard(0, { prefix: 'b' });
  const amm = makeAMM(board);
  const ammMetricsCapData = amm.getMetrics();

  t.deepEqual(ammMetricsCapData, {
    body: '[{"@qclass":"slot","iface":"Alleged: ATOM brand","index":0}]',
    slots: ['b101'],
  });

  /** @type {Brand[]} */
  const [b1] = fromAMM.unserialize(ammMetricsCapData);
  /** @type {Brand[]} */
  const [b2] = fromAMM.unserialize(amm.getMetrics());
  t.is(b1, b2, 'unserialization twice from same source');

  const myWallet = makeWallet(board);
  myWallet.suggestIssuer('ATOM', 'b101');
  const walletCapData = myWallet.publish();
  t.deepEqual(walletCapData, {
    body: '[{"brand":{"@qclass":"slot","iface":"Alleged: ATOM brand","index":0},"brandPetname":"ATOM","currentAmount":{"brand":{"@qclass":"slot","index":0},"value":100},"meta":{"id":0},"purse":{"@qclass":"slot","iface":"Alleged: ATOM purse","index":1},"pursePetname":"ATOM purse"}]',
    slots: [
      {
        boardId: 'b101',
        kind: 'brand',
        petname: 'ATOM',
      },
      {
        boardId: undefined,
        kind: 'purse',
        petname: 'ATOM',
      },
    ],
  });

  const walletState = fromWallet.unserialize(walletCapData);
  t.is(walletState[0].brand, b1, 'unserialization across sources');

  const failSafeState = fromAMM.unserialize(walletCapData);
  t.not(
    failSafeState[0].purse,
    walletState[0].purse,
    'AMM cannot refer to purses',
  );
});
