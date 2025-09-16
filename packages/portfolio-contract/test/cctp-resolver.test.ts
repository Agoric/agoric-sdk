/** @file CCTP Resolver tests - transaction settlement functionality */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { E } from '@endo/far';
import { mustMatch } from '@endo/patterns';
import type { TransactionSettlementOfferArgs } from '../src/resolver/types.ts';
import { ResolverOfferArgsShapes } from '../src/resolver/types.ts';
import { deploy } from './contract-setup.ts';

test('CCTP settlement invitation - no pending transaction found', async t => {
  const { started, zoe } = await deploy(t);
  const { creatorFacet } = started;

  const resolverInvitation = await E(creatorFacet).makeResolverInvitation();
  const resolverSeat = await E(zoe).offer(resolverInvitation);
  const resolverMakers = (await E(resolverSeat).getOfferResult())
    .invitationMakers;
  const confirmInvitation = await E(resolverMakers).SettleTransaction();

  const offerArgs: TransactionSettlementOfferArgs = {
    status: 'success' as const,
    txId: 'tx0',
  };
  const confirmationSeat = await E(zoe).offer(
    confirmInvitation,
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

  const resolverInvitation = await E(creatorFacet).makeResolverInvitation();
  const resolverSeat = await E(zoe).offer(resolverInvitation);
  const resolverMakers = (await E(resolverSeat).getOfferResult())
    .invitationMakers;
  const confirmInvitation = await E(resolverMakers).SettleTransaction();

  const offerArgs: TransactionSettlementOfferArgs = {
    status: 'failed' as const,
    txId: 'tx0',
  };
  const confirmationSeat = await E(zoe).offer(
    confirmInvitation,
    {},
    undefined,
    offerArgs,
  );

  await t.throwsAsync(E(confirmationSeat).getOfferResult());

  const hasExited = await E(confirmationSeat).hasExited();
  t.is(hasExited, true, 'Confirmation seat should exit after processing');
});
