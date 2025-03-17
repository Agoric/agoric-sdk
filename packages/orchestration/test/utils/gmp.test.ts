/** @file Unit tests for GMP and ABI encoding */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { ethers } from 'ethers';
import { buildGMPPayload, GMPMessageType } from '../../src/utils/gmp.js';

test('buildGMPPayload for message only', t => {
  const evmContractAddress = '0x1234567890123456789012345678901234567890';
  const functionSelector = '0x7ff36ab5';
  const encodedArgs =
    '0x0000000000000000000000000000000000000000000000000000000000000042';
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  const nonce = 12345;

  const payload = buildGMPPayload({
    type: GMPMessageType.MESSAGE_ONLY,
    evmContractAddress,
    functionSelector,
    encodedArgs,
    deadline,
    nonce,
  });

  t.true(Array.isArray(payload), 'Payload is an array');
  t.true(payload!.length > 0, 'Payload is not empty');

  // Decode the payload to verify structure
  const decodedPayload = ethers.utils.defaultAbiCoder.decode(
    ['uint256', 'address', 'uint256', 'uint256', 'bytes'],
    ethers.utils.arrayify(ethers.utils.hexlify(new Uint8Array(payload!))),
  );

  t.is(decodedPayload[0].toNumber(), 0, 'Logic call message ID is 0');
  t.is(
    decodedPayload[1].toLowerCase(),
    evmContractAddress.toLowerCase(),
    'Contract address matches',
  );
  t.is(decodedPayload[2].toNumber(), nonce, 'Nonce matches');
  t.is(decodedPayload[3].toNumber(), deadline, 'Deadline matches');

  const callData = decodedPayload[4];
  t.true(
    callData.startsWith(functionSelector.slice(2)),
    'Function selector is at start of calldata',
  );
});

test('buildGMPPayload returns null for token-only transfers', t => {
  const payload = buildGMPPayload({
    type: GMPMessageType.TOKEN_ONLY,
    evmContractAddress: '0x1234567890123456789012345678901234567890',
    functionSelector: '0x00000000',
    encodedArgs: '0x',
    deadline: Math.floor(Date.now() / 1000) + 3600,
    nonce: 12345,
  });

  t.is(payload, null, 'Token-only transfers return null payload');
});
