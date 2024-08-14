import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import { heapVowE } from '@agoric/vow/vat.js';
import path from 'path';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { MsgDelegateResponse } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { IBCEvent } from '@agoric/vats';
import { isTelescopeGeneratedType } from '@cosmjs/proto-signing/build/registry.js';
import { ContinuingOfferResult } from '@agoric/smart-wallet/src/types.js';
import { commonSetup } from '../supports.js';
import {
  buildMsgResponseString,
  buildVTransferEvent,
} from '../../tools/ibc-mocks.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractName = 'orca';
const contractFile = `${dirname}/../../src/examples/${contractName}.contract.js`;
type StartFn = typeof import('../../src/examples/orca.contract.js').start;

test('orca - makeCreateAndFundInvitation', async t => {
  t.log('bootstrap, orchestration core-eval');
  const {
    brands: { bld },
    bootstrap: { storage },
    commonPrivateArgs,
    mocks: { transferBridge },
    utils: {
      inspectLocalBridge,
      inspectDibcBridge,
      pourPayment,
      transmitTransferAck,
    },
  } = await commonSetup(t);

  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  t.log('contract coreEval', contractName);
  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);
  const storageNode = await E(storage.rootNode).makeChildNode(contractName);
  const orcaKit = await E(zoe).startInstance(
    installation,
    { BLD: bld.issuer },
    {},
    { ...commonPrivateArgs, storageNode },
  );
  const publicFacet = await E(zoe).getPublicFacet(orcaKit.instance);

  // make an offer to create an LocalOrchAcct and a CosmosOrchAccount
  const inv = E(publicFacet).makeCreateAndFundInvitation();

  const hundredBld = bld.make(100n);
  const hundredBldPmt = await pourPayment(hundredBld);

  const userSeat = E(zoe).offer(
    inv,
    { give: { BLD: hundredBld } },
    { BLD: hundredBldPmt },
    {
      chainName: 'cosmoshub',
    },
  );
  await transmitTransferAck();
  const { invitationMakers, publicSubscribers } = (await heapVowE(
    userSeat,
  ).getOfferResult()) as ContinuingOfferResult;

  t.assert(
    invitationMakers,
    'continuing offer with invitation makers returned',
  );
  const icaAddress = publicSubscribers.account.storagePath.split('.').pop()!;
  t.regex(icaAddress, /^cosmos/);
});
