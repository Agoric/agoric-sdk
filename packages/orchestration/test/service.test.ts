import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { toRequestQueryJson } from '@agoric/cosmic-proto';
import {
  QueryBalanceRequest,
  QueryBalanceResponse,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import {
  MsgDelegate,
  MsgDelegateResponse,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import { matches } from '@endo/patterns';
import { heapVowE as E } from '@agoric/vow/vat.js';
import { decodeBase64 } from '@endo/base64';
import type { LocalIbcAddress } from '@agoric/vats/tools/ibc-utils.js';
import { getMethodNames } from '@agoric/internal';
import type { Port } from '@agoric/network';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { IBCMethod } from '@agoric/vats';
import { commonSetup } from './supports.js';
import { ChainAddressShape } from '../src/typeGuards.js';
import { tryDecodeResponse } from '../src/utils/cosmos.js';
import { buildChannelCloseConfirmEvent } from '../tools/ibc-mocks.js';

const CHAIN_ID = 'cosmoshub-99';
const HOST_CONNECTION_ID = 'connection-0';
const CONTROLLER_CONNECTION_ID = 'connection-1';

test('makeICQConnection returns an ICQConnection', async t => {
  const {
    bootstrap: { cosmosInterchainService },
  } = await commonSetup(t);

  const icqConnection = await E(cosmosInterchainService).provideICQConnection(
    CONTROLLER_CONNECTION_ID,
  );
  const [localAddr, remoteAddr] = await Promise.all([
    E(icqConnection).getLocalAddress(),
    E(icqConnection).getRemoteAddress(),
  ]);
  t.log(icqConnection, {
    localAddr,
    remoteAddr,
  });
  t.regex(localAddr, /ibc-port\/icqcontroller-\d+/);
  t.regex(
    remoteAddr,
    new RegExp(`/ibc-hop/${CONTROLLER_CONNECTION_ID}`),
    'remote address contains provided connectionId',
  );
  t.regex(
    remoteAddr,
    /icqhost\/unordered\/icq-1/,
    'remote address contains icqhost port, unordered ordering, and icq-1 version string',
  );

  const icqConnection2 = await E(cosmosInterchainService).provideICQConnection(
    CONTROLLER_CONNECTION_ID,
  );
  const localAddr2 = await E(icqConnection2).getLocalAddress();
  t.is(localAddr, localAddr2, 'provideICQConnection is idempotent');

  const [result] = await E(icqConnection).query([
    toRequestQueryJson(
      QueryBalanceRequest.toProtoMsg({
        address: 'cosmos1test',
        denom: 'uatom',
      }),
    ),
  ]);

  t.like(QueryBalanceResponse.decode(decodeBase64(result.key)), {
    balance: { amount: '0', denom: 'uatom' },
  });

  const icqConnection3 = await E(cosmosInterchainService).provideICQConnection(
    CONTROLLER_CONNECTION_ID,
    'icq-2',
  );
  const localAddr3 = await E(icqConnection3).getLocalAddress();
  t.not(
    localAddr3,
    localAddr2,
    'non default version results in a new connection',
  );

  const icqConnection4 = await E(cosmosInterchainService).provideICQConnection(
    CONTROLLER_CONNECTION_ID,
    'icq-2',
  );
  const localAddr4 = await E(icqConnection4).getLocalAddress();
  t.is(localAddr3, localAddr4, 'custom version is idempotent');

  const icqConnection5 = await E(cosmosInterchainService).provideICQConnection(
    'connection-99',
  );
  const localAddr5 = await E(icqConnection5).getLocalAddress();

  const getPortId = (lAddr: LocalIbcAddress) => lAddr.split('/')[2];
  const uniquePortIds = new Set(
    [localAddr, localAddr2, localAddr3, localAddr4, localAddr5].map(getPortId),
  );
  t.regex([...uniquePortIds][0], /icqcontroller-\d+/);
  t.is(uniquePortIds.size, 1, 'all connections share same port');

  await t.throwsAsync(
    // @ts-expect-error icqConnectionKit doesn't have a port method
    () => E(icqConnection).getPort(),
    undefined,
    'ICQConnection Kit does not expose its port',
  );
});

test('makeAccount returns an IcaAccountKit', async t => {
  const {
    bootstrap: { cosmosInterchainService },
  } = await commonSetup(t);

  const account = await E(cosmosInterchainService).makeAccount(
    CHAIN_ID,
    HOST_CONNECTION_ID,
    CONTROLLER_CONNECTION_ID,
  );
  const [localAddr, remoteAddr, chainAddr, port] = await Promise.all([
    E(account).getLocalAddress(),
    E(account).getRemoteAddress(),
    E(account).getAddress(),
    E(account).getPort(),
  ]);
  t.log(account, {
    localAddr,
    remoteAddr,
    chainAddr,
  });
  t.regex(localAddr, /ibc-port\/icacontroller-\d+/);
  t.regex(
    remoteAddr,
    new RegExp(`/ibc-hop/${CONTROLLER_CONNECTION_ID}`),
    'remote address contains provided connectionId',
  );
  t.regex(
    remoteAddr,
    /icahost\/ordered/,
    'remote address contains icahost port, ordered ordering',
  );
  t.regex(
    remoteAddr,
    /"version":"ics27-1"(.*)"encoding":"proto3"/,
    'remote address contains version and encoding in version string',
  );
  t.true(
    (
      ['addListener', 'removeListener', 'connect', 'revoke'] as (keyof Port)[]
    ).every(method => getMethodNames(port).includes(method)),
    'IcaAccountKit returns a Port remotable',
  );

  t.true(matches(chainAddr, ChainAddressShape));
  t.regex(chainAddr.value, /cosmos1test/);

  const delegateMsg = Any.toJSON(
    MsgDelegate.toProtoMsg({
      delegatorAddress: 'cosmos1test',
      validatorAddress: 'cosmosvaloper1test',
      amount: { denom: 'uatom', amount: '10' },
    }),
  );

  const delegateResp = await E(account).executeEncodedTx([delegateMsg]);
  t.deepEqual(
    tryDecodeResponse(delegateResp, MsgDelegateResponse.fromProtoMsg),
    {},
  );

  await E(account).close();
  await t.throwsAsync(
    E(account).executeEncodedTx([delegateMsg]),
    {
      message: 'Connection not available or closed.',
    },
    'cannot execute transaction if connection is closed',
  );
});

test('makeAccount accepts opts (version, ordering, encoding)', async t => {
  const {
    bootstrap: { cosmosInterchainService },
  } = await commonSetup(t);

  const account = await E(cosmosInterchainService).makeAccount(
    CHAIN_ID,
    HOST_CONNECTION_ID,
    CONTROLLER_CONNECTION_ID,
    { version: 'ics27-2', ordering: 'unordered', encoding: 'json' },
  );
  const [localAddr, remoteAddr] = await Promise.all([
    E(account).getLocalAddress(),
    E(account).getRemoteAddress(),
  ]);
  t.log({
    localAddr,
    remoteAddr,
  });
  for (const addr of [localAddr, remoteAddr]) {
    t.regex(addr, /unordered/, 'remote address contains unordered ordering');
    t.regex(
      addr,
      /"version":"ics27-2"(.*)"encoding":"json"/,
      'remote address contains version and encoding in version string',
    );
  }
});

test('.close() sends a downcall to the ibc bridge handler', async t => {
  const {
    bootstrap: { cosmosInterchainService },
    utils: { inspectDibcBridge },
  } = await commonSetup(t);

  const account = await E(cosmosInterchainService).makeAccount(
    CHAIN_ID,
    HOST_CONNECTION_ID,
    CONTROLLER_CONNECTION_ID,
  );
  await eventLoopIteration(); // ensure there's an account to close
  await E(account).close();
  await eventLoopIteration();

  const { bridgeEvents, bridgeDowncalls } = await inspectDibcBridge();
  t.is(bridgeEvents.length, 1, 'bridge received 1 event');
  t.is(
    bridgeEvents[0].event,
    'channelOpenAck',
    'bridged received channelOpenAck event',
  );

  t.is(bridgeDowncalls.length, 3, 'bridge received 3 downcalls');
  t.is(
    bridgeDowncalls[0].method,
    'bindPort',
    'bridge received bindPort downcall',
  );
  t.is(
    bridgeDowncalls[1].method,
    'startChannelOpenInit',
    'bridge received startChannelOpenInit downcall',
  );
  t.is(
    bridgeDowncalls[2].method,
    'startChannelCloseInit',
    'bridge received startChannelCloseInit downcall',
  );
});

test('onClose handler is called when channelCloseConfirm event is received', async t => {
  const {
    bootstrap: { cosmosInterchainService },
    mocks: { ibcBridge },
    utils: { inspectDibcBridge },
  } = await commonSetup(t);

  await E(cosmosInterchainService).makeAccount(
    CHAIN_ID,
    HOST_CONNECTION_ID,
    CONTROLLER_CONNECTION_ID,
    { version: 'ics27-2', ordering: 'unordered', encoding: 'json' },
  );

  const { bridgeEvents: bridgeEvents0, bridgeDowncalls: bridgeDowncalls0 } =
    await inspectDibcBridge();
  t.is(bridgeEvents0.length, 1, 'bridge received 1 event');
  t.is(
    bridgeEvents0[0].event,
    'channelOpenAck',
    'bridged received channelOpenAck event',
  );
  t.is(bridgeDowncalls0.length, 2, 'bridge received 2 downcalls');
  t.is(
    bridgeDowncalls0[0].method,
    'bindPort',
    'bridge received bindPort downcall',
  );
  t.is(
    bridgeDowncalls0[1].method,
    'startChannelOpenInit',
    'bridge received startChannelOpenInit downcall',
  );

  // get channelInfo from `channelOpenAck` event
  const { event, ...channelInfo } = bridgeEvents0[0];
  // simulate channel closing from remote chain
  await E(ibcBridge).fromBridge(buildChannelCloseConfirmEvent(channelInfo));
  await eventLoopIteration();

  const { bridgeEvents: bridgeEvents1, bridgeDowncalls: bridgeDowncalls1 } =
    await inspectDibcBridge();
  t.is(bridgeEvents1.length, 3, 'bridge received an additional 2 events');
  t.is(
    bridgeEvents1[bridgeEvents1.length - 2].event,
    'channelCloseConfirm',
    'bridged received channelCloseInit event',
  );
  t.is(
    bridgeEvents1[bridgeEvents1.length - 1].event,
    'channelOpenAck',
    'onCloe handler automatically reopens the channel',
  );
});

test('reopen a close account(channel) after choosing to close it', async t => {
  const {
    bootstrap: { cosmosInterchainService },
    utils: { inspectDibcBridge },
  } = await commonSetup(t);

  const account = await E(cosmosInterchainService).makeAccount(
    CHAIN_ID,
    HOST_CONNECTION_ID,
    CONTROLLER_CONNECTION_ID,
  );

  const [chainAddress0, remoteAddress0, localAddress0] = await Promise.all([
    E(account).getAddress(),
    E(account).getRemoteAddress(),
    E(account).getLocalAddress(),
  ]);

  await eventLoopIteration(); // ensure there's an account to close
  // close the account
  await E(account).close();
  await eventLoopIteration();

  const { bridgeDowncalls: bridgeDowncalls0 } = await inspectDibcBridge();
  t.is(
    bridgeDowncalls0[2].method,
    'startChannelCloseInit',
    'bridge received startChannelCloseInit downcall',
  );

  // reopen the account
  await E(account).reopen();
  await eventLoopIteration();

  const { bridgeDowncalls } = await inspectDibcBridge();
  t.is(
    bridgeDowncalls[3].method,
    'startChannelOpenInit',
    'bridge received startChannelOpenInit to re-establish the channel',
  );

  const getPortAndConnectionIDs = (obj: IBCMethod<'startChannelOpenInit'>) => {
    const { hops, packet } = obj;
    const { source_port: sourcePort } = packet;
    return { hops, sourcePort };
  };

  t.deepEqual(
    getPortAndConnectionIDs(
      bridgeDowncalls[3] as IBCMethod<'startChannelOpenInit'>,
    ),
    getPortAndConnectionIDs(
      bridgeDowncalls[1] as IBCMethod<'startChannelOpenInit'>,
    ),
    'same port and connection id are used to re-stablish the channel',
  );

  const [chainAddress, remoteAddress, localAddress] = await Promise.all([
    E(account).getAddress(),
    E(account).getRemoteAddress(),
    E(account).getLocalAddress(),
  ]);

  t.deepEqual(chainAddress, chainAddress0, 'chain address is unchanged');
  t.notDeepEqual(
    remoteAddress,
    remoteAddress0,
    'remote ibc address is changed',
  );
  t.notDeepEqual(localAddress, localAddress0, 'local ibc address is changed');
  const getChannelID = (lAddr: LocalIbcAddress) =>
    lAddr.split('/ibc-channel/')[1];
  t.not(
    getChannelID(localAddress),
    getChannelID(localAddress0),
    'channel id is changed',
  );
});
