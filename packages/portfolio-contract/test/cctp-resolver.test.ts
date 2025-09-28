/** @file CCTP Resolver tests - transaction settlement functionality */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { E } from '@endo/far';
import { mustMatch } from '@endo/patterns';
import type { TransactionSettlementOfferArgs } from '../src/resolver/types.ts';
import { ResolverOfferArgsShapes } from '../src/resolver/types.ts';
import { deploy } from './contract-setup.ts';
import { getResolverService } from './resolver-helpers.ts';

test('CCTP settlement invitation - no pending transaction found', async t => {
  const { started, zoe } = await deploy(t);
  const { creatorFacet } = started;

  const resolverResult = await getResolverService(zoe, creatorFacet);
  const settleInvitation = await E(resolverResult.invitationMakers).SettleTransaction();

  const offerArgs: TransactionSettlementOfferArgs = {
    status: 'success' as const,
    txId: 'tx0',
  };
  const confirmationSeat = await E(zoe).offer(
    settleInvitation,
    {},
    undefined,
    offerArgs,
  );

  await t.throwsAsync(E(confirmationSeat).getOfferResult());
});

test('CCTP confirmation invitation - invalid status throws', async t => {
  await deploy(t);

  const invalidOfferArgs: TransactionSettlementOfferArgs = harden({
    status: 'invalid' as any,
    txId: 'tx0',
  });
  t.throws(() =>
    mustMatch(invalidOfferArgs, ResolverOfferArgsShapes.SettleTransaction),
  );
});

test('CCTP confirmation invitation exits seat properly', async t => {
  const { started, zoe } = await deploy(t);
  const { creatorFacet } = started;

  const resolverResult = await getResolverService(zoe, creatorFacet);
  const settleInvitation = await E(resolverResult.invitationMakers).SettleTransaction();

  const offerArgs: TransactionSettlementOfferArgs = {
    status: 'failed' as const,
    txId: 'tx0',
  };
  const confirmationSeat = await E(zoe).offer(
    settleInvitation,
    {},
    undefined,
    offerArgs,
  );

  await t.throwsAsync(E(confirmationSeat).getOfferResult());

  const hasExited = await E(confirmationSeat).hasExited();
  t.is(hasExited, true, 'Confirmation seat should exit after processing');
});

test('Both old and new resolver patterns work', async t => {
  const { started, zoe } = await deploy(t);
  const { creatorFacet } = started;

  // Test old pattern (deprecated but backward compatible)
  const resolverInvitation = await E(creatorFacet).makeResolverInvitation();
  const resolverSeat = await E(zoe).offer(resolverInvitation);
  const resolverResult = await E(resolverSeat).getOfferResult();
  
  t.truthy(resolverResult.invitationMakers, 'InvitationMakers should be available for backward compatibility');
  
  const offerArgs: TransactionSettlementOfferArgs = {
    status: 'success' as const,
    txId: 'tx0',
  };

  // Test old pattern (continuing invitations)
  const settleInvitation = await E(resolverResult.invitationMakers).SettleTransaction();
  t.truthy(settleInvitation, 'SettleTransaction invitation should be created');
  const settlementSeat = await E(zoe).offer(settleInvitation, {}, undefined, offerArgs);
  await t.throwsAsync(E(settlementSeat).getOfferResult());
  
  // Test new pattern (direct service for invokeEntry)
  const resolverServiceInvitation = await E(creatorFacet).makeResolverServiceInvitation();
  const resolverServiceSeat = await E(zoe).offer(resolverServiceInvitation);
  const resolverService = await E(resolverServiceSeat).getOfferResult();
  
  // Test new pattern (direct method call, like what invokeEntry would do)
  await t.throwsAsync(E(resolverService).settleTransaction(offerArgs));
  
  t.pass('Both patterns work: deprecated invitationMakers for backward compatibility, direct service for invokeEntry');
});
