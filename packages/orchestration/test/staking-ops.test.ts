import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { MsgWithdrawDelegatorRewardResponse } from '@agoric/cosmic-proto/cosmos/distribution/v1beta1/tx.js';
import {
  MsgBeginRedelegateResponse,
  MsgDelegate,
  MsgDelegateResponse,
  MsgUndelegateResponse,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { makeScalarBigMapStore, type Baggage } from '@agoric/vat-data';
import { decodeBase64 } from '@endo/base64';
import { E, Far } from '@endo/far';
import { buildZoeManualTimer } from '@agoric/zoe/tools/manualTimer.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { Coin } from '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js';
import type { TimestampRecord, TimestampValue } from '@agoric/time';
import type { AnyJson } from '@agoric/cosmic-proto';
import { makeDurableZone } from '@agoric/zone/durable.js';
import {
  prepareCosmosOrchestrationAccountKit,
  trivialDelegateResponse,
} from '../src/exos/cosmosOrchestrationAccount.js';
import { encodeTxResponse } from '../src/utils/cosmos.js';
import type { IcaAccount, ChainAddress, ICQConnection } from '../src/types.js';

const { Fail } = assert;

test('MsgDelegateResponse trivial response', t => {
  t.is(
    trivialDelegateResponse,
    'Ei0KKy9jb3Ntb3Muc3Rha2luZy52MWJldGExLk1zZ0RlbGVnYXRlUmVzcG9uc2U=',
  );
});

const configStaking = {
  acct1: {
    address: 'agoric1spy36ltduehs5dmszfrp792f0k2emcntrql3nx',
  },
  validator: {
    address: 'agoric1valoper234',
    addressEncoding: 'bech32',
    chainId: 'agoriclocal',
  },
  delegations: {
    agoric1valoper234: { denom: 'uatom', amount: '200' },
  },
  startTime: '2024-06-01T00:00Z',
  completionTime: '2024-06-22T00:00Z',
} as const;

const configRedelegate = {
  validator: {
    address: 'agoric1valoper444',
    addressEncoding: 'bech32',
    chainId: 'atom-test',
  },
  delegations: {
    agoric1valoper234: { denom: 'uatom', amount: '50' },
  },
} as const;

const TICK = 5n * 60n;
const DAY = (60n * 60n * 24n) / TICK;
const DAYf = Number(DAY);

const time = {
  parse: (dateString: string) =>
    BigInt(Date.parse(dateString) / 1000) as TimestampValue,

  format: (ts: TimestampRecord) =>
    new Date(Number(ts.absValue) * 1000).toISOString(),
};

const makeScenario = () => {
  const mockAccount = (
    addr = 'agoric1234',
    delegations = {} as Record<string, Coin>,
  ) => {
    const calls = [] as Array<{ msgs: AnyJson[] }>;

    const simulate = {
      '/cosmos.staking.v1beta1.MsgDelegate': _m => {
        const response = MsgDelegateResponse.fromPartial({});
        return encodeTxResponse(response, MsgDelegateResponse.toProtoMsg);
      },

      '/cosmos.staking.v1beta1.MsgBeginRedelegate': _m => {
        const response = MsgBeginRedelegateResponse.fromPartial({
          completionTime: new Date('2025-12-17T03:24:00Z'),
        });
        return encodeTxResponse(
          response,
          MsgBeginRedelegateResponse.toProtoMsg,
        );
      },

      '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward': m => {
        console.log('simulate withdraw', m);
        const rewards = Object.values(delegations).map(({ denom, amount }) => ({
          denom,
          amount: `${Number(amount) / 100}`,
        }));
        const response = {
          amount: rewards,
        } as MsgWithdrawDelegatorRewardResponse;

        return encodeTxResponse(
          response,
          MsgWithdrawDelegatorRewardResponse.toProtoMsg,
        );
      },

      '/cosmos.staking.v1beta1.MsgUndelegate': _m => {
        const { completionTime } = configStaking;
        const response = MsgUndelegateResponse.fromPartial({
          completionTime: new Date(completionTime),
        });
        return encodeTxResponse(response, MsgUndelegateResponse.toProtoMsg);
      },
    };

    const chainAddress: ChainAddress = harden({
      address: addr,
      addressEncoding: 'bech32',
      chainId: 'mock-1',
    });

    const account: IcaAccount = Far('MockAccount', {
      getAddress: () => chainAddress,
      executeEncodedTx: async msgs => {
        assert.equal(msgs.length, 1);
        const { typeUrl } = msgs[0];
        const doMessage = simulate[typeUrl];
        assert(doMessage, `unknown ${typeUrl}`);
        await null;
        calls.push({ msgs });
        return doMessage(msgs[0]);
      },
      executeTx: () => Fail`mock`,
      close: () => Fail`mock`,
      deposit: () => Fail`mock`,
      getPurse: () => Fail`mock`,
      prepareTransfer: () => Fail`mock`,
      getLocalAddress: () => Fail`mock`,
      getRemoteAddress: () => Fail`mock`,
      getPort: () => Fail`mock`,
    });
    return { account, calls };
  };

  const mockZCF = () => {
    const toHandler = new Map();
    const zcf: ZCF = harden({
      // @ts-expect-error mock
      makeInvitation: async (handler, _desc, _c, _patt) => {
        const invitation = Far('Invitation', {}) as unknown as Invitation;
        toHandler.set(invitation, handler);
        return invitation;
      },
    });
    const zoe = harden({
      offer(invitation) {
        const handler = toHandler.get(invitation);
        const zcfSeat = harden({
          exit() {},
        });
        const result = Promise.resolve(null).then(() => handler(zcfSeat));
        const userSeat = harden({
          getOfferResult: () => result,
        });
        return userSeat;
      },
    });
    return { zcf, zoe };
  };

  const makeRecorderKit = () => harden({}) as any;

  const baggage = makeScalarBigMapStore('b1') as Baggage;
  const zone = makeDurableZone(baggage);

  const { delegations, startTime } = configStaking;

  // TODO: when we write to chainStorage, test it.
  //   const { rootNode } = makeFakeStorageKit('mockChainStorageRoot');

  const storageNode = Far('StorageNode', {}) as unknown as StorageNode;

  const icqConnection = Far('ICQConnection', {}) as ICQConnection;

  const timer = buildZoeManualTimer(undefined, time.parse(startTime), {
    timeStep: TICK,
    eventLoopIteration,
  });
  return {
    baggage,
    zone,
    makeRecorderKit,
    ...mockAccount(undefined, delegations),
    storageNode,
    timer,
    icqConnection,
    ...mockZCF(),
  };
};

test('withdrawRewards() on StakingAccountHolder formats message correctly', async t => {
  const s = makeScenario();
  const { account, calls, timer } = s;
  const { makeRecorderKit, storageNode, zcf, icqConnection, zone } = s;
  const make = prepareCosmosOrchestrationAccountKit(zone, makeRecorderKit, zcf);

  // Higher fidelity tests below use invitationMakers.
  const { holder } = make(account.getAddress(), 'uatom', {
    account,
    storageNode,
    icqConnection,
    timer,
  });
  const { validator } = configStaking;
  const actual = await E(holder).withdrawReward(validator);
  t.deepEqual(actual, [{ denom: 'uatom', value: 2n }]);
  const msg = {
    typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
    value: 'CgphZ29yaWMxMjM0EhFhZ29yaWMxdmFsb3BlcjIzNA==',
  };
  t.deepEqual(calls, [{ msgs: [msg] }]);
});

test(`delegate; redelegate using invitationMakers`, async t => {
  const s = makeScenario();
  const { account, calls, timer } = s;
  const { makeRecorderKit, storageNode, zcf, zoe, icqConnection, zone } = s;
  const aBrand = Far('Token') as Brand<'nat'>;
  const makeAccountKit = prepareCosmosOrchestrationAccountKit(
    zone,
    makeRecorderKit,
    zcf,
  );

  const { invitationMakers } = makeAccountKit(account.getAddress(), 'uatom', {
    account,
    storageNode,
    icqConnection,
    timer,
  });

  const { validator, delegations } = configStaking;
  {
    const value = BigInt(Object.values(delegations)[0].amount);
    const anAmount = { brand: aBrand, value };
    const toDelegate = await E(invitationMakers).Delegate(validator, anAmount);
    const seat = E(zoe).offer(toDelegate);
    const result = await E(seat).getOfferResult();

    t.deepEqual(result, undefined);
    const msg = {
      typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
      value: 'CgphZ29yaWMxMjM0EhFhZ29yaWMxdmFsb3BlcjIzNBoMCgV1YXRvbRIDMjAw',
    };
    t.deepEqual(calls, [{ msgs: [msg] }]);

    // That msg.value looked odd in a protobuf tool. Let's double-check.
    t.deepEqual(MsgDelegate.decode(decodeBase64(msg.value)), {
      amount: {
        amount: '200',
        denom: 'uatom',
      },
      delegatorAddress: 'agoric1234',
      validatorAddress: 'agoric1valoper234',
    });
    t.is(msg.typeUrl, MsgDelegate.typeUrl);

    // clear calls
    calls.splice(0, calls.length);
  }

  {
    const { validator: dst } = configRedelegate;
    const value = BigInt(Object.values(configRedelegate.delegations)[0].amount);
    const anAmount = { brand: aBrand, value };
    const toRedelegate = await E(invitationMakers).Redelegate(
      validator,
      dst,
      anAmount,
    );
    const seat = E(zoe).offer(toRedelegate);
    const result = await E(seat).getOfferResult();

    t.deepEqual(result, undefined);
    const msg = {
      typeUrl: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
      value:
        'CgphZ29yaWMxMjM0EhFhZ29yaWMxdmFsb3BlcjIzNBoRYWdvcmljMXZhbG9wZXI0NDQiCwoFdWF0b20SAjUw',
    };
    t.deepEqual(calls, [{ msgs: [msg] }]);
  }
});

test(`withdraw rewards using invitationMakers`, async t => {
  const s = makeScenario();
  const { account, calls, timer } = s;
  const { makeRecorderKit, storageNode, zcf, zoe, icqConnection, zone } = s;
  const makeAccountKit = prepareCosmosOrchestrationAccountKit(
    zone,
    makeRecorderKit,
    zcf,
  );

  const { invitationMakers } = makeAccountKit(account.getAddress(), 'uatom', {
    account,
    storageNode,
    icqConnection,
    timer,
  });

  const { validator } = configStaking;
  const toWithdraw = await E(invitationMakers).WithdrawReward(validator);
  const seat = E(zoe).offer(toWithdraw);
  const result = await E(seat).getOfferResult();

  t.deepEqual(result, [{ denom: 'uatom', value: 2n }]);
  const msg = {
    typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
    value: 'CgphZ29yaWMxMjM0EhFhZ29yaWMxdmFsb3BlcjIzNA==',
  };
  t.deepEqual(calls, [{ msgs: [msg] }]);
});

test(`undelegate waits for unbonding period`, async t => {
  const s = makeScenario();
  const { account, calls, timer } = s;
  const { makeRecorderKit, storageNode, zcf, zoe, icqConnection, zone } = s;
  const makeAccountKit = prepareCosmosOrchestrationAccountKit(
    zone,
    makeRecorderKit,
    zcf,
  );

  const { invitationMakers } = makeAccountKit(account.getAddress(), 'uatom', {
    account,
    storageNode,
    icqConnection,
    timer,
  });

  const { validator, delegations } = configStaking;

  const value = BigInt(Object.values(delegations)[0].amount);
  const anAmount = { brand: Far('Token'), value } as Amount<'nat'>;
  const delegation = {
    delegatorAddress: account.getAddress().address,
    shares: `${anAmount.value}`,
    validatorAddress: validator.address,
  };
  const toUndelegate = await E(invitationMakers).Undelegate([delegation]);
  const current = () => E(timer).getCurrentTimestamp().then(time.format);
  t.log(await current(), 'undelegate', delegation.shares);
  const seat = E(zoe).offer(toUndelegate);

  const beforeDone = E(timer)
    .tickN(15 * DAYf)
    .then(() => 15);
  const afterDone = beforeDone.then(() =>
    E(timer)
      .tickN(10 * DAYf)
      .then(() => 25),
  );
  const resultP = E(seat).getOfferResult();
  const notTooSoon = await Promise.race([beforeDone, resultP]);
  t.log(await current(), 'not too soon?', notTooSoon === 15);
  t.is(notTooSoon, 15);
  const result = await Promise.race([resultP, afterDone]);
  t.log(await current(), 'in time?', result === undefined);
  t.deepEqual(result, undefined);

  const msg = {
    typeUrl: '/cosmos.staking.v1beta1.MsgUndelegate',
    value: 'CgphZ29yaWMxMjM0EhFhZ29yaWMxdmFsb3BlcjIzNBoMCgV1YXRvbRIDMjAw',
  };
  t.deepEqual(calls, [{ msgs: [msg] }]);
});

test.todo(`delegate; undelegate; collect rewards`);
test.todo('undelegate uses a timer: begin; how long? wait; resolve');
test.todo('undelegate is cancellable - cosmos cancelUnbonding');
