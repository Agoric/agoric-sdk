/**
 * @file Demonstrates why not to use t.notThrowsAsync within context
 */
import test from '@endo/ses-ava/prepare-endo.js';

test.before(async t => {
  const assertTxStatusPlain = async (txHash: string, status: string) =>
    Promise.reject(
      new Error(`Transaction ${txHash} failed to reach status ${status}`),
    );
  const assertTxStatusWrapped = async (txHash: string, status: string) =>
    t.notThrowsAsync(
      Promise.reject(
        new Error(`Transaction ${txHash} failed to reach status ${status}`),
      ),
    );
  t.context = { assertTxStatusPlain, assertTxStatusWrapped };
});

// This gives an informative error message with a stack trace:
// ✔ [expected fail] plain
// ℹ REJECTED from ava test.failing("plain"): (Error#2)
// ℹ Error#2: Transaction 0x123 failed to reach status success
// ℹ     at assertTxStatusPlain (file:///opt/agoric/agoric-sdk/multichain-testing/test/devex.test.ts:9:7)
//       at file:///opt/agoric/agoric-sdk/multichain-testing/test/devex.test.ts:31:9
test.failing('plain', async t => {
  // @ts-expect-error unknown
  const { assertTxStatusPlain } = t.context;

  await assertTxStatusPlain('0x123', 'success');
});

// This loses the error message and the stack trace:
// ✔ [expected fail] wrapped
// ℹ REJECTED from ava test.failing("wrapped"): (TestFailure#1)
// ℹ TestFailure#1: The test has failed
// ℹ     at Test.saveFirstError (file:///opt/agoric/agoric-sdk/multichain-testing/node_modules/.store/ava-virtual-d28ee69673/package/lib/test.js:410:22)
//       at Test.failPendingAssertion (file:///opt/agoric/agoric-sdk/multichain-testing/node_modules/.store/ava-virtual-d28ee69673/package/lib/test.js:363:8)
test.failing('wrapped', async t => {
  // @ts-expect-error unknown
  const { assertTxStatusWrapped } = t.context;

  await assertTxStatusWrapped('0x123', 'success');
});
