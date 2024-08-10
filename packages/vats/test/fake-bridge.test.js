import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { makeHeapZone } from '@agoric/zone';
import { E } from '@endo/far';
import { buildRootObject as buildBankVatRoot } from '../src/vat-bank.js';
import { makeFakeBankBridge } from '../tools/fake-bridge.js';

const issuerKit = makeIssuerKit('IST');
const stable = withAmountUtils(issuerKit);
const ten = stable.units(10);

test('balances', async t => {
  const zone = makeHeapZone();

  const bankBridge = makeFakeBankBridge(zone, {
    balances: {
      faucet: { uist: 999999999n },
      agoric1fakeBridgeAddress: { uist: ten.value },
    },
  });

  const bankManager = await buildBankVatRoot(
    undefined,
    undefined,
    zone.mapStore('bankManager'),
  ).makeBankManager(bankBridge);

  await E(bankManager).addAsset('uist', 'IST', 'Inter Stable Token', issuerKit);

  const faucet = await E(bankManager).getBankForAddress('faucet');
  const tenIst = await E(E(faucet).getPurse(issuerKit.brand)).withdraw(ten);

  const bank = await E(bankManager).getBankForAddress(
    'agoric1fakeBridgeAddress',
  );

  const istPurse = await E(bank).getPurse(issuerKit.brand);
  t.like(await E(istPurse).getCurrentAmount(), ten);

  await E(istPurse).deposit(tenIst);
  await E(istPurse).withdraw(ten);

  t.like(await E(istPurse).getCurrentAmount(), ten);
  await E(istPurse).withdraw(ten);

  t.like(await E(istPurse).getCurrentAmount(), stable.makeEmpty());
});
