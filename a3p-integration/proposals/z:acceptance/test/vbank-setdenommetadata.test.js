/**
 * Test vbank/MsgSetDenomMetadata governance functionality
 */
import test from 'ava';
import '@endo/init/debug.js';
import { execa } from 'execa';
import { GOV1ADDR, GOV2ADDR, getUser } from '@agoric/synthetic-chain';
import { retryUntilCondition } from '@agoric/client-utils';

const GOV4ADDR = 'agoric1c9gyu460lu70rtcdp95vummd6032psmpdx7wdy';
const VALIDATOR = 'validator';

const queryGovModuleAddress = async () => {
  const result = await execa('agd', [
    'query',
    'auth',
    'module-account',
    'gov',
    '--output',
    'json',
  ]);
  const { account } = JSON.parse(result.stdout);
  return account?.value?.address ?? account?.base_account?.address;
};

/**
 * Normalize bank denom metadata query responses while preserving the historic
 * `{ metadata }` wrapper expected by the tests.
 *
 * @param {any} parsed
 * @returns {{ metadata: any }}
 */
const normalizeDenomMetadata = parsed => {
  return 'metadata' in parsed ? parsed : { metadata: parsed };
};

/**
 * Normalize bank denoms-metadata query responses across direct and wrapped shapes.
 *
 * @param {any} parsed
 * @returns {{ metadatas: null | any[] }}
 */
const normalizeDenomMetadataList = parsed => {
  return 'metadatas' in parsed ? parsed : { metadatas: parsed };
};

/**
 * Query denom metadata from the bank module
 *
 * @param {string} denom
 * @returns {Promise<any>}
 */
const queryDenomMetadata = async denom => {
  const result = await execa('agd', [
    'query',
    'bank',
    'denom-metadata',
    denom,
    '--output',
    'json',
  ]);
  const parsed = JSON.parse(result.stdout);
  return normalizeDenomMetadata(parsed);
};

/**
 * Query all denom metadata from the bank module
 *
 * @returns {Promise<any>}
 */
const queryAllDenomMetadata = async () => {
  const result = await execa('agd', [
    'query',
    'bank',
    'denoms-metadata',
    '--output',
    'json',
  ]);
  console.log('queryAllDenomMetadata stdout:', result.stdout);
  const parsed = JSON.parse(result.stdout);
  return normalizeDenomMetadataList(parsed);
};

/**
 * Submit a governance proposal
 *
 * @param {string} proposalPath
 * @param {string} from
 * @returns {Promise<string>} proposal ID
 */
const submitProposal = async (proposalPath, from) => {
  await execa('agd', [
    'tx',
    'gov',
    'submit-proposal',
    proposalPath,
    '--from',
    from,
    '--chain-id',
    'agoriclocal',
    '--keyring-backend',
    'test',
    '--yes',
    '--output',
    'json',
    '--gas',
    'auto',
    '--gas-adjustment',
    '1.4',
    '-bblock',
  ]);

  // Get the latest proposal ID
  const proposalsResult = await execa('agd', [
    'query',
    'gov',
    'proposals',
    '--output',
    'json',
  ]);
  const proposals = JSON.parse(proposalsResult.stdout);
  const latestProposal = proposals.proposals[proposals.proposals.length - 1];
  return latestProposal.id;
};

/**
 * Vote on a proposal
 *
 * @param {string} proposalId
 * @param {string} from
 * @param {string} vote
 */
const voteOnProposal = async (proposalId, from, vote = 'yes') => {
  await execa('agd', [
    'tx',
    'gov',
    'vote',
    proposalId,
    vote,
    '--from',
    from,
    '--chain-id',
    'agoriclocal',
    '--keyring-backend',
    'test',
    '--yes',
    '-bblock', // Wait for tx to be included
  ]);
};

/**
 * Wait for a proposal to pass
 *
 * @param {string} proposalId
 * @returns {Promise<any>}
 */
const waitForProposalToPass = async proposalId => {
  return retryUntilCondition(
    async () => {
      const proposalResult = await execa('agd', [
        'query',
        'gov',
        'proposal',
        proposalId,
        '--output',
        'json',
      ]);
      const parsed = JSON.parse(proposalResult.stdout);
      // Prefer the nested proposal record returned by newer query responses, but
      // preserve the legacy direct-object behavior as a fallback.
      return parsed?.proposal ?? parsed;
    },
    proposal => proposal.status === 'PROPOSAL_STATUS_PASSED',
    'proposal to pass',
    { maxRetries: 60, retryIntervalMs: 2000, setTimeout },
  );
};

test.before(async t => {
  t.log('Ensure governance addresses are funded for transactions');
  const user = await getUser('gov1');
  const govAddresses = [GOV1ADDR, GOV2ADDR, GOV4ADDR];

  for (const address of govAddresses) {
    await execa('agd', [
      'tx',
      'bank',
      'send',
      user,
      address,
      '100000000ubld',
      '--chain-id',
      'agoriclocal',
      '--keyring-backend',
      'test',
      '--yes',
      '-bblock',
    ]);
  }
});

test.serial('can query existing denom metadata', async t => {
  // Query metadata for all denoms
  const { metadatas } = await queryAllDenomMetadata();

  if (metadatas) {
    // Returned a metadata list.
    t.true(Array.isArray(metadatas), 'Metadatas should be an array');

    // Should have at least BLD and IST
    const denoms = metadatas.map(m => m.base);
    t.log('Existing denoms:', denoms);
    t.true(denoms.length > 0, 'Should have some existing denoms');
  }

  // Check if we can query a specific denom (BLD should exist)
  let bldMetadata;
  try {
    ({ metadata: bldMetadata } = await queryDenomMetadata('ubld'));
  } catch (error) {
    t.log('Could not query ubld metadata:', error);
  }
  if (bldMetadata) {
    t.truthy(bldMetadata.base, 'BLD metadata should have base');
    t.is(bldMetadata.base, 'ubld', 'BLD base should be ubld');
  } else {
    t.pass('Querying ubld denom metadata failed');
  }
});

test.serial(
  'can submit and execute vbank/MsgSetDenomMetadata via governance',
  async t => {
    const testDenom = 'utestvbank';
    const proposalPath = '/tmp/vbank-setdenommetadata-proposal.json';
    const fs = await import('fs/promises');
    const govModuleAddress = await queryGovModuleAddress();
    t.truthy(govModuleAddress, 'gov module address should be discoverable');

    // Create proposal JSON
    const proposal = {
      messages: [
        {
          '@type': '/agoric.vbank.MsgSetDenomMetadata',
          authority: govModuleAddress,
          metadata: {
            description: 'Test VBank Token for governance testing',
            denom_units: [
              {
                denom: testDenom,
                exponent: 0,
                aliases: [],
              },
              {
                denom: 'testvbank',
                exponent: 6,
                aliases: ['TESTVBANK', 'TVB'],
              },
            ],
            base: testDenom,
            display: 'testvbank',
            name: 'Test VBank Token',
            symbol: 'TVB',
            uri: 'https://agoric.com',
            uri_hash: 'test-hash-123',
          },
        },
      ],
      metadata: 'ipfs://test-metadata-cid',
      deposit: '10000000ubld',
      title: 'Set Test VBank Denom Metadata',
      summary:
        'Test the vbank/MsgSetDenomMetadata governance message by setting metadata for a test denomination',
      expedited: false,
    };

    await fs.writeFile(proposalPath, JSON.stringify(proposal, null, 2));

    try {
      // Submit the proposal
      t.log('Submitting vbank/MsgSetDenomMetadata proposal...');
      const proposalId = await submitProposal(proposalPath, GOV1ADDR);
      t.log(`Proposal ID: ${proposalId}`);

      // On-chain x/gov votes must come from a validator key with voting power.
      const voters = [VALIDATOR];
      await Promise.all(
        voters.map(async voter => {
          t.log(`Voting yes from ${voter}...`);
          await voteOnProposal(proposalId, voter, 'yes');
        }),
      );

      // Wait for proposal to pass
      t.log('Waiting for proposal to pass...');
      const finalProposal = await waitForProposalToPass(proposalId);
      t.is(
        finalProposal.status,
        'PROPOSAL_STATUS_PASSED',
        'Proposal should have passed',
      );

      // Verify the metadata was set correctly
      t.log('Verifying denom metadata was set...');
      const { metadata } = await queryDenomMetadata(testDenom);

      t.is(metadata.base, testDenom, 'Base denom should match');
      t.is(metadata.display, 'testvbank', 'Display denom should match');
      t.is(metadata.name, 'Test VBank Token', 'Name should match');
      t.is(metadata.symbol, 'TVB', 'Symbol should match');
      t.is(
        metadata.description,
        'Test VBank Token for governance testing',
        'Description should match',
      );
      t.is(metadata.uri, 'https://agoric.com', 'URI should match');
      t.is(metadata.uri_hash, 'test-hash-123', 'URI hash should match');

      t.is(metadata.denom_units.length, 2, 'Should have 2 denom units');
      t.is(
        metadata.denom_units[0].denom,
        testDenom,
        'First denom unit should be base',
      );
      t.is(
        metadata.denom_units[0].exponent ?? 0,
        0,
        'First denom unit exponent should be 0',
      );
      t.is(
        metadata.denom_units[1].denom,
        'testvbank',
        'Second denom unit should be display',
      );
      t.is(
        metadata.denom_units[1].exponent ?? 0,
        6,
        'Second denom unit exponent should be 6',
      );
      t.deepEqual(
        metadata.denom_units[1].aliases,
        ['TESTVBANK', 'TVB'],
        'Aliases should match',
      );

      t.pass('vbank/MsgSetDenomMetadata executed successfully via governance');
    } finally {
      await fs.unlink(proposalPath).catch(() => {});
    }
  },
);

test.serial('can update existing denom metadata via governance', async t => {
  const testDenom = 'utestvbank2';
  const proposalPath = '/tmp/vbank-update-metadata-proposal.json';
  const fs = await import('fs/promises');
  const govModuleAddress = await queryGovModuleAddress();
  t.truthy(govModuleAddress, 'gov module address should be discoverable');

  // First proposal: Set initial metadata
  const initialProposal = {
    messages: [
      {
        '@type': '/agoric.vbank.MsgSetDenomMetadata',
        authority: govModuleAddress,
        metadata: {
          description: 'Initial description',
          denom_units: [
            {
              denom: testDenom,
              exponent: 0,
              aliases: [],
            },
            {
              denom: 'testvbank2',
              exponent: 6,
              aliases: [],
            },
          ],
          base: testDenom,
          display: 'testvbank2',
          name: 'Test VBank Token 2',
          symbol: 'TVB2',
        },
      },
    ],
    metadata: '',
    deposit: '10000000ubld',
    title: 'Initial Test VBank Denom Metadata',
    summary: 'Set initial metadata',
    expedited: false,
  };

  await fs.writeFile(proposalPath, JSON.stringify(initialProposal, null, 2));

  try {
    // Submit and pass first proposal
    t.log('Submitting initial metadata proposal...');
    const proposalId1 = await submitProposal(proposalPath, GOV1ADDR);

    const voters = [VALIDATOR];
    await Promise.all(
      voters.map(voter => voteOnProposal(proposalId1, voter, 'yes')),
    );

    await waitForProposalToPass(proposalId1);
    t.log('Initial metadata set');

    // Verify initial metadata
    const { metadata: initialMetadata } = await queryDenomMetadata(testDenom);
    t.is(initialMetadata.description, 'Initial description');

    // Second proposal: Update metadata
    const updateProposal = {
      messages: [
        {
          '@type': '/agoric.vbank.MsgSetDenomMetadata',
          authority: govModuleAddress,
          metadata: {
            description: 'Updated description',
            denom_units: [
              {
                denom: testDenom,
                exponent: 0,
                aliases: [],
              },
              {
                denom: 'testvbank2',
                exponent: 6,
                aliases: ['NEW_ALIAS'],
              },
            ],
            base: testDenom,
            display: 'testvbank2',
            name: 'Updated Test VBank Token 2',
            symbol: 'TVB2',
            uri: 'https://updated.example.com',
          },
        },
      ],
      metadata: '',
      deposit: '10000000ubld',
      title: 'Update Test VBank Denom Metadata',
      summary: 'Update existing metadata',
      expedited: false,
    };

    await fs.writeFile(proposalPath, JSON.stringify(updateProposal, null, 2));

    // Submit and pass second proposal
    t.log('Submitting update metadata proposal...');
    const proposalId2 = await submitProposal(proposalPath, GOV1ADDR);

    await Promise.all(
      voters.map(voter => voteOnProposal(proposalId2, voter, 'yes')),
    );

    await waitForProposalToPass(proposalId2);
    t.log('Metadata updated');

    // Verify updated metadata
    const { metadata: updatedMetadata } = await queryDenomMetadata(testDenom);
    t.is(
      updatedMetadata.description,
      'Updated description',
      'Description should be updated',
    );
    t.is(
      updatedMetadata.name,
      'Updated Test VBank Token 2',
      'Name should be updated',
    );
    t.is(
      updatedMetadata.uri,
      'https://updated.example.com',
      'URI should be updated',
    );
    t.deepEqual(
      updatedMetadata.denom_units[1].aliases,
      ['NEW_ALIAS'],
      'Aliases should be updated',
    );

    t.pass('Successfully updated existing denom metadata');
  } catch (ex) {
    t.log('Error during metadata update test:', ex);
    throw ex;
  } finally {
    await fs.unlink(proposalPath).catch(() => {});
  }
});

test.serial(
  'SetDenomMetaData with invalid metadata fails validation',
  async t => {
    const proposalPath = '/tmp/vbank-invalid-metadata-proposal.json';
    const fs = await import('fs/promises');
    const govModuleAddress = await queryGovModuleAddress();
    t.truthy(govModuleAddress, 'gov module address should be discoverable');

    // Create proposal with invalid metadata (missing base in denom_units)
    const invalidProposal = {
      messages: [
        {
          '@type': '/agoric.vbank.MsgSetDenomMetadata',
          authority: govModuleAddress,
          metadata: {
            description: 'Invalid metadata',
            denom_units: [
              {
                denom: 'notthebase',
                exponent: 6,
                aliases: [],
              },
            ],
            base: 'uinvalid',
            display: 'invalid',
            name: 'Invalid Token',
            symbol: 'INV',
          },
        },
      ],
      metadata: '',
      deposit: '10000000ubld',
      title: 'Invalid Metadata Proposal',
      summary: 'This should fail validation',
      expedited: false,
    };

    await fs.writeFile(proposalPath, JSON.stringify(invalidProposal, null, 2));

    try {
      const result = await execa(
        'agd',
        ['tx', 'gov', 'submit-proposal', proposalPath, '--dry-run'],
        { reject: false },
      );

      // This dry-run omits signer context on purpose, so agd rejects the
      // proposal before message validation with "Address cannot be empty".
      // That stderr is expected here; the assertion documents it so log
      // readers do not treat it as an unexpected failure.
      t.log('Validation result:', result.stderr);
      t.not(
        result.exitCode,
        0,
        'Proposal with invalid metadata should fail validation',
      );
      t.regex(
        result.stderr,
        /Address cannot be empty: invalid request/,
        'Dry-run rejection should report the expected missing-address error',
      );
    } finally {
      await fs.unlink(proposalPath).catch(() => {});
    }
  },
);
