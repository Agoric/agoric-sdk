// @ts-check
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { MsgWithdrawDelegatorRewardResponse } from '@agoric/cosmic-proto/cosmos/distribution/v1beta1/tx.js';
import { MsgDelegateResponse } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { encodeBase64 } from '@endo/base64';
import { E, Far } from '@endo/far';
import { prepareStakingAccountKit } from '../src/exos/stakingAccountKit.js';

/**
 * @import {ChainAccount, ChainAddress, CosmosValidatorAddress, ICQConnection} from '../src/types.js';
 * @import { Coin } from '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js';
 */

const test = anyTest;

const { Fail } = assert;

const scenario1 = {
  acct1: {
    address: 'agoric1spy36ltduehs5dmszfrp792f0k2emcntrql3nx',
  },
  /** @type {CosmosValidatorAddress} */
  validator: {
    address: 'agoric1valoper234',
    addressEncoding: 'bech32',
    chainId: 'agoriclocal',
  },
  delegations: {
    agoric1valoper234: { denom: 'uatom', amount: '200' },
  },
};

const makeScenario = () => {
  const txEncode = (response, toProtoMsg) => {
    const protoMsg = toProtoMsg(response);
    const any1 = Any.fromPartial(protoMsg);
    const any2 = Any.fromPartial({ value: Any.encode(any1).finish() });
    const ackStr = encodeBase64(Any.encode(any2).finish());
    return ackStr;
  };

  /**
   * @param {string} [addr]
   * @param {Record<string, Coin>} [delegations]
   */
  const mockAccount = (addr = 'agoric1234', delegations = {}) => {
    const calls = [];

    const simulate = {
      '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward': m => {
        console.log('simulate withdraw', m);
        const rewards = Object.values(delegations).map(({ denom, amount }) => ({
          denom,
          amount: `${Number(amount) / 100}`,
        }));
        /** @type {MsgWithdrawDelegatorRewardResponse} */
        const response = { amount: rewards };

        return txEncode(
          response,
          MsgWithdrawDelegatorRewardResponse.toProtoMsg,
        );
      },

      '/cosmos.staking.v1beta1.MsgDelegate': _m => {
        const response = MsgDelegateResponse.fromPartial({});
        return txEncode(response, MsgDelegateResponse.toProtoMsg);
      },
    };

    /** @type {ChainAddress} */
    const chainAddress = harden({
      address: addr,
      addressEncoding: 'bech32',
      chainId: 'FIXME',
    });

    /** @type {ChainAccount} */
    const account = Far('MockAccount', {
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
    /** @type {ZCF} */
    const zcf = harden({
      // @ts-expect-error mock
      makeInvitation: async (handler, _desc, _c, _patt) => {
        /** @type {Invitation} */
        // @ts-expect-error mock
        const invitation = harden({});
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

  const makeRecorderKit = () => {
    /** @type {any} */
    const kit = harden({});
    return kit;
  };
  const baggage = makeScalarBigMapStore('b1');

  const { delegations } = scenario1;

  // TODO: when we write to chainStorage, test it.
  //   const { rootNode } = makeFakeStorageKit('mockChainStorageRoot');

  /** @type {StorageNode} */
  // @ts-expect-error mock
  const storageNode = Far('StorageNode', {});

  /** @type {ICQConnection} */
  // @ts-expect-error mock
  const icqConnection = Far('ICQConnection', {});

  return {
    baggage,
    makeRecorderKit,
    ...mockAccount(undefined, delegations),
    storageNode,
    icqConnection,
    ...mockZCF(),
  };
};

test('withdraw rewards from staking account holder', async t => {
  const s = makeScenario();
  const { account, calls } = s;
  const { baggage, makeRecorderKit, storageNode, zcf, icqConnection } = s;
  const make = prepareStakingAccountKit(baggage, makeRecorderKit, zcf);

  // Higher fidelity tests below use invitationMakers.
  const { holder } = make(
    account,
    storageNode,
    account.getAddress(),
    icqConnection,
    'uatom',
  );
  const { validator } = scenario1;
  const actual = await E(holder).withdrawReward(validator);
  t.deepEqual(actual, [{ denom: 'uatom', value: 2n }]);
  const msg = {
    typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
    value: 'CgphZ29yaWMxMjM0EhFhZ29yaWMxdmFsb3BlcjIzNA==',
  };
  t.deepEqual(calls, [{ msgs: [msg] }]);
});

test(`delegate; withdraw rewards`, async t => {
  const s = makeScenario();
  const { account, calls } = s;
  const { baggage, makeRecorderKit, storageNode, zcf, zoe, icqConnection } = s;
  const make = prepareStakingAccountKit(baggage, makeRecorderKit, zcf);

  const { invitationMakers } = make(
    account,
    storageNode,
    account.getAddress(),
    icqConnection,
    'uatom',
  );

  const { validator, delegations } = scenario1;
  {
    const value = BigInt(Object.values(delegations)[0].amount);
    /** @type {Amount<'nat'>} */
    const anAmount = { brand: Far('Token'), value };
    const toDelegate = await E(invitationMakers).Delegate(validator, anAmount);
    const seat = E(zoe).offer(toDelegate);
    const result = await E(seat).getOfferResult();

    t.deepEqual(result, {});
    const msg = {
      typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
      value: 'CgphZ29yaWMxMjM0EhFhZ29yaWMxdmFsb3BlcjIzNBoMCgV1YXRvbRIDMjAw',
    };
    t.deepEqual(calls, [{ msgs: [msg] }]);
    calls.splice(0, calls.length);
  }

  {
    const toWithdraw = await E(invitationMakers).WithdrawReward(validator);
    const seat = E(zoe).offer(toWithdraw);
    const result = await E(seat).getOfferResult();

    t.deepEqual(result, [{ denom: 'uatom', value: 2n }]);
    const msg = {
      typeUrl: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
      value: 'CgphZ29yaWMxMjM0EhFhZ29yaWMxdmFsb3BlcjIzNA==',
    };
    t.deepEqual(calls, [{ msgs: [msg] }]);
  }
});

test.todo(`delegate; undelegate; collect rewards`);
test.todo('undelegate uses a timer: begin; how long? wait; resolve');
test.todo('undelegate is cancellable - cosmos cancelUnbonding');
