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
  await t.throwsAsync(
    evalProposal(
      buildProposal(
        '@agoric/builders/scripts/testing/fix-buggy-sendAnywhere.js',
      ),
    ),
  );
  // FIXME the upgrade to fix is failing on:
  /*
  ----- Orchestrator.4  2 making an Orchestrator
Logging sent error stack (Error#1)
Error#1: replay 2:
     ["checkCall","[Alleged: findBrandInVBank guest wrapper]","apply",[["[Alleged: IST brand guest wrapper]"]],2]
  vs ["checkCall","[Alleged: findBrandInVBank]","apply",[["[Alleged: IST brand]"]],2]
    : [1]: internal h->g: "[Alleged: findBrandInVBank]" -> "[Alleged: findBrandInVBank guest wrapper]" vs "[Function unwrapped]"
     ["checkCall","[Alleged: findBrandInVBank guest wrapper]","apply",[["[Alleged: IST brand guest wrapper]"]],2]
  vs ["checkCall","[Alleged: findBrandInVBank]","apply",[["[Alleged: IST brand]"]],2]
    : [1]: internal h->g: "[Alleged: findBrandInVBank]" -> "[Alleged: findBrandInVBank guest wrapper]" vs "[Function unwrapped]"
  at makeError (file:///opt/agoric/agoric-sdk/node_modules/ses/src/error/assert.js:347:61)
  at throwLabeled (.../common/throw-labeled.js:23:16)
  at equate (.../async-flow/src/equate.js:23:1)
  at guestCallsHost (.../async-flow/src/replay-membrane.js:183:1)
  at In "apply" method of (findBrandInVBank) [as apply] (.../async-flow/src/replay-membrane.js:466:8)
  at unwrapped (.../async-flow/src/endowments.js:98:41)
  at sendIt (.../orchestration/src/examples/sendAnywhereFlows.js:39:20)
  at eval (.../async-flow/src/async-flow.js:222:1)
  at Object.restart (.../async-flow/src/async-flow.js:222:30)
  at In "restart" method of (asyncFlow flow) [as restart] (.../exo/src/exo-tools.js:171:14)
  at Object.wake (.../async-flow/src/async-flow.js:311:6)
  at In "wake" method of (asyncFlow flow) [as wake] (.../exo/src/exo-tools.js:171:14)
  at Object.wakeAll (.../async-flow/src/async-flow.js:474:6)
  at In "wakeAll" method of (AdminAsyncFlow) [as wakeAll] (.../exo/src/exo-tools.js:171:14)
  at eval (.../async-flow/src/async-flow.js:487:48)
  */

  // TODO confirm in vstorage that the started offer resolves
});
