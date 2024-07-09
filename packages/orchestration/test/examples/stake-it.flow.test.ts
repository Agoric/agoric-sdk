import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import path from 'path';
import { VTRANSFER_IBC_EVENT } from '@agoric/internal';
import { commonSetup } from '../supports.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractName = 'stake-it';
const contractFile = `${dirname}/../../src/examples/${contractName}/${contractName}.flow.js`;
type StartFn =
  typeof import('../../src/examples/stake-it/stake-it.flow.js').start;

test('stake-it - make accounts, register tap, return invitationMakers', async t => {
  t.log('bootstrap, orchestration core-eval');
  const {
    bootstrap: { storage },
    commonPrivateArgs,
    mocks: { transferBridge },
    utils: { inspectLocalBridge },
  } = await commonSetup(t);

  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  t.log('contract coreEval', contractName);

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);

  const storageNode = await E(storage.rootNode).makeChildNode(contractName);
  const stakeItKit = await E(zoe).startInstance(
    installation,
    undefined,
    {},
    { ...commonPrivateArgs, storageNode },
  );

  const publicFacet = await E(zoe).getPublicFacet(stakeItKit.instance);
  const inv = E(publicFacet).makeAccountsInvitation();
  const userSeat = E(zoe).offer(inv, {}, undefined, {
    chainName: 'cosmoshub',
    validator: {
      chainId: 'cosmoshub-4',
      address: 'cosmosvaloper1test',
      addressEncoding: 'bech32',
    },
    // TODO user supplied until #9211
    localDenom: 'ibc/fakeuatomhash',
    remoteDenom: 'uatom',
  });
  const result = await E(userSeat).getOfferResult();
  t.log('result', result);
  // const history = inspectLocalBridge();
  // t.log('@@@history', history);

  // 1. get addresses from vstorage
  // 2. set faucet funds to LCA address
  // 3. Mock Tap (transfer +delegate)
  // simulate incoming transfer with upcall from golang to VM
  await E(transferBridge).fromBridge({
    event: 'writeAcknowledgement',
    /// XXX this should be /ibc.core.channel.v1.MsgRecvPacket containing
    // a MsgTransfer msg
    packet: 'a packet',
    target: 'agoric1fakeLCAAddress', // TODO get from vstorage
    type: VTRANSFER_IBC_EVENT,
  });
  // XXX verify something happened.. inspect IBC Bridge events?
});
