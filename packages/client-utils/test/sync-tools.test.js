/* eslint-env node */
// @ts-check
import test from 'ava';

import {
  waitUntilAccountFunded,
  waitUntilContractDeployed,
  waitUntilInvitationReceived,
  waitUntilOfferResult,
} from '../src/sync-tools.js';

// keep these small for tests
const retryIntervalMs = 10;
const DEFAULT_TIMEOUT = 30;

const makeFakeFollow = () => {
  let value = [[]];

  const setValue = newValue => (value = newValue);
  const follow = () => Promise.resolve(value);

  return { setValue, follow };
};

const makeFakeBalanceQuery = () => {
  let result = {
    balances: [
      {
        denom: 'ubld',
        amount: '364095061',
      },
      {
        denom: 'uist',
        amount: '2257215',
      },
    ],
    pagination: {
      next_key: null,
      total: '0',
    },
  };

  const setResult = newValue => (result = newValue);
  const query = () => Promise.resolve(result);

  return { setResult, query };
};

test.serial('wait until contract is deployed', async t => {
  const { setValue, follow } = makeFakeFollow();
  const waitP = waitUntilContractDeployed(
    'name',
    {
      follow,
      log: t.log,
      setTimeout,
    },
    {
      maxRetries: 5,
      retryIntervalMs,
      errorMessage: 'Contract not deployed yet',
    },
  );

  setTimeout(() => setValue([['name', true]]), DEFAULT_TIMEOUT); // set desired value after third retry

  await t.notThrowsAsync(waitP);
});

test.serial('wait until account funded', async t => {
  const { setResult, query } = makeFakeBalanceQuery();

  const waitP = waitUntilAccountFunded(
    'agoric12345',
    { log: t.log, query, setTimeout },
    { denom: 'ufake', value: 100_000 },
    {
      maxRetries: 5,
      retryIntervalMs,
      errorMessage: 'Account not funded yet',
    },
  );

  const desiredResult = {
    balances: [
      {
        denom: 'ubld',
        amount: '364095061',
      },
      {
        denom: 'uist',
        amount: '2257215',
      },
      {
        denom: 'ufake',
        amount: '100001',
      },
    ],
    pagination: {
      next_key: null,
      total: '0',
    },
  };
  setTimeout(() => setResult(desiredResult), DEFAULT_TIMEOUT); // set desired value after third retry
  await t.notThrowsAsync(waitP);
});

test.serial('wait until account funded, insufficient balance', async t => {
  const { setResult, query } = makeFakeBalanceQuery();

  const waitP = waitUntilAccountFunded(
    'agoric12345',
    { log: t.log, query, setTimeout },
    { denom: 'ufake', value: 100_000 },
    {
      maxRetries: 5,
      retryIntervalMs,
      errorMessage: 'Account not funded yet',
    },
  );

  const desiredResult = {
    balances: [
      {
        denom: 'ubld',
        amount: '364095061',
      },
      {
        denom: 'uist',
        amount: '2257215',
      },
      {
        denom: 'ufake',
        amount: '90000',
      },
    ],
    pagination: {
      next_key: null,
      total: '0',
    },
  };
  setTimeout(() => setResult(desiredResult), DEFAULT_TIMEOUT); // set desired value after third retry
  await t.throwsAsync(waitP, { message: /Account not funded yet/ });
});

test.serial(
  'wait until offer result, balance update - should throw',
  async t => {
    const { setValue, follow } = makeFakeFollow();
    setValue({ status: {}, updated: 'balance' });

    const waitP = waitUntilOfferResult(
      'agoric12345',
      'my-offer',
      false,
      { log: t.log, follow, setTimeout },
      {
        maxRetries: 5,
        retryIntervalMs,
        errorMessage: 'Wrong update type',
      },
    );

    await t.throwsAsync(waitP, { message: /Wrong update type/ });
  },
);

test.serial('wait until offer result, wrong id - should throw', async t => {
  const { setValue, follow } = makeFakeFollow();
  setValue({ status: { id: 'your-offer' }, updated: 'offerStatus' });

  const waitP = waitUntilOfferResult(
    'agoric12345',
    'my-offer',
    false,
    { log: t.log, follow, setTimeout },
    {
      maxRetries: 5,
      retryIntervalMs,
      errorMessage: 'Wrong offer id',
    },
  );

  await t.throwsAsync(waitP, { message: /Wrong offer id/ });
});

test.serial('wait until offer result, no "status" - should throw', async t => {
  const { setValue, follow } = makeFakeFollow();
  setValue({ updated: 'offerStatus' });

  const waitP = waitUntilOfferResult(
    'agoric12345',
    'my-offer',
    false,
    { follow, log: t.log, setTimeout },
    {
      maxRetries: 5,
      retryIntervalMs,
      errorMessage: 'No "status" object',
    },
  );

  await t.throwsAsync(waitP, { message: /No "status" object/ });
});

test.serial(
  'wait until offer result, numWantsSatisfied not equals to 1 - should throw',
  async t => {
    const { setValue, follow } = makeFakeFollow();
    setValue({
      status: { id: 'my-offer', numWantsSatisfied: 0 },
      updated: 'offerStatus',
    });

    const waitP = waitUntilOfferResult(
      'agoric12345',
      'my-offer',
      false,
      { follow, log: t.log, setTimeout },
      {
        maxRetries: 5,
        retryIntervalMs,
        errorMessage: '"numWantsSatisfied" is not 1',
      },
    );

    await t.throwsAsync(waitP, { message: /"numWantsSatisfied" is not 1/ });
  },
);

test.serial('wait until offer result, do not wait for "payouts"', async t => {
  const { setValue, follow } = makeFakeFollow();
  setValue({ status: { id: 'my-offer' }, updated: 'offerStatus' });

  const waitP = waitUntilOfferResult(
    'agoric12345',
    'my-offer',
    false,
    { follow, log: t.log, setTimeout },
    {
      maxRetries: 7,
      retryIntervalMs,
      errorMessage: 'offer not resulted on time',
    },
  );

  setTimeout(
    () =>
      setValue({
        status: { id: 'my-offer', numWantsSatisfied: 1 },
        updated: 'offerStatus',
      }),
    10,
  ); // First, offer is seated
  setTimeout(
    () =>
      setValue({
        status: { id: 'my-offer', numWantsSatisfied: 1, result: 'thank you' },
        updated: 'offerStatus',
      }),
    DEFAULT_TIMEOUT,
  ); // Then offer got results

  await t.notThrowsAsync(waitP);
});

test.serial('wait until offer result, wait for "payouts"', async t => {
  const { setValue, follow } = makeFakeFollow();
  setValue({ status: { id: 'my-offer' }, updated: 'offerStatus' });

  const waitP = waitUntilOfferResult(
    'agoric12345',
    'my-offer',
    true,
    { follow, log: t.log, setTimeout },
    {
      maxRetries: 7,
      retryIntervalMs,
      errorMessage: 'payouts not received on time',
    },
  );

  setTimeout(
    () =>
      setValue({
        status: { id: 'my-offer', numWantsSatisfied: 1 },
        updated: 'offerStatus',
      }),
    10,
  ); // First, offer is seated
  setTimeout(
    () =>
      setValue({
        status: { id: 'my-offer', numWantsSatisfied: 1, result: 'thank you' },
        updated: 'offerStatus',
      }),
    30,
  ); // Now offer got results
  setTimeout(
    () =>
      setValue({
        status: {
          id: 'my-offer',
          numWantsSatisfied: 1,
          result: 'thank you',
          payouts: {},
        },
        updated: 'offerStatus',
      }),
    40,
  ); // Payouts are received

  await t.notThrowsAsync(waitP);
});

test.serial(
  'wait until invitation recevied, wrong "updated" value',
  async t => {
    const { setValue, follow } = makeFakeFollow();
    setValue({ updated: 'offerStatus' });

    const waitP = waitUntilInvitationReceived(
      'agoric12345',
      { follow, log: t.log, setTimeout },
      {
        maxRetries: 3,
        retryIntervalMs,
        errorMessage: 'wrong "updated" value',
      },
    );

    await t.throwsAsync(waitP, { message: /wrong "updated" value/ });
  },
);

test.serial(
  'wait until invitation recevied, falty "currentAmount" object',
  async t => {
    const { setValue, follow } = makeFakeFollow();
    setValue({ updated: 'balance' });

    const waitP = waitUntilInvitationReceived(
      'agoric12345',
      { follow, log: t.log, setTimeout },
      {
        maxRetries: 5,
        retryIntervalMs,
        errorMessage: 'faulty "currentAmount" object',
      },
    );

    setTimeout(
      () => setValue({ updated: 'balance', currentAmount: { foo: true } }),
      20,
    );

    await t.throwsAsync(waitP, { message: /faulty "currentAmount" object/ });
  },
);

test.serial(
  'wait until invitation recevied, brand string do not match',
  async t => {
    const { setValue, follow } = makeFakeFollow();
    setValue({ updated: 'balance', currentAmount: { brand: 'foo bar foo' } });

    const waitP = waitUntilInvitationReceived(
      'agoric12345',
      { follow, log: t.log, setTimeout },
      {
        maxRetries: 3,
        retryIntervalMs,
        errorMessage: 'brand string do not match',
      },
    );

    await t.throwsAsync(waitP, { message: /brand string do not match/ });
  },
);

test.serial('wait until invitation recevied', async t => {
  const { setValue, follow } = makeFakeFollow();
  setValue({});

  const waitP = waitUntilInvitationReceived(
    'agoric12345',
    { follow, log: t.log, setTimeout },
    {
      maxRetries: 5,
      retryIntervalMs,
      errorMessage: 'brand string do not match',
    },
  );

  setTimeout(
    () =>
      setValue({
        updated: 'balance',
        currentAmount: { brand: '[Alleged: SEVERED: Zoe Invitation brand {}]' },
      }),
    20,
  );

  await t.notThrowsAsync(waitP);
});
