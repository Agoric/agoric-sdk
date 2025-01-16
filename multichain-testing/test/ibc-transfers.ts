import anyTest from '@endo/ses-ava/prepare-endo.js';
import { execFileSync } from 'node:child_process';
import type { TestFn, ExecutionContext } from 'ava';
import { commonSetup, type SetupContext } from './support.js';
import { createWallet, generateMnemonic } from '../tools/wallet.js';
import { makeQueryClient } from '../tools/query.js';
import { makeAgd } from '../tools/agd-lib.js';
import starshipChainInfo from '../starship-chain-info.js';
import type { ForwardInfo } from '@agoric/orchestration';

const test = anyTest as TestFn<SetupContext>;

test.before(async t => {
  t.context = await commonSetup(t);
});

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

test('pfm: osmosis -> agoric -> gaia', async t => {
  const { retryUntilCondition, useChain } = t.context;

  const { acctAddr: osmosisAddr, chaind: osmosisd } = await setupSourceWallet(
    t,
    {
      chainName: 'osmosis',
    },
  );
  const { denom: denomOnOsmosis } = await fundRemote(t, {
    acctAddr: osmosisAddr,
    destChainName: 'osmosis',
    srcChainName: 'agoric',
    qty: 100,
    denom: 'ubld',
  });

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

  // agd tx ibc-transfer transfer [src-port] [src-channel] [receiver] [amount] [flags]
  const pfmThroughAgoric = await osmosisd.tx(
    [
      'ibc-transfer',
      'transfer',
      'transfer',
      osmosisToAgoric.channelId,
      'agoric1ujmk0492mauq2f2vrcn7ylq3w3x55k0ap9mt2p', // consider using an agoric intermediary address
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
  const { balances: cosmosBalances } = await retryUntilCondition(
    () => cosmosQueryClient.queryBalances(cosmosAddr),
    ({ balances }) => !!balances.length,
    `${cosmosAddr} received bld from osmosis`,
  );
  t.log('cosmosBalances', cosmosBalances);
  // osmosisd.keys.delete(keyName);
});
