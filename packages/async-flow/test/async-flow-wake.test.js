// The purpose of this test file is to demonstrate
// https://github.com/Agoric/agoric-sdk/issues/9377
// as the `.failing` test at the end.

import { testAsyncLife } from './prepare-test-env-ava.js';

const neverSettlesP = new Promise(() => {});

testAsyncLife(
  'test durable first-crank hazard 1',
  async (t, { zone, asyncFlow }) => {
    const guestFunc = async () => neverSettlesP;

    const wrapperFunc = asyncFlow(zone, 'guestFunc', guestFunc);

    return { wrapperFunc };
  },
  async (t, { wrapperFunc }) => {
    wrapperFunc();
    t.pass();
  },
);

testAsyncLife(
  'test durable first-crank hazard 2',
  async (t, { zone, asyncFlow }) => {
    const guestFunc = async () => neverSettlesP;

    t.notThrows(() => asyncFlow(zone, 'guestFunc', guestFunc));
  },
);

testAsyncLife.failing(
  'test durable first-crank hazard 3',
  async (t, { zone, asyncFlow, allWokenP }) => {
    await null;

    const guestFunc = async () => neverSettlesP;
    t.notThrows(() => asyncFlow(zone, 'guestFunc', guestFunc));
    return { allWokenP };
  },
  async (t, { allWokenP }) => {
    await t.notThrowsAsync(
      () => allWokenP,
      'will actually throw due to crank bug #9377',
    );
  },
);
