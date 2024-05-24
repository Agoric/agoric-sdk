import { makeIssuerKit } from '@agoric/ertp';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { prepareLocalChainTools } from '@agoric/vats/src/localchain.js';
import { buildRootObject as buildBankVatRoot } from '@agoric/vats/src/vat-bank.js';
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { makeHeapZone } from '@agoric/zone';
import { E } from '@endo/far';
import path from 'path';
import { makeFakeLocalchainBridge } from '../supports.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractFile = `${dirname}/../../src/examples/unbondExample.contract.js`;
type StartFn =
  typeof import('@agoric/orchestration/src/examples/unbondExample.contract.js').start;

test('start', async t => {
  const issuerKit = makeIssuerKit('IST');
  const stable = withAmountUtils(issuerKit);
  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);

  const zone = makeHeapZone();
  const { makeLocalChain } = prepareLocalChainTools(zone.subZone('localchain'));
  const bankManager = await buildBankVatRoot(
    undefined,
    undefined,
    zone.mapStore('bankManager'),
  ).makeBankManager();

  await E(bankManager).addAsset('uist', 'IST', 'Inter Stable Token', issuerKit);

  const localchainBridge = makeFakeLocalchainBridge(zone);

  const localchain = makeLocalChain({
    bankManager,
    system: localchainBridge,
  });

  const storage = makeFakeStorageKit('mockChainStorageRoot', {
    sequence: false,
  });

  const privateArgs = {
    localchain,
    orchestrationService: null as any,
    storageNode: storage.rootNode,
    timerService: null as any,
    zone,
  };

  const { publicFacet } = await E(zoe).startInstance(
    installation,
    { Stable: stable.issuer },
    {},
    privateArgs,
  );

  const inv = E(publicFacet).makeUnbondAndLiquidStakeInvitation();

  t.is(
    (await E(zoe).getInvitationDetails(inv)).description,
    'Unbond and liquid stake',
  );

  const userSeat = await E(zoe).offer(
    inv,
    {},
    {},
    { validator: 'agoric1valopsfufu' },
  );
  const result = await E(userSeat).getOfferResult();
  t.is(result, undefined);
});
