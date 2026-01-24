/**
 * @file Tests for EVM call batch facade helpers.
 */
import { encodeAbiParameters } from '@agoric/orchestration/src/vendor/viem/viem-abi.js';
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { hexToBytes } from '@noble/hashes/utils';
import { decodeAbiParameters, decodeFunctionData, type Abi } from 'viem';
import { bytesToHex } from 'viem/utils';
import { sameEvmAddress } from '@agoric/orchestration/src/utils/address.js';
import {
  depositFactoryABI,
  depositFactoryCreateAndDepositInputs,
  walletCallMessageParams,
} from '../src/utils/evm-orch-factory.ts';
import {
  makeGmpBuilder,
  makeEvmAbiCallBatch,
} from '../src/evm-facade.ts';

const erc20Abi = [
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'success', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'success', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const satisfies Abi;

test('makeEvmAbiCallBatch records ERC20 calls with ABI info', t => {
  const tokenAddress = '0x00000000000000000000000000000000000000a0';
  const spender = '0x00000000000000000000000000000000000000b0';
  const recipient = '0x00000000000000000000000000000000000000c0';

  const batch = makeEvmAbiCallBatch();
  const token = batch.makeContract(tokenAddress, erc20Abi);

  token.approve(spender, 123n);
  token.transfer(recipient, 456n);

  const calls = batch.finish();
  t.deepEqual(calls, [
    {
      target: tokenAddress,
      functionSignature: 'approve(address,uint256)',
      args: [spender, 123n],
      abi: [erc20Abi[0]],
    },
    {
      target: tokenAddress,
      functionSignature: 'transfer(address,uint256)',
      args: [recipient, 456n],
      abi: [erc20Abi[1]],
    },
  ]);
});

test('makeGmpBuilder encodes createAndDeposit payload', t => {
  const destination_address = '0x00000000000000000000000000000000000000d0';
  const gmp = makeGmpBuilder();
  const factory = gmp.makeContract(destination_address, depositFactoryABI);

  const payloadArgs = {
    lcaOwner: 'agoric1owner',
    tokenOwner: '0x00000000000000000000000000000000000000e1',
    permit: {
      permitted: {
        token: '0x00000000000000000000000000000000000000e2',
        amount: 123n,
      },
      nonce: 9n,
      deadline: 456n,
    },
    witness:
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    witnessTypeString: 'OpenPortfolioWitness',
    signature: '0x1234',
    expectedWalletAddress: '0x00000000000000000000000000000000000000e3',
  } as const;

  factory.createAndDeposit(payloadArgs);
  const result = gmp.getPayload();

  const expectedHex = encodeAbiParameters(
    depositFactoryCreateAndDepositInputs,
    [payloadArgs],
  );
  const expectedPayload = hexToBytes(expectedHex.slice(2));

  t.deepEqual(result, expectedPayload);
});
