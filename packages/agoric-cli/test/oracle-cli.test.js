/* eslint-env node */

import '@endo/init';

import { boardSlottingMarshaller } from '@agoric/client-utils';
import test from 'ava';
import { createCommand } from 'commander';
import { makeOracleCommand } from '../src/commands/oracle.js';

const marshaller = boardSlottingMarshaller();

/**
 * @param {Array<string>} out
 */
const makeProcess = out => {
  /**
   * @param {string} _file
   * @param {Array<string>} _args
   */
  const execFileSync = (_file, _args) => Buffer.from([]);

  /**
   * @param {Array<string>} [output]
   */
  const makeWriter =
    output =>
    /**
     * @param {string} x
     * @returns {boolean}
     */
    x => {
      output && output.push(x);
      return true;
    };

  const stdout = harden({
    write: makeWriter(out),
  });

  /**
   * @param {() => void} f
   * @param {number} _ms
   */
  const setTimeout = (f, _ms) => Promise.resolve().then(f);

  return {
    createCommand,
    env: {},
    execFileSync,
    now: () => 1739723035004, // the time of the writing of this test :)
    setTimeout,
    stderr: harden({
      write: makeWriter(),
    }),
    stdout,
  };
};

test('PushPrice for floating prices', async t => {
  const offerId = 'offer-id';
  const offerStaticPart = {
    invitationMakerName: 'PushPrice',
    source: 'continuing',
  };
  const pricesToTest = [8.1, 8.2, 8.3, Math.random() * 10];

  for (const price of pricesToTest) {
    t.log(`Testing price ${price}`);

    /**
     * @type {Array<string>}
     */
    const out = [];

    // @ts-expect-error
    const cmd = makeOracleCommand(makeProcess(out));

    await cmd.parseAsync([
      'node',
      'oracle',
      'pushPriceRound',
      `--oracleAdminAcceptOfferId=${offerId}`,
      `--price=${price}`,
    ]);

    const action = marshaller.fromCapData(JSON.parse(out.join('').trim()));

    t.deepEqual(action.offer.invitationSpec, {
      invitationArgs: [
        {
          roundId: undefined,
          unitPrice: BigInt(Math.round(price * 1000000)),
        },
      ],
      previousOffer: offerId,
      ...offerStaticPart,
    });
  }
});
