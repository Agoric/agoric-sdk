import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { generateMnemonic } from '../tools/wallet.js';
import { makeQueryClient } from '../tools/query.js';
import { commonSetup } from './support.js';

const test = anyTest as TestFn<Awaited<ReturnType<typeof commonSetup>>>;

const KEYS = ['user1'];

const deleteKeys = async (deleteKey: (name: string) => Promise<string>) => {
  for (const key of KEYS) {
    try {
      await deleteKey(key);
    } catch (_e) {
      // ignore
    }
  }
};

test.before(async (t) => {
  t.context = await commonSetup(t);
  const { deleteKey } = t.context;
  await deleteKeys(deleteKey);
});

test.after(async (t) => {
  const { deleteKey } = t.context;
  await deleteKeys(deleteKey);
});

test('send a wallet offer to an orchestration contract', async (t) => {
  const { addKey, provisionSmartWallet, useChain } = await commonSetup(t);

  const apiUrl = useChain('cosmoshub').getRestEndpoint();
  const _cosmosQueryClient = makeQueryClient(apiUrl);
  t.log('Made query client');

  const res = await addKey(KEYS[0], generateMnemonic());
  const { address } = JSON.parse(res);
  const _wallet = await provisionSmartWallet(address, {
    BLD: 100n,
    IST: 100n,
  });
  t.log('provisioning agoric smart wallet');

  const agQueryClient = makeQueryClient(useChain('agoric').getRestEndpoint());
  const { balances } = await agQueryClient.queryBalances(address);
  t.deepEqual(
    balances,
    [
      { denom: 'ubld', amount: '90000000' },
      { denom: 'uist', amount: '100250000' },
    ],
    'faucet request minus 10 BLD and 0.25 IST wallet provisioning fees',
  );
  t.log('smart wallet created with funds');

  // const doOffer = makeDoOffer(wallet);
  t.log('todo: stake atom makeAcountInvitationMaker offer');
  // const offerId = `makeAccount-${Date.now()}`;
  // const offerResult = await doOffer({
  //   id: offerId,
  //   invitationSpec: {
  //     source: 'agoricContract',
  //     instancePath: ['stakeAtom'],
  //     // update to `makeAccountInvitationMaker`
  //     callPipe: [['makeAcountInvitationMaker']],
  //   },
  //   proposal: {},
  // });

  // t.log('offerResult', offerResult);
  // t.truthy(offerResult);

  t.log('todo: get chain address from vstorage or offer result');
  // XXX need to publish address in vstorage, or return in offer result. contract doesn't currently do this
  // for now, we might consider querying cosmos' ports since there aren't many of them.

  t.log('todo: send funds from faucet to ICA');
  // useChain('gaia').creditFromFaucet(address);

  t.log('todo: Delegate offer with continuing inv');
  // await connection.makeOffer()...
});

test.todo('sign and broadcast a wallet transaction');
