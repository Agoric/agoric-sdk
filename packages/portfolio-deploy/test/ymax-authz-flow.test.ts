import { AuthInfo, TxRaw } from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
import { CONTROL_ADDRESSES } from '@agoric/portfolio-api/src/portfolio-constants.js';
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { createHash } from 'node:crypto';
import { main } from '../scripts/ymax-authz.ts';

type MainIO = NonNullable<Parameters<typeof main>[2]>;
const inertIO: MainIO = harden({
  clock: () => assert.fail('mock'),
  connectRpc: async () => assert.fail('mock'),
  connectWithSigner: async () => assert.fail('mock'),
  files: harden({
    join: () => assert.fail('mock'),
    readOnly: () => assert.fail('mock'),
    toString: () => assert.fail('mock'),
    writeText: async () => assert.fail('mock'),
  }),
  fetch: async () => assert.fail('mock'),
  getNetworkConfig: async () => assert.fail('mock'),
  makeSignerKit: async () => assert.fail('mock'),
  makeWalletKit: async () => assert.fail('mock'),
  setTimeout: (() => assert.fail('mock')) as any,
  stdout: { write: () => assert.fail('mock') } as any,
});

const makeMemRoot = () => {
  const files = new Map<string, string>();

  const makeNode = (name: string) => {
    const node = {
      join(child: string) {
        return makeNode(child);
      },
      readOnly() {
        const { join, readText, toString } = node;
        return { join, readText, toString };
      },
      async readText() {
        if (!files.has(name)) {
          throw Error(`missing file: ${name}`);
        }
        return files.get(name) || '';
      },
      async writeText(text: string) {
        files.set(name, text);
      },
      toString() {
        return name;
      },
    };
    return node;
  };

  return makeNode('.');
};

test('ymax authz main drives grant, generate-upgrade, and broadcast hermetically', async t => {
  const signAndBroadcastCalls: Array<{
    signerAddress: string;
    messages: readonly unknown[];
    memo: string;
  }> = [];
  const broadcastCalls: Uint8Array[] = [];
  const getSequenceCalls: string[] = [];
  const signatureBytes = Uint8Array.from([7, 8, 9]);
  const clock = () => new Date('2026-07-01T12:00:00.000Z');
  const files = makeMemRoot();
  const grantFile = files.join('grant.json');
  const overridesFile = files.join('overrides.json');
  const unsignedFile = files.join('unsigned.json');
  const agdUnsignedFile = files.join('unsigned-tx.json');
  const signatureFile = files.join('signed-tx.json');
  const broadcastFile = files.join('broadcast.json');
  const networkConfig = {
    chainName: 'agoricdevnet-99',
    rpcAddrs: ['http://devnet-rpc.invalid'],
  };
  const granterAddress = 'agoric10utru593dspjwfewcgdak8lvp9tkz0xttvcnxv';
  const granteeAddress = 'agoric1f0h5zgxyg3euxsqzs0506uj4cmu56y30pqx46s';

  await overridesFile.writeText(JSON.stringify({ oracle: 'value' }));

  const granterClient = {
    signAndBroadcast: async (
      signerAddress: string,
      messages: readonly unknown[],
      _fee: unknown,
      memo: string,
    ) => {
      signAndBroadcastCalls.push({ signerAddress, messages, memo });
      return {
        code: 0,
        transactionHash: 'GRANT123',
        height: 12,
      };
    },
    getSequence: async () => {
      throw Error('granter should not fetch sequence');
    },
    sign: async () => {
      throw Error('granter should not sign upgrade');
    },
  };
  const granteeClient = {
    getSequence: async (address: string) => {
      getSequenceCalls.push(address);
      return {
        accountNumber: 123,
        sequence: 456,
      };
    },
    broadcastTx: async (txBytes: Uint8Array) => {
      broadcastCalls.push(txBytes);
      return {
        code: 0,
        transactionHash: 'BCAST123',
        height: 34,
      };
    },
  };

  const io = {
    ...inertIO,
    connectRpc: async () => granteeClient,
    files,
    getNetworkConfig: async () => networkConfig,
    makeSignerKit: async (mnemonic: string) => {
      if (mnemonic === 'grant seed') {
        return { address: granterAddress, client: granterClient as any };
      }
      if (mnemonic === 'grantee seed') {
        return { address: granteeAddress, client: granteeClient as any };
      }
      throw Error(`unexpected mnemonic: ${mnemonic}`);
    },
    makeWalletKit: async () => ({
      agoricNames: {
        instance: {
          postalService: harden({ kind: 'postalService' }),
        },
      },
      marshaller: {
        toCapData: (specimen: unknown) => specimen,
      },
    }),
    clock,
  } as unknown as MainIO;
  const env = {
    GRANTER_MNEMONIC: 'grant seed',
    GRANTEE_MNEMONIC: 'grantee seed',
  } as typeof process.env;

  await main(
    [
      'node',
      'ymax-authz.ts',
      'grant',
      '--grantee',
      granteeAddress,
      '--memo',
      'grant memo',
      '--outfile',
      'grant.json',
    ],
    env,
    io,
  );

  await main(
    [
      'node',
      'ymax-authz.ts',
      'generate-upgrade',
      '--grantee',
      granteeAddress,
      '--bundle',
      'b1-abc123',
      '--invocation-id',
      'devnet-ymax0-2026-07-01T12:00:00.000Z',
      '--memo',
      'sign memo',
      '--overrides',
      'overrides.json',
      '--outfile',
      'unsigned.json',
      '--signing-file',
      'unsigned-tx.json',
    ],
    env,
    io,
  );

  const agdUnsigned = JSON.parse(await agdUnsignedFile.readText());
  await signatureFile.writeText(
    JSON.stringify({
      ...agdUnsigned,
      auth_info: {
        ...agdUnsigned.auth_info,
        signer_infos: [
          {
            ...agdUnsigned.auth_info.signer_infos[0],
            public_key: {
              '@type': '/cosmos.crypto.secp256k1.PubKey',
              key: Buffer.from([2, 3, 4]).toString('base64'),
            },
          },
        ],
      },
      signatures: [Buffer.from(signatureBytes).toString('base64')],
    }),
  );

  await main(
    [
      'node',
      'ymax-authz.ts',
      'broadcast',
      '--tx-file',
      'unsigned.json',
      '--signature-file',
      'signed-tx.json',
      '--outfile',
      'broadcast.json',
    ],
    env,
    io,
  );

  t.is(signAndBroadcastCalls.length, 1);
  t.deepEqual(getSequenceCalls, [granteeAddress]);
  t.is(broadcastCalls.length, 1);

  const grantArtifact = JSON.parse(await grantFile.readText());
  t.deepEqual(grantArtifact, {
    kind: 'ymax-authz-grant',
    granter: granterAddress,
    grantee: granteeAddress,
    expiresAt: '2026-07-01T16:00:00.000Z',
    txHash: 'GRANT123',
    height: 12,
  });

  const unsignedArtifact = JSON.parse(await unsignedFile.readText());
  t.is(unsignedArtifact.grantee, granteeAddress);
  t.deepEqual(unsignedArtifact.signerData, {
    accountNumber: 123,
    sequence: 456,
    chainId: 'agoricdevnet-99',
  });
  t.is(unsignedArtifact.createdAt, '2026-07-01T12:00:00.000Z');
  t.is(unsignedArtifact.memo, 'sign memo');
  t.is(unsignedArtifact.overridesPath, 'overrides.json');
  t.is(
    unsignedArtifact.signBytesSha256,
    createHash('sha256')
      .update(Buffer.from(unsignedArtifact.signBytesBase64, 'base64'))
      .digest('hex'),
  );
  t.deepEqual(agdUnsigned.auth_info.fee, {
    amount: [{ denom: 'ubld', amount: '10000' }],
    gas_limit: '400000',
    payer: '',
    granter: '',
  });
  t.deepEqual(agdUnsigned.auth_info.signer_infos, [
    {
      mode_info: { single: { mode: 'SIGN_MODE_DIRECT' } },
      sequence: '456',
    },
  ]);
  t.is(agdUnsigned.body.memo, 'sign memo');
  t.is(agdUnsigned.body.timeout_height, '0');
  t.is(agdUnsigned.body.messages[0]['@type'], '/cosmos.authz.v1beta1.MsgExec');
  t.is(agdUnsigned.body.messages[0].grantee, granteeAddress);
  t.is(
    agdUnsigned.body.messages[0].msgs[0]['@type'],
    '/agoric.swingset.MsgWalletSpendAction',
  );
  t.is(
    agdUnsigned.body.messages[0].msgs[0].owner,
    'agoric10utru593dspjwfewcgdak8lvp9tkz0xttvcnxv',
  );
  t.notThrows(() =>
    JSON.parse(agdUnsigned.body.messages[0].msgs[0].spend_action),
  );
  t.true(
    agdUnsigned.body.messages[0].msgs[0].spend_action.includes('b1-abc123'),
  );

  const signedArtifact = JSON.parse(await broadcastFile.readText());
  const detachedTxBytes = TxRaw.encode({
    bodyBytes: Buffer.from(unsignedArtifact.bodyBytesBase64, 'base64'),
    authInfoBytes: Buffer.from(unsignedArtifact.authInfoBytesBase64, 'base64'),
    signatures: [signatureBytes],
  }).finish();
  const signedTxBytes = Buffer.from(signedArtifact.txBytesBase64, 'base64');
  t.notDeepEqual(signedTxBytes, Buffer.from(detachedTxBytes));
  const authInfo = AuthInfo.decode(TxRaw.decode(signedTxBytes).authInfoBytes);
  t.is(
    authInfo.signerInfos[0]?.publicKey?.typeUrl,
    '/cosmos.crypto.secp256k1.PubKey',
  );
  t.is(
    signedArtifact.txBytesSha256,
    createHash('sha256').update(signedTxBytes).digest('hex'),
  );
  t.is(signedArtifact.grantee, granteeAddress);
  t.deepEqual(signedArtifact.signerData, {
    accountNumber: 123,
    sequence: 456,
    chainId: 'agoricdevnet-99',
  });
  t.is(signedArtifact.createdAt, '2026-07-01T12:00:00.000Z');
  t.is(signedArtifact.memo, 'sign memo');
  t.is(signedArtifact.overridesPath, 'overrides.json');

  t.deepEqual([...broadcastCalls[0]], [...signedTxBytes]);
  t.is(signedArtifact.txHash, 'BCAST123');
  t.is(signedArtifact.height, 34);
});

test('ymax authz grant and generate-upgrade support main-network control addresses', async t => {
  const files = makeMemRoot();
  const grantFile = files.join('grant.json');
  const unsignedFile = files.join('unsigned.json');
  const agdUnsignedFile = files.join('unsigned-tx.json');
  const networkConfig = {
    chainName: 'agoric-3',
    rpcAddrs: ['http://main-rpc.invalid'],
  };
  const granterAddress = CONTROL_ADDRESSES.ymax0.main;
  const granteeAddress = 'agoric1f0h5zgxyg3euxsqzs0506uj4cmu56y30pqx46s';

  const io = {
    ...inertIO,
    connectRpc: async () => ({
      getSequence: async () => ({
        accountNumber: 789,
        sequence: 12,
      }),
      broadcastTx: async () => assert.fail('broadcast not expected'),
    }),
    files,
    getNetworkConfig: async () => networkConfig,
    makeSignerKit: async (mnemonic: string) => {
      if (mnemonic === 'main grant seed') {
        return {
          address: granterAddress,
          client: {
            signAndBroadcast: async () => ({
              code: 0,
              transactionHash: 'MAINGRANT123',
              height: 56,
            }),
          } as any,
        };
      }
      throw Error(`unexpected mnemonic: ${mnemonic}`);
    },
    makeWalletKit: async () => ({
      agoricNames: {
        instance: {
          postalService: harden({ kind: 'postalService' }),
        },
      },
      marshaller: {
        toCapData: (specimen: unknown) => specimen,
      },
    }),
    clock: () => new Date('2026-07-01T12:00:00.000Z'),
  } as unknown as MainIO;
  const env = {
    GRANTER_MNEMONIC: 'main grant seed',
    GRANTEE_ADDRESS: granteeAddress,
  } as typeof process.env;

  await main(
    [
      'node',
      'ymax-authz.ts',
      'grant',
      '--grantee',
      granteeAddress,
      '--outfile',
      'grant.json',
    ],
    env,
    io,
  );

  await main(
    [
      'node',
      'ymax-authz.ts',
      'generate-upgrade',
      '--bundle',
      'b1-main123',
      '--invocation-id',
      'main-ymax0-2026-07-01T12:00:00.000Z',
      '--outfile',
      'unsigned.json',
      '--signing-file',
      'unsigned-tx.json',
    ],
    env,
    io,
  );

  const grantArtifact = JSON.parse(await grantFile.readText());
  t.is(grantArtifact.kind, 'ymax-authz-grant');
  t.is(grantArtifact.granter, granterAddress);

  const unsignedArtifact = JSON.parse(await unsignedFile.readText());
  t.is(unsignedArtifact.kind, 'ymax-authz-upgrade-request');
  t.is(unsignedArtifact.controlAddress, granterAddress);
  t.deepEqual(unsignedArtifact.signerData, {
    accountNumber: 789,
    sequence: 12,
    chainId: 'agoric-3',
  });

  const agdUnsigned = JSON.parse(await agdUnsignedFile.readText());
  t.is(
    agdUnsigned.body.messages[0].msgs[0].owner,
    CONTROL_ADDRESSES.ymax0.main,
  );
});

test('ymax authz grant rejects a mnemonic that is not the control wallet for the selected network', async t => {
  const signAndBroadcastCalls: unknown[] = [];
  const files = makeMemRoot();
  const granteeAddress = 'agoric1f0h5zgxyg3euxsqzs0506uj4cmu56y30pqx46s';

  const io = {
    ...inertIO,
    files,
    getNetworkConfig: async () => ({
      chainName: 'agoricdevnet-99',
      rpcAddrs: ['http://devnet-rpc.invalid'],
    }),
    makeSignerKit: async () => ({
      address: 'agoric18dx5f8ck5xy2dgkgeyp2w478dztxv3z2mnz928',
      client: {
        signAndBroadcast: async (...args: unknown[]) => {
          signAndBroadcastCalls.push(args);
          throw Error('signAndBroadcast should not be reached');
        },
      } as any,
    }),
  };
  const env = {
    GRANTER_MNEMONIC: 'wrong grant seed',
  };

  await t.throwsAsync(
    () =>
      main(
        ['node', 'ymax-authz.ts', 'grant', '--grantee', granteeAddress],
        env,
        io,
      ),
    { message: /wrong MNEMONIC for ymax0 on devnet/ },
  );

  t.deepEqual(signAndBroadcastCalls, []);
});

test('ymax authz broadcast rejects signed tx JSON that does not match the unsigned request', async t => {
  const broadcastCalls: Uint8Array[] = [];
  const files = makeMemRoot();
  const unsignedFile = files.join('unsigned.json');
  const agdUnsignedFile = files.join('unsigned-tx.json');
  const signatureFile = files.join('signed-tx.json');
  const granteeAddress = 'agoric1f0h5zgxyg3euxsqzs0506uj4cmu56y30pqx46s';

  const io = {
    ...inertIO,
    connectRpc: async () => ({
      getSequence: async () => ({
        accountNumber: 123,
        sequence: 456,
      }),
      broadcastTx: async (txBytes: Uint8Array) => {
        broadcastCalls.push(txBytes);
        throw Error('broadcastTx should not be reached');
      },
    }),
    files,
    getNetworkConfig: async () => ({
      chainName: 'agoricdevnet-99',
      rpcAddrs: ['http://devnet-rpc.invalid'],
    }),
    makeWalletKit: async () => ({
      agoricNames: {
        instance: {
          postalService: harden({ kind: 'postalService' }),
        },
      },
      marshaller: {
        toCapData: (specimen: unknown) => specimen,
      },
    }),
    clock: () => new Date('2026-07-01T12:00:00.000Z'),
  } as unknown as MainIO;
  const env = {
    GRANTEE_ADDRESS: granteeAddress,
  };

  await main(
    [
      'node',
      'ymax-authz.ts',
      'generate-upgrade',
      '--bundle',
      'b1-abc123',
      '--invocation-id',
      'devnet-ymax0-2026-07-01T12:00:00.000Z',
      '--memo',
      'sign memo',
      '--outfile',
      'unsigned.json',
      '--signing-file',
      'unsigned-tx.json',
    ],
    env,
    io,
  );

  const agdUnsigned = JSON.parse(await agdUnsignedFile.readText());
  await signatureFile.writeText(
    JSON.stringify({
      ...agdUnsigned,
      body: {
        ...agdUnsigned.body,
        memo: 'tampered memo',
      },
      auth_info: {
        ...agdUnsigned.auth_info,
        signer_infos: [
          {
            ...agdUnsigned.auth_info.signer_infos[0],
            public_key: {
              '@type': '/cosmos.crypto.secp256k1.PubKey',
              key: Buffer.from([2, 3, 4]).toString('base64'),
            },
          },
        ],
      },
      signatures: [Buffer.from([7, 8, 9]).toString('base64')],
    }),
  );

  await t.throwsAsync(
    () =>
      main(
        [
          'node',
          'ymax-authz.ts',
          'broadcast',
          '--tx-file',
          'unsigned.json',
          '--signature-file',
          'signed-tx.json',
        ],
        env,
        io,
      ),
    { message: /does not match unsigned request/ },
  );

  t.deepEqual(broadcastCalls, []);
});
