import anyTest, { LogFn, TestFn } from 'ava';
import { setup } from './setup.js';
import { createWallet } from './wallet.js';
import { makeQueryClient } from './query.js';

const sleep = (ms: number, log?: LogFn) =>
  new Promise(resolve => {
    if (log) log(`Sleeping for ${ms}ms...`);
    setTimeout(resolve, ms);
  });

const test = anyTest as TestFn<Record<string, never>>;

test('assets can be retrieved from config', async t => {
  const { useChain } = await setup();

  t.like(useChain('osmosis').chainInfo.nativeAssetList.assets, [
    {
      base: 'uosmo',
    },
    {
      base: 'uion',
    },
  ]);

  t.like(useChain('cosmos').chainInfo.nativeAssetList.assets, [
    {
      base: 'uatom',
    },
  ]);
});

test.only('staking info can be retrieved from config', async t => {
  const { useChain } = await setup();

  t.like(useChain('osmosis').chain.staking, {
    staking_tokens: [{ denom: 'uosmo' }],
    lock_duration: { time: '1209600s' },
  });

  t.like(useChain('cosmos').chain.staking, {
    staking_tokens: [{ denom: 'uatom' }],
    lock_duration: { time: '1209600s' },
  });
});

test('create a wallet and get tokens', async t => {
  const { useChain } = await setup();

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

test.failing('send a wallet offer to an orchestration contract', async t => {
  const { useChain } = await setup();

  const prefix = useChain('agroic').chain.bech32_prefix;
  const wallet = await createWallet(prefix);
  const address = (await wallet.getAccounts())[0].address;
  t.regex(address, /^agroic1/);
  t.log('Made temp agoric wallet:', address);

  t.log('todo: make agoric smart wallet connection');
  // FIXME SyntaxError: The requested module '@agoric/web-components' does not provide an export named 'agoricConverters'
  // const connection = await makeSmartWalletConnection({
  //   apiUrl: useChain('agroic').getRestEndpoint(),
  //   rpcUrl: useChain('agroic').getRpcEndpoint(),
  //   chainName: useChain('agroic').chainInfo.chainName,
  //   aminoSigner: wallet,
  //   address,
  // });

  t.log('todo: send faucet funds to smart wallet user');
  // confirm that faucet: true for agoric works
  // alternatively, create a wallet w genesis key (useChain('agoric').getGenesisMnemonic()) and send funds from there

  t.log('todo: provision smart wallet');
  // connection.provisionSmartWallet();

  t.log('todo: stake atom makeAcountInvitationMaker offer');
  // await connection.makeOffer(
  //   {
  //     source: 'agoricContract',
  //     instancePath: ['stakeAtom'],
  //     callPipe: [['makeAcountInvitationMaker']],
  //   },
  //   {}, // empty proposal
  //   { exampleArg: 'foo' },
  //   ({ status, data }) => {
  //     if (status === 'error') {
  //       t.fail(data);
  //     }
  //     if (status === 'seated') {
  //       console.log('Transaction submitted:', data.txn);
  //       console.log('Offer id:', data.offerId); // persist for continuing inv.
  //       console.log('Offer status:', data.status);
  //     }
  //     if (status === 'refunded') {
  //       console.log('Offer refunded');
  //     }
  //     if (status === 'accepted') {
  //       console.log('Offer accepted');
  //     }
  //   },
  // );

  t.log('todo: get chain address from vstorage');
  // XXX need to publish address in vstorage, or return in offer result. contract doesn't currently do this
  // for now, we might consider querying cosmos' ports since there aren't many of them.

  t.log('todo: send funds from faucet to ICA');
  // useChain('gaia').creditFromFaucet(address);

  t.log('todo: Delegate offer with continuing inv');
  // await connection.makeOffer()...
});

test.todo('sign and broadcast a wallet transaction');
