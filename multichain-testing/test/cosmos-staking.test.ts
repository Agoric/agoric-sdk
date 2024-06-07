import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { createWallet } from '../tools/wallet.js';
import { makeQueryClient } from '../tools/query.js';
import { commonSetup } from './support.js';

const test = anyTest as TestFn<Record<string, never>>;

test.failing('send a wallet offer to an orchestration contract', async (t) => {
  const { useChain } = await commonSetup(t);

  const prefix = useChain('agroic').chain.bech32_prefix;
  const wallet = await createWallet(prefix);
  const address = (await wallet.getAccounts())[0].address;
  t.regex(address, /^agroic1/);
  t.log('Made temp agoric wallet:', address);

  const apiUrl = useChain('cosmoshub').getRestEndpoint();
  const _cosmosQueryClient = makeQueryClient(apiUrl);
  t.log('Made query client');

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
