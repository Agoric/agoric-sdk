/** @file CCTP Resolver tests - transaction settlement functionality */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { E } from '@endo/far';
import type {
  TransactionKey,
  TransactionSettlementOfferArgs,
} from '../src/resolver/types.ts';
import { deploy } from './contract-setup.ts';
import { mustMatch } from '@endo/patterns';
import { ResolverOfferArgsShapes } from '../src/resolver/types.ts';

test('CCTP settlement invitation - no pending transaction found', async t => {
  const { started, zoe, common } = await deploy(t);
  const { creatorFacet } = started;
  const { usdc } = common.brands;

  const amount = usdc.units(1000);

  const resolverInvitation = await E(creatorFacet).makeResolverInvitation();
  const resolverSeat = await E(zoe).offer(resolverInvitation);
  const resolverMakers = (await E(resolverSeat).getOfferResult())
    .invitationMakers;
  const confirmInvitation = await E(resolverMakers).SettleTransaction();

  const transactionKey: TransactionKey = `cctp:eip155:42161:0x999999999999999999999999999999999999999:${amount.value}`;
  const offerArgs: TransactionSettlementOfferArgs = {
    transactionKey,
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
  const { common } = await deploy(t);
  const { usdc } = common.brands;

  const amount = usdc.units(1000);
  const invalidOfferArgs: TransactionSettlementOfferArgs = harden({
    transactionKey: `cctp:eip155:42161:0x126cf3AC9ea12794Ff50f56727C7C66E26D9C092:${amount.value}`,
    status: 'invalid' as any,
    txId: 'tx0',
  });
  t.throws(() =>
    mustMatch(invalidOfferArgs, ResolverOfferArgsShapes.SettleTransaction),
  );
});

test('CCTP confirmation invitation exits seat properly', async t => {
  const { started, zoe, common } = await deploy(t);
  const { creatorFacet } = started;
  const { usdc } = common.brands;

  const amount = usdc.units(1000);

  const resolverInvitation = await E(creatorFacet).makeResolverInvitation();
  const resolverSeat = await E(zoe).offer(resolverInvitation);
  const resolverMakers = (await E(resolverSeat).getOfferResult())
    .invitationMakers;
  const confirmInvitation = await E(resolverMakers).SettleTransaction();

  const transactionKey: TransactionKey = `cctp:eip155:42161:0x999999999999999999999999999999999999999:${amount.value}`;
  const offerArgs: TransactionSettlementOfferArgs = {
    transactionKey,
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
