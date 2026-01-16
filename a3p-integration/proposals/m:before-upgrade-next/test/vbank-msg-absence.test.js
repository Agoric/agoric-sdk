/**
 * Test that vbank/MsgSetDenomMetadata is not available before upgrade
 */
import test from 'ava';
import '@endo/init/debug.js';
import { execa } from 'execa';

test('vbank/MsgSetDenomMetadata message type should not exist', async t => {
  // Try to create a proposal with the message type
  // If the message type doesn't exist, agd will reject it during validation
  const proposalPath = '/tmp/test-vbank-setdenommetadata-proposal.json';
  const fs = await import('fs/promises');

  const proposal = {
    messages: [
      {
        '@type': '/agoric.vbank.MsgSetDenomMetadata',
        authority: 'agoric10d07y265gmmuvt4z0w9aw880jnsr700j6z2zm3',
        metadata: {
          description: 'Test Token',
          denom_units: [
            {
              denom: 'utest',
              exponent: 0,
              aliases: [],
            },
          ],
          base: 'utest',
          display: 'utest',
          name: 'Test Token',
          symbol: 'TEST',
        },
      },
    ],
    metadata: '',
    deposit: '1000000ubld',
    title: 'Test vbank SetDenomMetaData (should fail)',
    summary:
      'This proposal should fail because the message type does not exist yet',
    expedited: false,
  };

  await fs.writeFile(proposalPath, JSON.stringify(proposal, null, 2));

  try {
    const result = await execa(
      'agd',
      ['tx', 'gov', 'submit-proposal', proposalPath, '--dry-run'],
      { reject: false },
    );

    t.log('Exit code:', result.exitCode);
    t.log('Stdout:', result.stdout);
    t.log('Stderr:', result.stderr);

    // Should fail with unknown message type or similar error
    t.not(result.exitCode, 0, 'Proposal submission should fail');

    const output = result.stderr + result.stdout;
    const hasExpectedError =
      output.includes('unknown') ||
      output.includes('not found') ||
      output.includes('unrecognized') ||
      output.includes('no message handler') ||
      output.includes('invalid message');

    if (!hasExpectedError) {
      t.log('Unexpected output:', output);
    }
    t.true(hasExpectedError, 'Should fail with message type error');
  } finally {
    await fs.unlink(proposalPath).catch(() => {});
  }
});
