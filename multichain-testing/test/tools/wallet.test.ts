import anyTest, { TestFn } from 'ava';
import { makeQueryClient } from '../../tools/query.js';
import { createWallet } from '../../tools/wallet.js';
import { sleep } from '../../tools/sleep.js';
import { commonSetup } from '../support.js';

const test = anyTest as TestFn<Record<string, never>>;

test('create a wallet and get tokens', async (t) => {
  const { useChain } = await commonSetup();

  const prefix = useChain('osmosis').chain.bech32_prefix;
  const wallet = await createWallet(prefix);
  const addr = (await wallet.getAccounts())[0].address;
  t.regex(addr, /^osmo1/);
  t.log('Made temp wallet:', addr);

  const apiUrl = useChain('osmosis').getRestEndpoint();
  const queryClient = makeQueryClient(apiUrl);
  t.log('Made query client');

  const { balances } = await queryClient.queryBalances(addr);
  t.log('Beginning balances:', balances);
  t.deepEqual(balances, []);

  const osmosisFaucet = useChain('osmosis').creditFromFaucet;
  t.log('Requeting faucet funds');
  await osmosisFaucet(addr);
  await sleep(1000, t.log); // needed to avoid race condition

  const { balances: updatedBalances } = await queryClient.queryBalances(addr);
  t.like(updatedBalances, [{ denom: 'uosmo', amount: '10000000000' }]);
  t.log('Updated balances:', updatedBalances);

  const bondDenom =
    useChain('osmosis').chain.staking?.staking_tokens?.[0].denom;
  if (!bondDenom) throw new Error('Bond denom not found.');
  const { balance } = await queryClient.queryBalance(addr, bondDenom);
  t.deepEqual(balance, { denom: bondDenom, amount: '10000000000' });
});
