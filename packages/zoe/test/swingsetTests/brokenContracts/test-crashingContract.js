import '@agoric/install-metering-and-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import { loadBasedir, buildVatController } from '@agoric/swingset-vat';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import fs from 'fs';

const CONTRACT_FILES = ['crashingAutoRefund'];
const generateBundlesP = Promise.all(
  CONTRACT_FILES.map(async contract => {
    const bundle = await bundleSource(`${__dirname}/${contract}`);
    const obj = { bundle, contract };
    fs.writeFileSync(
      `${__dirname}/bundle-${contract}.js`,
      `export default ${JSON.stringify(obj)};`,
    );
  }),
);

async function main(argv) {
  const config = await loadBasedir(__dirname);
  await generateBundlesP;
  const controller = await buildVatController(config, argv);
  await controller.run();
  return controller.dump();
}

const meterExceededInOfferLog = [
  '=> alice is set up',
  '=> alice.doMeterExceptionInHook called',
  'outcome correctly resolves to broken: RangeError: Allocate meter exceeded',
  'aliceMoolaPurse: balance {"brand":{},"value":3}',
  'aliceSimoleanPurse: balance {"brand":{},"value":0}',
  'contract no longer responds: RangeError: Allocate meter exceeded',
  'counter: 2',
];

test('ZCF metering crash on invitation exercise', async t => {
  t.plan(1);
  try {
    const dump = await main(['meterInOfferHook', [3, 0, 0]]);
    t.deepEquals(dump.log, meterExceededInOfferLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected metering exception in crashing contract test');
  }
});

const meterExceededInSecondOfferLog = [
  '=> alice is set up',
  '=> alice.doMeterExceptionInHook called',
  'Swap outcome resolves to an invitation: [Presence o-73]',
  'aliceMoolaPurse: balance {"brand":{},"value":0}',
  'aliceSimoleanPurse: balance {"brand":{},"value":0}',
  'aliceMoolaPurse: balance {"brand":{},"value":5}',
  'aliceSimoleanPurse: balance {"brand":{},"value":0}',
  'swap value, 5',
  'outcome correctly resolves to broken: RangeError: Allocate meter exceeded',
  'contract no longer responds: RangeError: Allocate meter exceeded',
  'aliceMoolaPurse: balance {"brand":{},"value":8}',
  'aliceSimoleanPurse: balance {"brand":{},"value":0}',
  'refund value, 8',
  'counter: 2',
];

test('ZCF metering crash on invitation exercise', async t => {
  t.plan(1);
  try {
    const dump = await main(['meterInSecondInvitation', [8, 0, 0]]);
    t.deepEquals(dump.log, meterExceededInSecondOfferLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected metering exception in crashing contract test');
  }
});

const throwInOfferLog = [
  '=> alice is set up',
  '=> alice.doThrowInHook called',
  'counter: 2',
  'counter: 4',
  'outcome correctly resolves to broken: Error: someException',
  'aliceMoolaPurse: balance {"brand":{},"value":3}',
  'aliceSimoleanPurse: balance {"brand":{},"value":0}',
  'counter: 5',
  'newCounter: 2',
  'Successful refund: The offer was accepted',
  'new Purse: balance {"brand":{},"value":3}',
  'aliceSimoleanPurse: balance {"brand":{},"value":0}',
  'counter: 7',
];

test('ZCF throwing on invitation exercise', async t => {
  t.plan(1);
  try {
    const dump = await main(['throwInOfferHook', [3, 0, 0]]);
    t.deepEquals(dump.log, throwInOfferLog);
  } catch (e) {
    t.isNot(e, e, 'unexpected throw in crashing contract test');
  }
});

const throwInAPILog = [
  '=> alice is set up',
  '=> alice.doThrowInApiCall called',
  'counter: 3',
  'throwingAPI should throw Error: someException',
  'counter: 5',
  'counter: 6',
  'Swap outcome is an invitation (true).',
  'newCounter: 2',
  'counter: 7',
  'outcome correctly resolves: "The offer has been accepted. Once the contract has been completed, please check your payout"',
  'aliceMoolaPurse: balance {"brand":{},"value":3}',
  'aliceSimoleanPurse: balance {"brand":{},"value":8}',
  'second moolaPurse: balance {"brand":{},"value":2}',
  'second simoleanPurse: balance {"brand":{},"value":4}',
];

test('ZCF throwing in API call', async t => {
  t.plan(1);
  try {
    const dump = await main(['throwInApiCall', [5, 12, 0]]);
    t.deepEquals(dump.log, throwInAPILog);
  } catch (e) {
    t.isNot(e, e, 'unexpected API throw in crashing contract test');
  }
});

const meteringExceededInAPILog = [
  '=> alice is set up',
  '=> alice.doMeterInApiCall called',
  'counter: 2',
  'counter: 3',
  'counter: 5',
  'Vat correctly died for RangeError: Allocate meter exceeded',
  'outcome correctly resolves to "The offer was accepted"',
  'aliceMoolaPurse: balance {"brand":{},"value":3}',
  'aliceSimoleanPurse: balance {"brand":{},"value":0}',
  'contract no longer responds: RangeError: Allocate meter exceeded',
  'newCounter: 2',
];

test('ZCF metering crash in API call', async t => {
  t.plan(1);
  try {
    const dump = await main(['meterInApiCall', [3, 0, 0]]);
    t.deepEquals(dump.log, meteringExceededInAPILog);
  } catch (e) {
    t.isNot(
      e,
      e,
      'unexpected API metering exception in crashing contract test',
    );
  }
});

const meteringExceptionInMakeContractILog = [
  '=> alice is set up',
  '=> alice.doMeterExceptionInMakeContract called',
  'contract creation failed: RangeError: Allocate meter exceeded',
  'newCounter: 2',
];

test('ZCF metering crash in makeContract call', async t => {
  t.plan(1);
  try {
    const dump = await main(['meterInMakeContract', [3, 0, 0]]);
    t.deepEquals(dump.log, meteringExceptionInMakeContractILog);
  } catch (e) {
    t.isNot(
      e,
      e,
      'unexpected API metering exception in crashing contract test',
    );
  }
});

const thrownExceptionInMakeContractILog = [
  '=> alice is set up',
  '=> alice.doThrowInMakeContract called',
  'contract creation failed: Error: blowup in makeContract',
  'newCounter: 2',
];

test('ZCF metering crash in makeContract call', async t => {
  t.plan(1);
  try {
    const dump = await main(['throwInMakeContract', [3, 0, 0]]);
    t.deepEquals(dump.log, thrownExceptionInMakeContractILog);
  } catch (e) {
    t.isNot(
      e,
      e,
      'unexpected API metering exception in crashing contract test',
    );
  }
});
