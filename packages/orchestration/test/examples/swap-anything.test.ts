import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import { makeRatio } from '@agoric/ertp/src/ratio.js';
import * as contractExports from '../../src/examples/swap-anything.contract.js';
import { commonSetup } from '../supports.js';

const contractName = 'swap-anything';
type StartFn = typeof contractExports.start;

const bootstrapOrchestration = async t => {
  t.log('bootstrap, orchestration core-eval');
  const {
    bootstrap,
    commonPrivateArgs,
    brands: { bld },
    utils: {
      inspectLocalBridge,
      pourPayment,
      transmitTransferAck,
      populateChainHub,
    },
  } = await commonSetup(t);
  const vt = bootstrap.vowTools;

  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  t.log('contract coreEval', contractName);

  const installation: Installation<StartFn> =
    await bundleAndInstall(contractExports);

  const storageNode = await E(bootstrap.storage.rootNode).makeChildNode(
    contractName,
  );

  populateChainHub();

  const swapKit = await E(zoe).startInstance(
    installation,
    { BLD: bld.issuer },
    {},
    { ...commonPrivateArgs, storageNode },
  );

  return {
    bootstrap,
    commonPrivateArgs,
    bld,
    inspectLocalBridge,
    pourPayment,
    transmitTransferAck,
    vt,
    zoe,
    installation,
    storageNode,
    swapKit,
  };
};

test('swap BLD for Osmo, receiver on Agoric', async t => {
  const {
    vt,
    swapKit,
    zoe,
    pourPayment,
    bld,
    transmitTransferAck,
    inspectLocalBridge,
  } = await bootstrapOrchestration(t);

  const publicFacet = await E(zoe).getPublicFacet(swapKit.instance);
  const inv = E(publicFacet).makeSendInvitation();
  const amt = await E(zoe).getInvitationDetails(inv);
  t.is(amt.description, 'swap');

  const anAmt = bld.units(3.5);
  const Send = await pourPayment(anAmt);
  const userSeat = await E(zoe).offer(
    inv,
    { give: { Send: anAmt } },
    { Send },
    {
      destAddr: 'hot1destAddr',
      receiverAddr: 'osmosis1xcsaddr',
      outDenom: 'uosmo',
      onFailedDelivery: 'doNothing',
      slippage: {
        slippageRatio: makeRatio(10n, bld.brand),
        windowSeconds: 10n,
      },
    },
  );
  await transmitTransferAck();
  await vt.when(E(userSeat).getOfferResult());

  const history = inspectLocalBridge();
  t.log(history);
  t.like(history, [
    { type: 'VLOCALCHAIN_ALLOCATE_ADDRESS' },
    { type: 'VLOCALCHAIN_EXECUTE_TX' },
  ]);

  t.like(
    history.find(x => x.type === 'VLOCALCHAIN_EXECUTE_TX')?.messages?.[0],
    {
      '@type': '/ibc.applications.transfer.v1.MsgTransfer',
      receiver: 'hot1destAddr',
      sender: 'agoric1fakeLCAAddress',
      memo: '',
    },
    'crosschain swap sent',
  );
});
