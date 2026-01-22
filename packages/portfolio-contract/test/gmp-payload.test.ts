/**
 * @file GMP Payload Generation Test
 * Tests that we can reproduce the exact GMP payload from a known transaction
 */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeEVMSession, ERC20 } from '../src/evm-facade.ts';
import { buildGMPPayload } from '@agoric/orchestration/src/utils/gmp.js';
import { keccak_256 as keccak256 } from '@noble/hashes/sha3';
import { bytesToHex } from '@noble/hashes/utils';
import { TokenMessengerV2, evmAddressToBytes32 } from '../src/pos-gmp.flows.ts';

test('CCTPv2 GMP payload matches Axelar transaction 0x516c285e...334451179', t => {
  // Transaction details from:
  // https://testnet.axelarscan.io/gmp/0x516c285e28dd9c86cd6723f6b7426297a68b9cf3ad379cf51984f2b88c5046b3-334451179

  const txId = 'tx8';
  const usdcAddress: `0x${string}` =
    '0x5425890298aed601595a70AB815c96711a31Bc65';
  const tokenMessengerV2Address: `0x${string}` =
    '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA';
  const amount = 1000000n; // 1 USDC (6 decimals)
  const mintRecipient: `0x${string}` =
    '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const destDomain = 0; // Ethereum
  const maxFee = 0n;
  const minFinalityThreshold = 2000; // FINALIZED
  const ZERO_BYTES32: `0x${string}` = `0x${'0'.repeat(64)}`;

  // Build the contract calls using makeEVMSession
  const session = makeEVMSession();
  const usdc = session.makeContract(usdcAddress, ERC20);
  const tm = session.makeContract(tokenMessengerV2Address, TokenMessengerV2);

  // Call 1: approve tokenMessengerV2 to spend USDC
  usdc.approve(tokenMessengerV2Address, amount);

  // Call 2: depositForBurn on tokenMessengerV2
  tm.depositForBurn(
    amount,
    destDomain,
    evmAddressToBytes32(mintRecipient),
    usdcAddress,
    ZERO_BYTES32,
    maxFee,
    minFinalityThreshold,
  );

  const calls = session.finish();

  // Generate the GMP payload
  const payload = buildGMPPayload(calls, txId);
  const payloadBytes = new Uint8Array(payload);
  const payloadHex = '0x' + bytesToHex(payloadBytes);

  // Calculate the payload hash using keccak256
  const hashBytes = keccak256(payloadBytes);
  const payloadHash = '0x' + bytesToHex(hashBytes);

  // Expected payload hash from the Axelar transaction
  const expectedPayloadHash =
    '0xff28bc787b59748d265eba0000280e5b8f12ec1fa18b0acb2b6d7de1c58d83a5';

  t.log('Generated payload hash:', payloadHash);
  t.log('Expected payload hash:', expectedPayloadHash);
  t.log('Payload hex:', payloadHex);
  t.log('Payload length:', payload.length, 'bytes');

  t.is(
    payloadHash.toLowerCase(),
    expectedPayloadHash.toLowerCase(),
    'Generated GMP payload hash should match the expected hash from Axelar transaction',
  );
});
