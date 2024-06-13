import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import { prepareRecorderKitMakers } from '@agoric/zoe/src/contractSupport/recorder.js';
import { E, Far } from '@endo/far';
import { commonSetup } from '../supports.js';
import { prepareLocalChainAccountKit } from '../../src/exos/local-chain-account-kit.js';
import { ChainAddress } from '../../src/orchestration-api.js';
import { NANOSECONDS_PER_SECOND } from '../../src/utils/time.js';
import { makeChainHub } from '../../src/utils/chainHub.js';

test('deposit, withdraw', async t => {
  const { bootstrap, brands, utils } = await commonSetup(t);

  const { bld: stake } = brands;

  const { timer, localchain, marshaller, rootZone, storage } = bootstrap;

  t.log('chainInfo mocked via `prepareMockChainInfo` until #8879');

  t.log('exo setup - prepareLocalChainAccountKit');
  const { makeRecorderKit } = prepareRecorderKitMakers(
    rootZone.mapStore('recorder'),
    marshaller,
  );
  const makeLocalChainAccountKit = prepareLocalChainAccountKit(
    rootZone,
    makeRecorderKit,
    // @ts-expect-error mocked zcf. use `stake-bld.contract.test.ts` to test LCA with offer
    Far('MockZCF', {}),
    timer,
    makeChainHub(bootstrap.agoricNames),
  );

  t.log('request account from vat-localchain');
  const lca = await E(localchain).makeAccount();
  const address = await E(lca).getAddress();

  t.log('make a LocalChainAccountKit');
  const { holder: account } = makeLocalChainAccountKit({
    account: lca,
    address,
    storageNode: storage.rootNode.makeChildNode('lcaKit'),
  });

  t.regex(await E(account).getAddress(), /agoric1/);

  const oneHundredStakePmt = await utils.pourPayment(stake.units(100));

  t.log('deposit 100 bld to account');
  const depositResp = await E(account).deposit(oneHundredStakePmt);
  t.true(AmountMath.isEqual(depositResp, stake.units(100)), 'deposit');

  const withdrawal1 = await E(account).withdraw(stake.units(50));
  t.true(
    AmountMath.isEqual(
      await stake.issuer.getAmountOf(withdrawal1),
      stake.units(50),
    ),
  );

  await t.throwsAsync(
    E(account).withdraw(stake.units(51)),
    undefined,
    'fails to overwithdraw',
  );
  await t.notThrowsAsync(
    E(account).withdraw(stake.units(50)),
    'succeeeds at exactly empty',
  );
  await t.throwsAsync(
    E(account).withdraw(stake.make(1n)),
    undefined,
    'fails to overwithdraw',
  );
});

test('delegate, undelegate', async t => {
  const { bootstrap, brands, utils } = await commonSetup(t);

  const { bld } = brands;

  const { timer, localchain, marshaller, rootZone, storage } = bootstrap;

  t.log('exo setup - prepareLocalChainAccountKit');
  const { makeRecorderKit } = prepareRecorderKitMakers(
    rootZone.mapStore('recorder'),
    marshaller,
  );
  const makeLocalChainAccountKit = prepareLocalChainAccountKit(
    rootZone,
    makeRecorderKit,
    // @ts-expect-error mocked zcf. use `stake-bld.contract.test.ts` to test LCA with offer
    Far('MockZCF', {}),
    timer,
    makeChainHub(bootstrap.agoricNames),
  );

  t.log('request account from vat-localchain');
  const lca = await E(localchain).makeAccount();
  const address = await E(lca).getAddress();

  t.log('make a LocalChainAccountKit');
  const { holder: account } = makeLocalChainAccountKit({
    account: lca,
    address,
    storageNode: storage.rootNode.makeChildNode('lcaKit'),
  });

  t.regex(await E(account).getAddress(), /agoric1/);

  await E(account).deposit(await utils.pourPayment(bld.units(100)));

  const validatorAddress = 'agoric1validator1';

  // Because the bridge is fake,
  // 1. these succeed even if funds aren't available
  // 2. there are no return values
  // 3. there are no side-effects such as assets being locked
  await E(account).delegate(validatorAddress, bld.units(999));
  // TODO get the timer to fire so that this promise resolves
  void E(account).undelegate(validatorAddress, bld.units(999));
});

test('transfer', async t => {
  const { bootstrap, brands, utils } = await commonSetup(t);

  const { bld: stake } = brands;

  const { timer, localchain, marshaller, rootZone, storage } = bootstrap;

  t.log('exo setup - prepareLocalChainAccountKit');
  const { makeRecorderKit } = prepareRecorderKitMakers(
    rootZone.mapStore('recorder'),
    marshaller,
  );
  const makeLocalChainAccountKit = prepareLocalChainAccountKit(
    rootZone,
    makeRecorderKit,
    // @ts-expect-error mocked zcf. use `stake-bld.contract.test.ts` to test LCA with offer
    Far('MockZCF', {}),
    timer,
    makeChainHub(bootstrap.agoricNames),
  );

  t.log('request account from vat-localchain');
  const lca = await E(localchain).makeAccount();
  const address = await E(lca).getAddress();

  t.log('make a LocalChainAccountKit');
  const { holder: account } = makeLocalChainAccountKit({
    account: lca,
    address,
    storageNode: storage.rootNode.makeChildNode('lcaKit'),
  });

  t.truthy(account, 'account is returned');
  t.regex(await E(account).getAddress(), /agoric1/);

  const oneHundredStakePmt = await utils.pourPayment(stake.units(100));

  t.log('deposit 100 bld to account');
  const depositResp = await E(account).deposit(oneHundredStakePmt);
  t.true(AmountMath.isEqual(depositResp, stake.units(100)), 'deposit');

  const destination: ChainAddress = {
    chainId: 'cosmoshub-4',
    address: 'cosmos1pleab',
    addressEncoding: 'bech32',
  };

  // TODO #9211, support ERTP amounts
  t.log('ERTP Amounts not yet supported for AmountArg');
  await t.throwsAsync(() => E(account).transfer(stake.units(1), destination), {
    message: 'ERTP Amounts not yet supported',
  });

  t.log('.transfer() 1 bld to cosmos using DenomAmount');
  const transferResp = await E(account).transfer(
    { denom: 'ubld', value: 1_000_000n },
    destination,
  );
  t.is(transferResp, undefined, 'Successful transfer returns Promise<void>.');

  await t.throwsAsync(
    () => E(account).transfer({ denom: 'ubld', value: 504n }, destination),
    {
      message: 'simulated unexpected MsgTransfer packet timeout',
    },
  );

  const unknownDestination: ChainAddress = {
    chainId: 'fakenet',
    address: 'fakenet1pleab',
    addressEncoding: 'bech32',
  };
  await t.throwsAsync(
    () => E(account).transfer({ denom: 'ubld', value: 1n }, unknownDestination),
    { message: /connection not found: agoric-3<->fakenet/ },
    'cannot create transfer msg with unknown chainId',
  );

  await t.notThrowsAsync(
    () =>
      E(account).transfer({ denom: 'ubld', value: 10n }, destination, {
        memo: 'hello',
      }),
    'can create transfer msg with memo',
  );
  // TODO, intercept/spy the bridge message to see that it has a memo

  await t.notThrowsAsync(
    () =>
      E(account).transfer({ denom: 'ubld', value: 10n }, destination, {
        // sets to current time, which shouldn't work in a real env
        timeoutTimestamp: BigInt(new Date().getTime()) * NANOSECONDS_PER_SECOND,
      }),
    'accepts custom timeoutTimestamp',
  );

  await t.notThrowsAsync(
    () =>
      E(account).transfer({ denom: 'ubld', value: 10n }, destination, {
        timeoutHeight: { revisionHeight: 100n, revisionNumber: 1n },
      }),
    'accepts custom timeoutHeight',
  );
});
