/**
 * @file ABI fragments for Pendle router interactions used by the prototype.
 *
 * Pendle: RouterV4
 * https://arbiscan.io/address/0x888888888889758f76e7103c6cbf23abbf58f946
 *
 * implementation:
 *
 * Pendle: Action Swap PT V3
 * https://arbiscan.io/address/0xd8d200d9a713a1c71cf1e7f694b14e5f1d948b15
 */
import type { Abi } from 'viem';

export const pendleRouterABI = [
  {
    type: 'function',
    name: 'swapExactTokenForPt',
    stateMutability: 'payable',
    inputs: [
      { name: 'receiver', type: 'address' },
      { name: 'market', type: 'address' },
      { name: 'minPtOut', type: 'uint256' },
      {
        name: 'guessPtOut',
        type: 'tuple',
        components: [
          { name: 'guessMin', type: 'uint256' },
          { name: 'guessMax', type: 'uint256' },
          { name: 'guessOffchain', type: 'uint256' },
          { name: 'maxIteration', type: 'uint256' },
          { name: 'eps', type: 'uint256' },
        ],
      },
      {
        name: 'input',
        type: 'tuple',
        components: [
          { name: 'tokenIn', type: 'address' },
          { name: 'netTokenIn', type: 'uint256' },
          { name: 'tokenMintSy', type: 'address' },
          { name: 'pendleSwap', type: 'address' },
          {
            name: 'swapData',
            type: 'tuple',
            components: [
              { name: 'swapType', type: 'uint8' },
              { name: 'extRouter', type: 'address' },
              { name: 'extCalldata', type: 'bytes' },
              { name: 'needScale', type: 'bool' },
            ],
          },
        ],
      },
      {
        name: 'limit',
        type: 'tuple',
        components: [
          { name: 'limitRouter', type: 'address' },
          { name: 'epsSkipMarket', type: 'uint256' },
          {
            name: 'normalFills',
            type: 'tuple[]',
            components: [
              {
                name: 'order',
                type: 'tuple',
                components: [
                  { name: 'salt', type: 'uint256' },
                  { name: 'expiry', type: 'uint256' },
                  { name: 'nonce', type: 'uint256' },
                  { name: 'orderType', type: 'uint8' },
                  { name: 'token', type: 'address' },
                  { name: 'YT', type: 'address' },
                  { name: 'maker', type: 'address' },
                  { name: 'receiver', type: 'address' },
                  { name: 'makingAmount', type: 'uint256' },
                  { name: 'lnImpliedRate', type: 'uint256' },
                  { name: 'failSafeRate', type: 'uint256' },
                  { name: 'permit', type: 'bytes' },
                ],
              },
              { name: 'signature', type: 'bytes' },
              { name: 'makingAmount', type: 'uint256' },
            ],
          },
          {
            name: 'flashFills',
            type: 'tuple[]',
            components: [
              {
                name: 'order',
                type: 'tuple',
                components: [
                  { name: 'salt', type: 'uint256' },
                  { name: 'expiry', type: 'uint256' },
                  { name: 'nonce', type: 'uint256' },
                  { name: 'orderType', type: 'uint8' },
                  { name: 'token', type: 'address' },
                  { name: 'YT', type: 'address' },
                  { name: 'maker', type: 'address' },
                  { name: 'receiver', type: 'address' },
                  { name: 'makingAmount', type: 'uint256' },
                  { name: 'lnImpliedRate', type: 'uint256' },
                  { name: 'failSafeRate', type: 'uint256' },
                  { name: 'permit', type: 'bytes' },
                ],
              },
              { name: 'signature', type: 'bytes' },
              { name: 'makingAmount', type: 'uint256' },
            ],
          },
          { name: 'optData', type: 'bytes' },
        ],
      },
    ],
    outputs: [
      { name: 'netPtOut', type: 'uint256' },
      { name: 'netSyFee', type: 'uint256' },
      { name: 'netSyInterm', type: 'uint256' },
    ],
  },

  {
    inputs: [
      { name: 'receiver', type: 'address' },
      { name: 'market', type: 'address' },
      { name: 'exactPtIn', type: 'uint256' },
      {
        components: [
          { name: 'tokenOut', type: 'address' },
          { name: 'minTokenOut', type: 'uint256' },
          { name: 'tokenRedeemSy', type: 'address' },
          { name: 'pendleSwap', type: 'address' },
          {
            components: [
              { name: 'swapType', type: 'uint8' },
              { name: 'extRouter', type: 'address' },
              { name: 'extCalldata', type: 'bytes' },
              { name: 'needScale', type: 'bool' },
            ],
            name: 'swapData',
            type: 'tuple',
          },
        ],
        name: 'output',
        type: 'tuple',
      },
      {
        components: [
          { name: 'limitRouter', type: 'address' },
          { name: 'epsSkipMarket', type: 'uint256' },
          {
            components: [
              {
                components: [
                  { name: 'salt', type: 'uint256' },
                  { name: 'expiry', type: 'uint256' },
                  { name: 'nonce', type: 'uint256' },
                  { name: 'orderType', type: 'uint8' },
                  { name: 'token', type: 'address' },
                  { name: 'YT', type: 'address' },
                  { name: 'maker', type: 'address' },
                  { name: 'receiver', type: 'address' },
                  { name: 'makingAmount', type: 'uint256' },
                  { name: 'lnImpliedRate', type: 'uint256' },
                  { name: 'failSafeRate', type: 'uint256' },
                  { name: 'permit', type: 'bytes' },
                ],
                name: 'order',
                type: 'tuple',
              },
              { name: 'signature', type: 'bytes' },
              { name: 'makingAmount', type: 'uint256' },
            ],
            name: 'normalFills',
            type: 'tuple[]',
          },
          {
            components: [
              {
                components: [
                  { name: 'salt', type: 'uint256' },
                  { name: 'expiry', type: 'uint256' },
                  { name: 'nonce', type: 'uint256' },
                  { name: 'orderType', type: 'uint8' },
                  { name: 'token', type: 'address' },
                  { name: 'YT', type: 'address' },
                  { name: 'maker', type: 'address' },
                  { name: 'receiver', type: 'address' },
                  { name: 'makingAmount', type: 'uint256' },
                  { name: 'lnImpliedRate', type: 'uint256' },
                  { name: 'failSafeRate', type: 'uint256' },
                  { name: 'permit', type: 'bytes' },
                ],
                name: 'order',
                type: 'tuple',
              },
              { name: 'signature', type: 'bytes' },
              { name: 'makingAmount', type: 'uint256' },
            ],
            name: 'flashFills',
            type: 'tuple[]',
          },
          { name: 'optData', type: 'bytes' },
        ],
        name: 'limit',
        type: 'tuple',
      },
    ],
    name: 'swapExactPtForToken',
    outputs: [
      { name: 'netTokenOut', type: 'uint256' },
      { name: 'netSyFee', type: 'uint256' },
      { name: 'netSyInterm', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const satisfies Abi;

harden(pendleRouterABI);
