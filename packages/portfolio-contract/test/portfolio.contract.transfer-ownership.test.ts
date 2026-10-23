/**
 * @file YMax portfolio contract — transferring ownership of a portfolio from
 * its Agoric owner to an EVM account.
 */
// prepare-test-env has to go 1st; use a blank line to separate it
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { E } from '@endo/far';
import { ackNFA, stripStoredPortfolioKit } from './contract-test-support.ts';
import { makeEvmTraderKit, setupTrader } from './contract-setup.ts';
import { evmTrader1PrivateKey } from './mocks.ts';

const setupTransfer = async (t: Parameters<typeof setupTrader>[0]) => {
  const deployed = await setupTrader(t);
  const { trader1, common, timerService } = deployed;
  const { poc26 } = common.brands;
  await Promise.all([
    trader1.openPortfolio(t, { Access: poc26.make(1n) }),
    ackNFA(common.utils, -1),
  ]);
  // Start away from 0, so that past deadlines are representable.
  await timerService.advanceTo(10_000n);
  const { evmTrader, evmAccount } = await makeEvmTraderKit(deployed);
  const getNow = async () =>
    (await E(timerService).getCurrentTimestamp()).absValue;

  /**
   * Start a transfer, and wait for the contract to record it.
   *
   * @returns the offer outcome, wrapped to not wait for it
   */
  const startTransfer = async (evmAddress: `0x${string}`, deadline: bigint) => {
    const doneP = trader1.transferOwnershipToEVM(t, {
      evmAddress,
      deadlineTimestampSeconds: deadline,
    });
    // Observe rejections as they happen; the caller checks them.
    doneP.catch(() => {});
    for (let i = 0; i < 100; i += 1) {
      await eventLoopIteration();
      const { pendingOwnerTransfer } = await trader1.getPortfolioStatus();
      if (
        pendingOwnerTransfer?.evmAddress === evmAddress &&
        pendingOwnerTransfer.deadlineTimestampSeconds === deadline
      ) {
        return { doneP };
      }
    }
    throw Error('transfer not recorded');
  };

  return {
    ...deployed,
    evmTrader,
    evmAccount,
    getNow,
    startTransfer,
  };
};

test('Agoric owner transfers a portfolio to an EVM account', async t => {
  const { trader1, evmTrader, evmAccount, getNow, startTransfer } =
    await setupTransfer(t);
  const portfolioId = trader1.getPortfolioId();

  const deadline = (await getNow()) + 600n;
  const { doneP } = await startTransfer(evmAccount.address, deadline);

  const accepted = await evmTrader
    .forChain('Arbitrum')
    .acceptOwnership(portfolioId);
  t.like(accepted, { status: 'ok', result: `portfolio${portfolioId}` });

  const sourceAccountId =
    `eip155:42161:${evmAccount.address.toLowerCase()}` as const;
  const { result } = await doneP;
  t.is(result, sourceAccountId);

  const status = await trader1.getPortfolioStatus();
  t.is(status.sourceAccountId, sourceAccountId);
  t.is(status.pendingOwnerTransfer, undefined);
  // acceptOwnership found it among the EVM wallet's portfolios
  t.is(evmTrader.getPortfolioId(), portfolioId);

  // The new owner can act on the portfolio...
  t.regex(
    await evmTrader
      .forChain('Arbitrum')
      .setTargetAllocation([{ instrument: 'Aave_Arbitrum', portion: 10000n }]),
    /^flow\d+$/,
  );
  // ...and the previous owner can no longer.
  await t.throwsAsync(trader1.simpleRebalance(t, { give: {}, want: {} }, {}), {
    message: /is owned by EVM account/,
  });
  await t.throwsAsync(
    trader1.transferOwnershipToEVM(t, {
      evmAddress: evmAccount.address,
      deadlineTimestampSeconds: (await getNow()) + 600n,
    }),
    { message: /is owned by EVM account/ },
  );
});

test('portfolios stored before the upgrade can be transferred', async t => {
  const {
    trader1,
    evmTrader,
    evmAccount,
    getNow,
    startTransfer,
    contractBaggage,
  } = await setupTransfer(t);
  const portfolioId = trader1.getPortfolioId();
  // e.g. an Agoric portfolio stored before `evmHandler` and `ownerTransfer`
  stripStoredPortfolioKit(contractBaggage!, portfolioId);

  const { doneP } = await startTransfer(
    evmAccount.address,
    (await getNow()) + 600n,
  );
  const accepted = await evmTrader
    .forChain('Arbitrum')
    .acceptOwnership(portfolioId);
  t.like(accepted, { status: 'ok', result: `portfolio${portfolioId}` });
  t.like(await doneP, {
    result: `eip155:42161:${evmAccount.address.toLowerCase()}`,
  });
});

test('only the designated EVM account can accept', async t => {
  const deployed = await setupTransfer(t);
  const { trader1, evmTrader, evmAccount, getNow, startTransfer } = deployed;
  const portfolioId = trader1.getPortfolioId();
  const { evmTrader: otherTrader, evmAccount: otherAccount } =
    await makeEvmTraderKit(deployed, { privateKey: evmTrader1PrivateKey });

  const { doneP } = await startTransfer(
    evmAccount.address,
    (await getNow()) + 600n,
  );

  const rejected = await otherTrader
    .forChain('Arbitrum')
    .acceptOwnership(portfolioId);
  t.like(rejected, { status: 'error' });
  t.true(
    rejected.status === 'error' &&
      rejected.error.includes(`not "${otherAccount.address}"`),
    rejected.status === 'error' ? rejected.error : undefined,
  );

  // The designated transfer is still pending.
  const accepted = await evmTrader
    .forChain('Arbitrum')
    .acceptOwnership(portfolioId);
  t.like(accepted, { status: 'ok' });
  await doneP;
});

test('a newer transfer supersedes a pending one', async t => {
  const deployed = await setupTransfer(t);
  const { trader1, evmTrader, evmAccount, getNow, startTransfer } = deployed;
  const portfolioId = trader1.getPortfolioId();
  const { evmAccount: otherAccount } = await makeEvmTraderKit(deployed, {
    privateKey: evmTrader1PrivateKey,
  });

  const { doneP: firstP } = await startTransfer(
    otherAccount.address,
    (await getNow()) + 600n,
  );
  const { doneP: secondP } = await startTransfer(
    evmAccount.address,
    (await getNow()) + 600n,
  );
  await t.throwsAsync(firstP, {
    message: 'superseded by a newer ownership transfer',
  });

  const accepted = await evmTrader
    .forChain('Arbitrum')
    .acceptOwnership(portfolioId);
  t.like(accepted, { status: 'ok' });
  await secondP;
});

test('an unaccepted transfer expires at its deadline', async t => {
  const {
    trader1,
    evmTrader,
    evmAccount,
    getNow,
    startTransfer,
    timerService,
  } = await setupTransfer(t);
  const portfolioId = trader1.getPortfolioId();

  const deadline = (await getNow()) + 600n;
  const { doneP } = await startTransfer(evmAccount.address, deadline);

  await timerService.advanceTo(deadline);
  await eventLoopIteration();
  t.truthy(
    (await trader1.getPortfolioStatus()).pendingOwnerTransfer,
    'still pending at the deadline',
  );

  await timerService.advanceTo(deadline + 1n);
  await t.throwsAsync(doneP, {
    message: `ownership transfer expired at ${deadline}`,
  });
  t.is((await trader1.getPortfolioStatus()).pendingOwnerTransfer, undefined);

  const rejected = await evmTrader
    .forChain('Arbitrum')
    .acceptOwnership(portfolioId);
  t.like(rejected, {
    status: 'error',
    error: `Error: portfolio${portfolioId} has no pending ownership transfer`,
  });
});

test('a superseding transfer expires at its own deadline', async t => {
  const deployed = await setupTransfer(t);
  const { trader1, evmAccount, getNow, startTransfer, timerService } = deployed;
  const { evmAccount: otherAccount } = await makeEvmTraderKit(deployed, {
    privateKey: evmTrader1PrivateKey,
  });
  const now = await getNow();

  // Earlier than the transfer it supersedes
  const { doneP: firstP } = await startTransfer(
    otherAccount.address,
    now + 600n,
  );
  const { doneP: earlierP } = await startTransfer(
    evmAccount.address,
    now + 300n,
  );
  await t.throwsAsync(firstP, { message: /superseded/ });
  await timerService.advanceTo(now + 301n);
  await t.throwsAsync(earlierP, {
    message: `ownership transfer expired at ${now + 300n}`,
  });

  // Later than the transfer it supersedes
  const { doneP: secondP } = await startTransfer(
    otherAccount.address,
    now + 400n,
  );
  const { doneP: laterP } = await startTransfer(evmAccount.address, now + 900n);
  await t.throwsAsync(secondP, { message: /superseded/ });
  await timerService.advanceTo(now + 401n);
  await eventLoopIteration();
  t.like(await trader1.getPortfolioStatus(), {
    pendingOwnerTransfer: {
      evmAddress: evmAccount.address,
      deadlineTimestampSeconds: now + 900n,
    },
  });
  await timerService.advanceTo(now + 901n);
  await t.throwsAsync(laterP, {
    message: `ownership transfer expired at ${now + 900n}`,
  });
});

test('transfer deadline must be near future', async t => {
  const { trader1, evmAccount, getNow } = await setupTransfer(t);
  const now = await getNow();

  await t.throwsAsync(
    trader1.transferOwnershipToEVM(t, {
      evmAddress: evmAccount.address,
      deadlineTimestampSeconds: now - 1n,
    }),
    { message: /has already passed/ },
  );
  await t.throwsAsync(
    trader1.transferOwnershipToEVM(t, {
      evmAddress: evmAccount.address,
      // exclusive, like signed message deadlines
      deadlineTimestampSeconds: now + 60n * 60n * 24n,
    }),
    { message: /is too far in the future/ },
  );
  await t.throwsAsync(
    trader1.transferOwnershipToEVM(t, {
      evmAddress: '0x1234',
      deadlineTimestampSeconds: now + 600n,
    }),
    { message: 'invalid EVM address "0x1234"' },
  );
  t.is((await trader1.getPortfolioStatus()).pendingOwnerTransfer, undefined);
});
