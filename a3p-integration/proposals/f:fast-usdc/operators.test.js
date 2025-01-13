/* eslint-env node */
import unknownTest from 'ava';

import '@endo/init/legacy.js'; // axios compat

import { LOCAL_CONFIG, makeVstorageKit } from '@agoric/client-utils';
import { evalBundles, waitForBlock } from '@agoric/synthetic-chain';

// XXX ~copied to not take a dependency on Zoe
/**
 * @typedef {object} InvitationDetails
 * @property {unknown} installation
 * @property {unknown} instance
 * @property {InvitationHandle} handle
 * @property {string} description
 * @property {Record<string, any>} [customDetails]
 */

/**
 * @import {VstorageKit} from '@agoric/client-utils';
 */

const test = /** @type {import('ava').TestFn<{ vstorageKit: VstorageKit}>} */ (
  unknownTest
);

const ADD_OPERATORS_DIR = 'add-operators';

/**
 * @typedef {import('@agoric/ertp').NatAmount} NatAmount
 * @typedef {{
 *   allocations: { Fee: NatAmount, USD_LEMONS: NatAmount },
 *  }} ReserveAllocations
 */

test.before(async t => {
  const vstorageKit = makeVstorageKit({ fetch }, LOCAL_CONFIG);

  t.context = {
    vstorageKit,
  };
});

test.serial('add operators', async t => {
  const { vstorageKit } = t.context;

  const walletPath =
    // account mem3 in test of crabble-start proposal (64)
    // This must match the oracleNew value in the add-operators builder argument
    'wallet.agoric1hmdue96vs0p6zj42aa26x6zrqlythpxnvgsgpr.current';

  const readInvitationsPurseBalance = async () => {
    const curr = await vstorageKit.readPublished(walletPath);
    return /** @type {InvitationDetails[]} */ (curr.purses[0].balance.value);
  };

  let numInvitationsBefore = 0;
  {
    const invBalance = await readInvitationsPurseBalance();
    numInvitationsBefore = invBalance.length;
    t.false(
      invBalance.some(inv => inv.description === 'oracle operator invitation'),
    );
  }

  await evalBundles(ADD_OPERATORS_DIR);
  // give time for the invitations to be deposited
  await waitForBlock(5);

  {
    const invBalance = await readInvitationsPurseBalance();
    console.log('after', invBalance);
    t.is(invBalance.length, numInvitationsBefore + 1);
    t.true(
      invBalance.some(inv => inv.description === 'oracle operator invitation'),
    );
  }
});
