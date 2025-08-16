/** @file CCTP Resolver tests - transaction settlement functionality */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { E } from '@endo/far';
import type {
  CCTPSettlementResult,
  ResolverInvitationMakers,
} from '../src/resolver/types.ts';
import { deploy } from './contract-setup.ts';

test('CCTP settlement invitation - no pending transaction found', async t => {
  const { started, zoe, common } = await deploy(t);
  const { creatorFacet } = started;
  const { usdc } = common.brands;

  const amount = usdc.units(1000);

  const resolverInvitation = await E(creatorFacet).makeResolverInvitation();
  const resolverSeat = await E(zoe).offer(resolverInvitation);
  const resolverMakers = (await E(
    resolverSeat,
  ).getOfferResult()) as ResolverInvitationMakers;
  const confirmInvitation =
    await E(resolverMakers).makeSettleCCTPTransactionInvitation();

  const confirmationSeat = await E(zoe).offer(
    confirmInvitation,
    {},
    undefined,
    {
      txDetails: {
        amount: amount.value,
        remoteAddress: '0x999999999999999999999999999999999999999',
        status: 'confirmed' as const,
      },
      remoteAxelarChain: 'eip155:42161' as const,
    },
  );

  const confirmResult = (await E(
    confirmationSeat,
  ).getOfferResult()) as CCTPSettlementResult;
  t.truthy(confirmResult, 'Confirmation result should not be undefined');
  t.is(confirmResult.success, false);
  t.truthy(confirmResult.message, 'Confirmation result should have a message');
  t.regex(confirmResult.message as string, /No pending CCTP transaction found/);
  t.is(confirmResult.txDetails.amount, amount.value);
  t.is(confirmResult.remoteAxelarChain, 'eip155:42161');
});

test('CCTP confirmation invitation - invalid status throws', async t => {
  const { started, zoe, common } = await deploy(t);
  const { creatorFacet } = started;
  const { usdc } = common.brands;

  const amount = usdc.units(1000);

  const resolverInvitation = await E(creatorFacet).makeResolverInvitation();
  const resolverSeat = await E(zoe).offer(resolverInvitation);
  const resolverMakers = (await E(
    resolverSeat,
  ).getOfferResult()) as ResolverInvitationMakers;
  const confirmInvitation =
    await E(resolverMakers).makeSettleCCTPTransactionInvitation();

  const confirmationSeat = await E(zoe).offer(
    confirmInvitation,
    {},
    undefined,
    {
      txDetails: {
        amount: amount.value,
        remoteAddress: '0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092',
        status: 'invalid' as any,
      },
      remoteAxelarChain: 'eip155:42161' as const,
    },
  );

  await t.throwsAsync(E(confirmationSeat).getOfferResult(), {
    message: /Must match one of/,
  });
});

test('CCTP confirmation invitation exits seat properly', async t => {
  const { started, zoe, common } = await deploy(t);
  const { creatorFacet } = started;
  const { usdc } = common.brands;

  const amount = usdc.units(1000);

  const resolverInvitation = await E(creatorFacet).makeResolverInvitation();
  const resolverSeat = await E(zoe).offer(resolverInvitation);
  const resolverMakers = (await E(
    resolverSeat,
  ).getOfferResult()) as ResolverInvitationMakers;
  const confirmInvitation =
    await E(resolverMakers).makeSettleCCTPTransactionInvitation();

  const confirmationSeat = await E(zoe).offer(
    confirmInvitation,
    {},
    undefined,
    {
      txDetails: {
        amount: amount.value,
        remoteAddress: '0x999999999999999999999999999999999999999',
        status: 'pending' as const,
      },
      remoteAxelarChain: 'eip155:42161' as const,
    },
  );

  const confirmResult = (await E(
    confirmationSeat,
  ).getOfferResult()) as CCTPSettlementResult;
  t.truthy(confirmResult);

  const hasExited = await E(confirmationSeat).hasExited();
  t.is(hasExited, true, 'Confirmation seat should exit after processing');
});
