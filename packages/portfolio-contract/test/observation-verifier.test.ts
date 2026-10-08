import '@endo/init/debug.js';

import test from 'ava';

import {
  portfolioObservationsToEIP712,
  ymaxObservationMessageKit,
  type PortfolioObservationsContent,
  type SignedPortfolioObservations,
} from '@agoric/portfolio-api/src/observation-messages.js';
import { getYmaxStandaloneDomain } from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import { Far } from '@endo/far';
import { privateKeyToAccount } from 'viem/accounts';
import {
  makePortfolioObservationsVerifier,
  MAX_OBSERVATION_AGE_SECONDS,
} from '../src/observation-verifier.ts';
import { evmTrader0PrivateKey, evmTrader1PrivateKey } from './mocks.ts';

const attestor = privateKeyToAccount(evmTrader0PrivateKey);
const notAttestor = privateKeyToAccount(evmTrader1PrivateKey);

const ROUTER = '0x1234567890abcdef1234567890abcdef12345678' as const;
const CHAIN_ID = 42161n;
const NOW = 1_700_000_000n;
const OBSERVATION_LIFETIME = 5n * 60n;

const observation: PortfolioObservationsContent = harden({
  portfolioId: 12,
  syncState: { policyVersion: 3, rebalanceCount: 7 },
  observations: {
    balances: { '@Base': 200_000_000n, Aave_Base: 100_000_000n },
    instrumentTvls: { Aave_Base: { tvlUsd: 12_000_000n } },
  },
});

const timerService = Far('MockTimer', {
  getCurrentTimestamp: () => harden({ absValue: NOW }),
});

const verify = makePortfolioObservationsVerifier({
  attestorAddress: attestor.address,
  verifyingContracts: { [`${CHAIN_ID}`]: ROUTER },
  timerService: timerService as any,
});

const ISSUED_AT = NOW - 10n;

const makeMessage = ({
  issuedAt = ISSUED_AT,
  deadline = issuedAt + OBSERVATION_LIFETIME,
  chainId = CHAIN_ID,
  verifyingContract = ROUTER as `0x${string}`,
} = {}) =>
  ymaxObservationMessageKit.getStandaloneOperationData(
    {
      ...portfolioObservationsToEIP712(observation),
      nonce: issuedAt,
      deadline,
    },
    'PortfolioObservations',
    chainId,
    verifyingContract,
  );

const sign = async (
  message: ReturnType<typeof makeMessage>,
  account = attestor,
): Promise<SignedPortfolioObservations> =>
  harden({ ...message, signature: await account.signTypedData(message) });

test('verifies observations signed by the attestor', async t => {
  const verified = await verify(await sign(makeMessage()));
  t.deepEqual(verified, {
    ...observation,
    issuedAt: ISSUED_AT,
    deadline: ISSUED_AT + OBSERVATION_LIFETIME,
  });
});

test('accepts observations issued at the maximum age', async t => {
  const issuedAt = NOW - MAX_OBSERVATION_AGE_SECONDS;
  const verified = await verify(
    await sign(makeMessage({ issuedAt, deadline: NOW })),
  );
  t.is(verified.issuedAt, issuedAt);
});

test('leaves the lifetime of observations to the attestor', async t => {
  const deadline = NOW + 24n * 60n * 60n;
  const verified = await verify(await sign(makeMessage({ deadline })));
  t.is(verified.deadline, deadline);
});

test('accepts string-encoded integers', async t => {
  const signed = await sign(makeMessage());
  const { message } = signed;
  const verified = await verify(
    harden({
      ...signed,
      domain: { ...signed.domain, chainId: `${CHAIN_ID}` },
      message: {
        ...message,
        portfolio: `${message.portfolio}`,
        syncState: { policyVersion: '3', rebalanceCount: '0x7' },
        nonce: `0x${message.nonce.toString(16)}`,
        deadline: `${message.deadline}`,
      },
    }) as unknown as SignedPortfolioObservations,
  );
  t.deepEqual(verified, {
    ...observation,
    issuedAt: ISSUED_AT,
    deadline: ISSUED_AT + OBSERVATION_LIFETIME,
  });
});

test('rejects observations not signed by the attestor', async t => {
  await t.throwsAsync(verify(await sign(makeMessage(), notAttestor)), {
    message: /observations not signed by the attestor/,
  });
});

test('rejects observations modified after signing', async t => {
  const signed = await sign(makeMessage());
  await t.throwsAsync(
    verify(
      harden({ ...signed, message: { ...signed.message, portfolio: 13n } }),
    ),
    { message: /observations not signed by the attestor/ },
  );
});

test('rejects a field added after signing', async t => {
  const signed = await sign(makeMessage());
  await t.throwsAsync(
    verify(
      harden({
        ...signed,
        message: { ...signed.message, extra: 1n },
      }) as unknown as SignedPortfolioObservations,
    ),
    {
      message:
        /Unexpected field\(s\) on EIP-712 type "PortfolioObservations": "extra"/,
    },
  );
});

test('rejects a signed field unknown to this version', async t => {
  const message = makeMessage();
  const extended = harden({
    ...message,
    types: {
      ...message.types,
      PortfolioObservations: [
        ...message.types.PortfolioObservations,
        { name: 'extra', type: 'uint256' },
      ],
    },
    message: { ...message.message, extra: 1n },
  }) as unknown as typeof message;
  await t.throwsAsync(verify(await sign(extended)), {
    message:
      /Unexpected field\(s\) on EIP-712 type "PortfolioObservations": "extra"/,
  });
});

test('rejects the Ymax portfolio operations domain', async t => {
  const message = makeMessage();
  const ymaxDomain = getYmaxStandaloneDomain(CHAIN_ID, ROUTER);
  t.is(ymaxDomain.name, 'Ymax');
  const misdirected = harden({
    ...message,
    domain: ymaxDomain,
  }) as unknown as typeof message;
  await t.throwsAsync(verify(await sign(misdirected)), {
    message: /Invalid YmaxObservation domain name: Ymax/,
  });
});

test('rejects an unexpected verifying contract', async t => {
  const message = makeMessage({
    verifyingContract: `0x${'9'.repeat(40)}`,
  });
  await t.throwsAsync(verify(await sign(message)), {
    message: /Invalid verifying contract for chain ID 42161/,
  });
});

test('rejects an unexpected chain', async t => {
  await t.throwsAsync(verify(await sign(makeMessage({ chainId: 1n }))), {
    message: /Unknown chain ID in YmaxObservation domain: 1/,
  });
});

test('rejects an expired observation', async t => {
  await t.throwsAsync(verify(await sign(makeMessage({ deadline: NOW - 1n }))), {
    message: /observations deadline has passed/,
  });
});

test('accepts observations issued now', async t => {
  const verified = await verify(await sign(makeMessage({ issuedAt: NOW })));
  t.is(verified.issuedAt, NOW);
});

test('rejects observations issued in the future', async t => {
  await t.throwsAsync(verify(await sign(makeMessage({ issuedAt: NOW + 1n }))), {
    message: /observations issued in the future/,
  });
});

test('rejects observations issued too long ago', async t => {
  const issuedAt = NOW - MAX_OBSERVATION_AGE_SECONDS - 1n;
  await t.throwsAsync(
    verify(await sign(makeMessage({ issuedAt, deadline: NOW + 60n }))),
    { message: /observations issued too long ago/ },
  );
});

test('rejects invalid observation content', async t => {
  const message = makeMessage();
  const duplicated = harden({
    ...message,
    message: {
      ...message.message,
      holdings: [...message.message.holdings, message.message.holdings[0]],
    },
  });
  await t.throwsAsync(verify(await sign(duplicated)), {
    message: /duplicate holding place "@Base"/,
  });
});
