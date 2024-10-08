// Stand-in code for PR https://github.com/Agoric/agoric-sdk/pull/10171.
// This file will be dropped when 10171 goes in.

// @ts-check
import test from 'ava';
import '@endo/init/debug.js';
import {
  waitUntilAccountFunded,
  waitUntilContractDeplyed,
  waitUntilInvitationReceived,
  waitUntilOfferResult,
} from './sync-tools.js';

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
  const waitP = waitUntilContractDeplyed(
    'name',
    {
      follow,
      setTimeout: globalThis.setTimeout,
    },
    {
      maxRetries: 5,
      retryIntervalMs: 1000,
      log: t.log,
      errorMessage: 'Contact not deplyed yet',
    },
  );

  setTimeout(() => setValue([['name', true]]), 3000); // set desired value after third retry

  await t.notThrowsAsync(waitP);
});

test.serial('wait until account funded', async t => {
  const { setResult, query } = makeFakeBalanceQuery();

  const waitP = waitUntilAccountFunded(
    'agoric12345',
    { query, setTimeout: globalThis.setTimeout },
    { denom: 'ufake', value: 100_000 },
    {
      maxRetries: 5,
      retryIntervalMs: 1000,
      log: t.log,
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
  setTimeout(() => setResult(desiredResult), 3000); // set desired value after third retry
  await t.notThrowsAsync(waitP);
});

test.serial('wait until account funded, insufficient balance', async t => {
  const { setResult, query } = makeFakeBalanceQuery();

  const waitP = waitUntilAccountFunded(
    'agoric12345',
    { query, setTimeout: globalThis.setTimeout },
    { denom: 'ufake', value: 100_000 },
    {
      maxRetries: 5,
      retryIntervalMs: 1000,
      log: t.log,
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
  setTimeout(() => setResult(desiredResult), 3000); // set desired value after third retry
  await t.throwsAsync(waitP);
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
      { follow, setTimeout: globalThis.setTimeout },
      {
        maxRetries: 5,
        retryIntervalMs: 1000,
        log: t.log,
        errorMessage: 'Wrong update type',
      },
    );

    await t.throwsAsync(waitP);
  },
);

test.serial('wait until offer result, wrong id - should throw', async t => {
  const { setValue, follow } = makeFakeFollow();
  setValue({ status: { id: 'your-offer' }, updated: 'offerStatus' });

  const waitP = waitUntilOfferResult(
    'agoric12345',
    'my-offer',
    false,
    { follow, setTimeout: globalThis.setTimeout },
    {
      maxRetries: 5,
      retryIntervalMs: 1000,
      log: t.log,
      errorMessage: 'Wrong offer id',
    },
  );

  await t.throwsAsync(waitP);
});

test.serial('wait until offer result, no "status" - should throw', async t => {
  const { setValue, follow } = makeFakeFollow();
  setValue({ updated: 'offerStatus' });

  const waitP = waitUntilOfferResult(
    'agoric12345',
    'my-offer',
    false,
    { follow, setTimeout: globalThis.setTimeout },
    {
      maxRetries: 5,
      retryIntervalMs: 1000,
      log: t.log,
      errorMessage: 'No "status" object',
    },
  );

  await t.throwsAsync(waitP);
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
      { follow, setTimeout: globalThis.setTimeout },
      {
        maxRetries: 5,
        retryIntervalMs: 1000,
        log: t.log,
        errorMessage: '"numWantsSatisfied" is not 1',
      },
    );

    await t.throwsAsync(waitP);
  },
);

test.serial('wait until offer result, do not wait for "payouts"', async t => {
  const { setValue, follow } = makeFakeFollow();
  setValue({ status: { id: 'my-offer' }, updated: 'offerStatus' });

  const waitP = waitUntilOfferResult(
    'agoric12345',
    'my-offer',
    false,
    { follow, setTimeout: globalThis.setTimeout },
    {
      maxRetries: 7,
      retryIntervalMs: 1000,
      log: t.log,
      errorMessage: 'offer not resulted on time',
    },
  );

  setTimeout(
    () =>
      setValue({
        status: { id: 'my-offer', numWantsSatisfied: 1 },
        updated: 'offerStatus',
      }),
    1000,
  ); // First, offer is seated
  setTimeout(
    () =>
      setValue({
        status: { id: 'my-offer', numWantsSatisfied: 1, result: 'thank you' },
        updated: 'offerStatus',
      }),
    3000,
  ); // First, offer is resulted

  await t.notThrowsAsync(waitP);
});

test.serial('wait until offer result, wait for "payouts"', async t => {
  const { setValue, follow } = makeFakeFollow();
  setValue({ status: { id: 'my-offer' }, updated: 'offerStatus' });

  const waitP = waitUntilOfferResult(
    'agoric12345',
    'my-offer',
    true,
    { follow, setTimeout: globalThis.setTimeout },
    {
      maxRetries: 7,
      retryIntervalMs: 1000,
      log: t.log,
      errorMessage: 'payouts not received on time',
    },
  );

  setTimeout(
    () =>
      setValue({
        status: { id: 'my-offer', numWantsSatisfied: 1 },
        updated: 'offerStatus',
      }),
    1000,
  ); // First, offer is seated
  setTimeout(
    () =>
      setValue({
        status: { id: 'my-offer', numWantsSatisfied: 1, result: 'thank you' },
        updated: 'offerStatus',
      }),
    3000,
  ); // Now, offer is resulted
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
    4000,
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
      { follow, setTimeout: globalThis.setTimeout },
      {
        maxRetries: 3,
        retryIntervalMs: 1000,
        log: t.log,
        errorMessage: 'wrong "updated" value',
      },
    );

    await t.throwsAsync(waitP);
  },
);

test.serial(
  'wait until invitation recevied, falty "currentAmount" object',
  async t => {
    const { setValue, follow } = makeFakeFollow();
    setValue({ updated: 'balance' });

    const waitP = waitUntilInvitationReceived(
      'agoric12345',
      { follow, setTimeout: globalThis.setTimeout },
      {
        maxRetries: 5,
        retryIntervalMs: 1000,
        log: t.log,
        errorMessage: 'falty "currentAmount" object',
      },
    );

    setTimeout(
      () => setValue({ updated: 'balance', currentAmount: { foo: true } }),
      2000,
    );

    await t.throwsAsync(waitP);
  },
);

test.serial(
  'wait until invitation recevied, brand string do not match',
  async t => {
    const { setValue, follow } = makeFakeFollow();
    setValue({ updated: 'balance', currentAmount: { brand: 'foo bar foo' } });

    const waitP = waitUntilInvitationReceived(
      'agoric12345',
      { follow, setTimeout: globalThis.setTimeout },
      {
        maxRetries: 3,
        retryIntervalMs: 1000,
        log: t.log,
        errorMessage: 'brand string do not match',
      },
    );

    await t.throwsAsync(waitP);
  },
);

test.serial('wait until invitation recevied', async t => {
  const { setValue, follow } = makeFakeFollow();
  setValue({});

  const waitP = waitUntilInvitationReceived(
    'agoric12345',
    { follow, setTimeout: globalThis.setTimeout },
    {
      maxRetries: 5,
      retryIntervalMs: 1000,
      log: t.log,
      errorMessage: 'brand string do not match',
    },
  );

  setTimeout(
    () =>
      setValue({
        updated: 'balance',
        currentAmount: { brand: '[Alleged: SEVERED: Zoe Invitation brand {}]' },
      }),
    2000,
  );

  await t.notThrowsAsync(waitP);
});
