import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeIssuerKit } from '@agoric/ertp';
import { Offers } from '../src/clientSupport.js';

const usdc = makeIssuerKit('USDC');

/** @satisfies {import('@agoric/vats/tools/board-utils.js').AgoricNamesRemotes} */
const agoricNames = {
  brand: {
    USDC: usdc.brand,
  },
  // Other required AgoricNames properties...
};

const instance = /** @type {Instance} */ ({});

test('makeDepositOffer', async t => {
  const offer = Offers.fastUsdc.Deposit(
    agoricNames,
    instance,
    { offerId: 'deposit1', amount: 100 }
  );
  
  t.deepEqual(offer, {
    id: 'deposit1',
    invitationSpec: {
      source: 'contract',
      instance,
      publicInvitationMaker: 'makeDepositInvitation',
    },
    proposal: {
      give: {
        Deposit: {
          brand: agoricNames.brand.USDC,
          value: 100000000n
        }
      }
    }
  });
});

test('makeWithdrawOffer', async t => {
  const offer = Offers.fastUsdc.Withdraw(
    agoricNames,
    instance,
    { offerId: 'withdraw1', amount: 50 }
  );
  
  t.deepEqual(offer.proposal.want.Withdrawal.value, 50000000n);
});

test('makeOperatorOffer', async t => {
  const offer = Offers.fastUsdc.BecomeOperator(
    instance,
    { offerId: 'operator1', operatorId: 'op123' }
  );
  
  t.deepEqual(offer.invitationSpec.callPipe, [
    ['makeOperatorInvitation', ['op123']]
  ]);
});
