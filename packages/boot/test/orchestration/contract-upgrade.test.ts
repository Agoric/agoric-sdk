/** @file Bootstrap test of restarting contracts using orchestration */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { TestFn } from 'ava';

import { AmountMath } from '@agoric/ertp';
import {
  makeWalletFactoryContext,
  type WalletFactoryTestContext,
} from '../bootstrapTests/walletFactory.ts';

const test: TestFn<WalletFactoryTestContext> = anyTest;
test.before(async t => {
  t.context = await makeWalletFactoryContext(
    t,
    '@agoric/vm-config/decentral-itest-orchestration-config.json',
  );
});
test.after.always(t => t.context.shutdown?.());

test('resume', async t => {
  const { walletFactoryDriver, buildProposal, evalProposal } = t.context;

  const { IST } = t.context.agoricNamesRemotes.brand;

  t.log('start sendAnywhere');
  await evalProposal(
    buildProposal(
      '@agoric/builders/scripts/testing/start-buggy-sendAnywhere.js',
    ),
  );

  t.log('making offer');
  const wallet = await walletFactoryDriver.provideSmartWallet('agoric1test');
  // no money in wallet to actually send
  const zero = { brand: IST, value: 0n };
  // send because it won't resolve
  await wallet.sendOffer({
    id: 'send-somewhere',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['sendAnywhere'],
      callPipe: [['makeSendInvitation']],
    },
    proposal: {
      // @ts-expect-error XXX BoardRemote
      give: { Send: zero },
    },
    offerArgs: { destAddr: 'hot1destAddr', chainName: 'hot' },
  });

  // TODO verify in vstorage that the offer hangs

  t.log('upgrade sendAnywhere with fix');
  await evalProposal(
    buildProposal('@agoric/builders/scripts/testing/fix-buggy-sendAnywhere.js'),
  );
  // FIXME the upgrade with fix runs but spews:
  /*
  Error#2 ERROR_NOTE: Caused by (Error#3)
    Error#3: internal h->g: Object [Alleged: findBrandInVBank] {} -> Object [Alleged: findBrandInVBank guest wrapper] {
      __getInterfaceGuard__: [Function: In "__getInterfaceGuard__" method of (findBrandInVBank)],
      __getMethodNames__: [Function: __getMethodNames__],
      apply: [Function: In "apply" method of (findBrandInVBank)]
    } vs [Function: unwrapped]
        at makeError (file:///opt/agoric/agoric-sdk/node_modules/ses/src/error/assert.js:347:61)
        at fail (file:///opt/agoric/agoric-sdk/node_modules/ses/src/error/assert.js:479:20)
        at Fail (file:///opt/agoric/agoric-sdk/node_modules/ses/src/error/assert.js:489:39)
        at Object.has (.../async-flow/src/bijection.js:177:6)
        at In "has" method of (Bijection) [as has] (.../exo/src/exo-tools.js:171:14)
        at innerEquate (.../async-flow/src/equate.js:34:14)
        at equate (.../async-flow/src/equate.js:21:1)
        at eval (.../async-flow/src/equate.js:59:20)
        at Array.forEach (<anonymous>)
        at innerEquate (.../async-flow/src/equate.js:59:3)
        at equate (.../async-flow/src/equate.js:21:1)
        at guestCallsHost (.../async-flow/src/replay-membrane.js:183:1)
        at In "apply" method of (findBrandInVBank) [as apply] (.../async-flow/src/replay-membrane.js:466:8)
        at unwrapped (.../async-flow/src/endowments.js:98:41)
        at sendIt (.../orchestration/src/examples/sendAnywhere.flows.js:36:20)
        at eval (.../async-flow/src/async-flow.js:222:1)
        at Object.restart (.../async-flow/src/async-flow.js:222:30)
        at In "restart" method of (asyncFlow flow) [as restart] (.../exo/src/exo-tools.js:171:14)
        at Object.wake (.../async-flow/src/async-flow.js:311:6)
        at In "wake" method of (asyncFlow flow) [as wake] (.../exo/src/exo-tools.js:171:14)
        at Object.wakeAll (.../async-flow/src/async-flow.js:474:6)
        at In "wakeAll" method of (AdminAsyncFlow) [as wakeAll] (.../exo/src/exo-tools.js:171:14)
        at eval (.../async-flow/src/async-flow.js:487:48)

vat v38 upgraded from incarnation 0 to 1 with source b1-7ed891feca89bcfa251bbec1f566a4ba9d6af49b33bf2fc1d00e948323cb85478cc1f9904471d2c33207a9fdf1538bf8ebaf690d2a3ca2db16f6722fcefb85ec
wallet agoric1test IMMEDIATE OFFER ERROR: {
  incarnationNumber: 0,
  name: 'vatUpgraded',
  upgradeMessage: 'vat upgraded'
}*/

  // TODO confirm in vstorage that the started offer resolves
});
