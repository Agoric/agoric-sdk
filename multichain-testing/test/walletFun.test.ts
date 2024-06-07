import anyTest from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';
import { generateMnemonic } from '../tools/wallet.js';
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

test('provision smart wallet', async (t) => {
  const { addKey, provisionSmartWallet, makeQueryTool } = t.context;
  const res = await addKey(KEYS[0], generateMnemonic());

  const { address } = JSON.parse(res);
  t.log('address', address);

  const wallet = await provisionSmartWallet(address, { BLD: 10n });
  t.log('wallet', wallet);

  const queryClient = makeQueryTool();

  const walletCurrent = await queryClient.queryData(
    `published.wallet.${address}.current`,
  );

  t.like(walletCurrent, { liveOffers: [], offerToPublicSubscriberPaths: [] });
});
