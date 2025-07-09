import type { TestFn } from 'ava';

import { makeMockBridgeKit } from '@agoric/cosmic-swingset/tools/test-bridge-utils.ts';
import { makeCosmicSwingsetTestKit } from '@agoric/cosmic-swingset/tools/test-kit.js';
import { buildProposal } from '@agoric/cosmic-swingset/tools/test-proposal-utils.ts';
import { BridgeId } from '@agoric/internal';
import {
  QueuedActionType,
  VTRANSFER_IBC_EVENT,
} from '@agoric/internal/src/action-types.js';
import type { ScopedBridgeManager } from '@agoric/vats';
import type { TransferMiddleware } from '@agoric/vats/src/transfer.js';
import type { TransferVat } from '@agoric/vats/src/vat-transfer.js';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

const makeDefaultTestContext = async () => {
  const outboundMessages = new Map();
  const swingsetTestKit = await makeCosmicSwingsetTestKit({
    configSpecifier: '@agoric/vm-config/decentral-demo-config.json',
    fixupConfig: config => ({
      ...config,
      defaultManagerType: 'local', // FIXME: fix for xs-worker
    }),
    handleBridgeSend: makeMockBridgeKit({ outboundMessages }).handleBridgeSend,
  });
  return { ...swingsetTestKit, outboundMessages };
};
type DefaultTestContext = Awaited<ReturnType<typeof makeDefaultTestContext>>;

const test: TestFn<DefaultTestContext> = anyTest;

test.before(async t => (t.context = await makeDefaultTestContext()));
test.after.always(t => t.context.shutdown?.());

test('vtransfer', async t => {
  const { EV, evaluateCoreProposal, outboundMessages } = t.context;

  // Pull what transfer-proposal produced into local scope
  const transferVat = (await EV.vat('bootstrap').consumeItem(
    'transferVat',
  )) as ERef<TransferVat>;
  t.truthy(transferVat);
  const transferMiddleware = (await EV.vat('bootstrap').consumeItem(
    'transferMiddleware',
  )) as TransferMiddleware;
  t.truthy(transferMiddleware);
  const vtransferBridgeManager = (await EV.vat('bootstrap').consumeItem(
    'vtransferBridgeManager',
  )) as ScopedBridgeManager<'vtransfer'>;
  t.truthy(vtransferBridgeManager);

  // only VTRANSFER_IBC_EVENT is supported by vtransferBridgeManager
  await t.throwsAsync(
    EV(vtransferBridgeManager).fromBridge({ type: 'VTRANSFER_OTHER' }),
    {
      message: `Invalid inbound event type "VTRANSFER_OTHER"; expected "${VTRANSFER_IBC_EVENT}"`,
    },
  );

  const target = 'agoric1vtransfertest';
  const packet = 'thisIsPacket';

  // 0 interceptors for target

  // it's an error to target an address before an interceptor is registered
  await t.throwsAsync(
    EV(vtransferBridgeManager).fromBridge({
      target,
      type: VTRANSFER_IBC_EVENT,
      event: 'echo',
    }),
    {
      message:
        'key "agoric1vtransfertest" not found in collection "targetToApp"',
    },
  );

  // 1 interceptors for target

  // Tap into VTRANSFER_IBC_EVENT messages
  const testVtransferProposal = await buildProposal(
    '@agoric/builders/scripts/vats/test-vtransfer.js',
  );
  await evaluateCoreProposal(testVtransferProposal);

  // simulate a Golang upcall with arbitrary payload
  // note that property order matters!
  const expectedAckData = {
    event: 'writeAcknowledgement',
    packet,
    target,
    type: VTRANSFER_IBC_EVENT,
  };

  await EV(vtransferBridgeManager).fromBridge(expectedAckData);

  // verify the ackMethod outbound
  const messages = outboundMessages.get(BridgeId.VTRANSFER);
  t.deepEqual(messages, [
    { target, type: 'BRIDGE_TARGET_REGISTER' },
    {
      ack: btoa(JSON.stringify(expectedAckData)),
      method: 'receiveExecuted',
      packet,
      type: 'IBC_METHOD',
    },
  ]);
  await evaluateCoreProposal(testVtransferProposal);

  /**
   * test adding an interceptor for the same target, which should fail
   * We could use `evaluateCoreProposal` here as well but the core eval
   * failure is not critical so the failure is not propagated up
   */
  const coreEvalBridgeHandler = await EV.vat('bootstrap').consumeItem(
    'coreEvalBridgeHandler',
  );
  await t.throwsAsync(
    () =>
      EV(coreEvalBridgeHandler).fromBridge({
        evals: testVtransferProposal.evals,
        type: QueuedActionType.CORE_EVAL,
      }),
    { message: /Target.*already registered/ },
  );
});
