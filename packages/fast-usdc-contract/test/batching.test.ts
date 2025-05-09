import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import { E, type EReturn } from '@endo/far';
import {
  makeCustomer,
  makeLP,
  makeOracleOperator,
  makeTestContext,
  purseOf,
} from './contract-setup.ts';

const test = anyTest as TestFn<EReturn<typeof makeTestContext>>;
test.before(async t => {
  t.context = await makeTestContext(t);
  const {
    startKit: { zoe, instance, invitations },
    common: {
      brands: { usdc },
      utils,
    },
    evm: { txPub },
    sync,
  } = t.context;
  // start oracles in this before() hook since this test doesn't test their behavior
  sync.ocw.resolve(
    await Promise.all(
      invitations.operator.map(async opInv => {
        const op = makeOracleOperator(opInv, txPub.subscriber, zoe, t);
        await E(op).watch();
        return op;
      }),
    ),
  );

  // Fund the LP with 500 USDCC
  const usdcPurse = purseOf(usdc.issuer, utils);
  const lp500 = makeLP('Logan', usdcPurse(500_000_000n), zoe, instance);
  await E(lp500).deposit(t, 200_000_000n);
  sync.lp.resolve({ lp500 });
});

test.serial.failing('multiple advance amounts settled by one mint', async t => {
  const {
    bridges: { snapshot, since },
    evm: { cctp, txPub },
    common: {
      commonPrivateArgs: { feeConfig },
      facadeServices: { chainHub },
      utils: { transmitVTransferEvent },
    },
    startKit: { metricsSub },
    mint,
  } = t.context;

  const cust = makeCustomer(
    'RePete',
    cctp,
    txPub.publisher,
    feeConfig,
    chainHub,
  );
  const dest = 'osmo1234';

  await cust.checkPoolAvailable(t, 10_000_000n, metricsSub);

  const bridgePos = snapshot();
  const [sent1, sent2, sent3] = await Promise.all([
    cust.sendFast(t, 1_000_000n, dest),
    cust.sendFast(t, 2_000_000n, dest),
    cust.sendFast(t, 3_000_000n, dest),
  ]);

  cust.checkSent(t, since(bridgePos));

  // Ack all three transfers using their index relative to the end
  await transmitVTransferEvent('acknowledgementPacket', -3); // First racer's transfer
  await transmitVTransferEvent('acknowledgementPacket', -2); // Second racer's transfer
  await transmitVTransferEvent('acknowledgementPacket', -1); // Third racer's transfer

  for (const sent of [sent1, sent2, sent3]) {
    t.deepEqual(t.context.common.readTxnRecord(sent), [
      { evidence: sent, status: 'OBSERVED' },
      { status: 'ADVANCING' },
      { status: 'ADVANCED' },
    ]);
  }

  // mint() takes a CctpTxEvidence so make it look like one, even though there was no single evidence like this
  const batchedTx = structuredClone(sent1);
  batchedTx.tx.amount = sent1.tx.amount + sent2.tx.amount + sent3.tx.amount;
  await mint(batchedTx);

  for (const sent of [sent1, sent2, sent3]) {
    t.like(t.context.common.readTxnRecord(sent).at(-1), {
      status: 'DISBURSED',
    });
  }
});
