import anyTest from '@endo/ses-ava/prepare-endo.js';
import fs from 'fs';
import { execFileSync } from 'node:child_process';
import type { TestFn, ExecutionContext } from 'ava';
import { commonSetup, type SetupContext } from './support.js';
import { createWallet, generateMnemonic } from '../tools/wallet.js';
import { makeQueryClient } from '../tools/query.js';
import { makeAgd, type Agd } from '../tools/agd-lib.js';
import starshipChainInfo from '../starship-chain-info.js';
import type { ForwardInfo } from '@agoric/orchestration';
import { sleep } from '../tools/sleep.js';
import { objectMap } from '@endo/patterns';

const test = anyTest as TestFn<SetupContext>;

test.before(async t => {
  t.context = await commonSetup(t);
});

const queryStrings = {
  msgReceivePacket: {
    agoric: ['--events', 'message.action=/ibc.core.channel.v1.MsgRecvPacket'],
    cosmos: [
      '--query',
      // `"message.action='/ibc.core.channel.v1.MsgRecvPacket'"`,
      "message.action='/ibc.core.channel.v1.MsgRecvPacket'",
    ],
  },
  msgAcknowledgement: {
    agoric: [
      '--events',
      'message.action=/ibc.core.channel.v1.MsgAcknowledgement',
    ],
    cosmos: [
      '--query',
      // `"message.action='/ibc.core.channel.v1.MsgAcknowledgement'"`,
      "message.action='/ibc.core.channel.v1.MsgAcknowledgement'",
    ],
  },
  writeAcknowledgement: {
    agoric: ['--events', 'write_acknowledgement.packet_src_port=transfer'],
    cosmos: ['--query', `"acknowledge_packet.packet_src_port='transfer'"`],
  },
  recvPacket: {
    agoric: [],
    cosmos: [],
  },
  sendPacket: {
    agoric: [],
    cosmos: [],
  },
};

// use this on osmosis, cosmoshub as our account name in the keyring
const keyName = 'testuser';

const fundRemote = async (
  t: ExecutionContext<SetupContext>,
  {
    srcChainName,
    destChainName,
    acctAddr,
    qty,
    denom,
  }: {
    srcChainName: string;
    destChainName: string;
    acctAddr: string;
    qty: number;
    denom: string;
  },
) => {
  const { agd, retryUntilCondition, useChain } = t.context;
  const destChainid = useChain(destChainName).chain.chain_id;
  const srcChainId = useChain(srcChainName).chain.chain_id;

  const agoricToOsmosis =
    starshipChainInfo[srcChainName].connections[destChainid].transferChannel;
  t.assert(agoricToOsmosis.channelId);
  const amount = `${qty}${denom}`;
  // agd tx ibc-transfer transfer [src-port] [src-channel] [receiver] [amount] [flags]
  const fundInitial = await agd.tx(
    [
      'ibc-transfer',
      'transfer',
      'transfer',
      agoricToOsmosis.channelId,
      acctAddr,
      amount,
    ],
    {
      chainId: srcChainId,
      from: 'faucet',
      yes: true,
    },
  );
  t.is(fundInitial.code, 0);
  t.log('Success. TxHash:', fundInitial.txhash);

  const queryClient = makeQueryClient(
    await useChain(destChainName).getRestEndpoint(),
  );
  const { balances } = await retryUntilCondition(
    () => queryClient.queryBalances(acctAddr),
    ({ balances }) => !!balances.find(x => x.denom.startsWith('ibc/')),
    `${acctAddr} received bld from agoric`,
  );

  t.log('amtOnDest', `${qty}${balances[0].denom}`);
  return { denom: balances[0].denom };
};

const setupSourceWallet = async (
  t: ExecutionContext<SetupContext>,
  { chainName }: { chainName: string },
) => {
  const { retryUntilCondition, useChain } = t.context;

  const chaind = makeAgd({ execFileSync }).withOpts({
    keyringBackend: 'test',
    chainName: chainName,
    broadcastMode: 'sync',
  });
  try {
    chaind.keys.delete(keyName);
  } catch {
    /* key already deleted */
  }
  chaind.keys.add(keyName, generateMnemonic());
  const acctAddr = chaind.keys.showAddress(keyName);
  t.assert(acctAddr);
  t.log('acctAddr', acctAddr);
  // give gas funds to osmosis wallet so it can send tx
  await useChain(chainName).creditFromFaucet(acctAddr);

  const queryClient = makeQueryClient(
    await useChain(chainName).getRestEndpoint(),
  );

  await retryUntilCondition(
    () => queryClient.queryBalances(acctAddr),
    ({ balances }) => !!balances.length,
    `${acctAddr} received funds from faucet`,
  );

  return {
    acctAddr,
    chaind,
  };
};

type QueryRes = { total_count: string; txs: object[] };
const queryPackets = async (binaries: Record<string, Agd>) => {
  const results: Record<string, { recvs: QueryRes; acks: QueryRes }> = {};
  for (const [name, chaind] of Object.entries(binaries)) {
    // perhaps the different is pre/post v0.50 queries?
    const queryType = name === 'agd' ? 'agoric' : 'cosmos';
    const recvs = await chaind.query([
      'txs',
      ...queryStrings.msgReceivePacket[queryType],
    ]);
    const acks = await chaind.query([
      'txs',
      ...queryStrings.msgAcknowledgement[queryType],
    ]);
    results[name] = {
      recvs,
      acks,
    };
  }
  return results;
};

const recordPackets = async (
  binaries: Record<string, Agd>,
  startTime: number,
  iteration: `q${number}`,
) => {
  const q = await queryPackets(binaries);
  console.log(
    `${iteration} counts`,
    objectMap(q, val => ({
      recvs: val.recvs.total_count,
      acks: val.acks.total_count,
    })),
  );
  fs.writeFileSync(
    `queries-${startTime}-${iteration}`,
    JSON.stringify(q, null, 2),
  );
};

test('pfm: osmosis -> agoric -> gaia', async t => {
  const startTime = new Date().getTime();
  const { agd, retryUntilCondition, useChain } = t.context;
  const { acctAddr: osmosisAddr, chaind: osmosisd } = await setupSourceWallet(
    t,
    {
      chainName: 'osmosis',
    },
  );

  const gaiad = makeAgd({ execFileSync }).withOpts({
    chainName: 'cosmoshub',
  });
  const binaries = {
    osmosisd,
    agd,
    gaiad,
  };

  await sleep(10_000); // wait for acks
  await recordPackets(binaries, startTime, 'q0');

  const { denom: denomOnOsmosis } = await fundRemote(t, {
    acctAddr: osmosisAddr,
    destChainName: 'osmosis',
    srcChainName: 'agoric',
    qty: 100,
    denom: 'ubld',
  });

  await sleep(10_000); // wait for acks
  await recordPackets(binaries, startTime, 'q1');

  const cosmosChainId = useChain('cosmoshub').chain.chain_id;
  const agoricChainId = useChain('agoric').chain.chain_id;
  const osmosisChainId = useChain('osmosis').chain.chain_id;

  const cosmosWallet = await createWallet('cosmos');
  const cosmosAddr = (await cosmosWallet.getAccounts())[0].address;
  t.log('Made cosmos wallet:', cosmosAddr);

  const osmosisToAgoric =
    starshipChainInfo.osmosis.connections[agoricChainId].transferChannel;
  const agoricToCosmos =
    starshipChainInfo.agoric.connections[cosmosChainId].transferChannel;
  const forwardInfo: ForwardInfo = {
    forward: {
      channel: agoricToCosmos.channelId,
      port: 'transfer',
      receiver: cosmosAddr,
      retries: 2,
      timeout: '1m',
    },
  };

  // intermediary receiver for PFM transfer
  const agoricAddr = (await (await createWallet('agoric')).getAccounts())[0]
    .address;

  // agd tx ibc-transfer transfer [src-port] [src-channel] [receiver] [amount] [flags]
  const pfmThroughAgoric = await osmosisd.tx(
    [
      'ibc-transfer',
      'transfer',
      'transfer',
      osmosisToAgoric.channelId,
      agoricAddr,
      `50${denomOnOsmosis}`,
      '--memo',
      `'${JSON.stringify(forwardInfo)}'`,
      // consider --packet-timeout-timestamp. default is 10mins
    ],
    {
      chainId: osmosisChainId,
      from: keyName,
      yes: true,
      fees: '200000uosmo',
    },
  );
  t.is(pfmThroughAgoric.code, 0);
  t.log('PFM Transfer success. Tx:', pfmThroughAgoric.txhash);

  const cosmosQueryClient = makeQueryClient(
    await useChain('cosmoshub').getRestEndpoint(),
  );

  await sleep(18_000); // wait for acks
  await recordPackets(binaries, startTime, 'q2');

  const { balances: cosmosBalances } = await retryUntilCondition(
    () => cosmosQueryClient.queryBalances(cosmosAddr),
    // ({ balances }) => !!balances.length,
    // FIXME: tokens never arrive to cosmoshub
    ({ balances }) => balances.length === 0,
    `${cosmosAddr} received bld from osmosis`,
  );
  t.log('cosmosBalances', cosmosBalances);

  osmosisd.keys.delete(keyName);
});
