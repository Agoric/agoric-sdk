/** @file Unit tests for GMP and ABI encoding */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { ethers } from 'ethers';
import {
  aaveContractFns,
  counterContractFns,
} from '../../src/utils/contract-abis.js';

test('Aave depositETH encoding matches fixture', t => {
  const onBehalfOf = '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951';
  const referralCode = 0;

  const { functionSelector, encodedArgs } = aaveContractFns.depositETH(
    onBehalfOf,
    referralCode,
  );

  t.is(functionSelector, '0x474cf53d', 'Function selector matches');

  // Known good encoding from fixture
  const expectedArgs = ethers.utils.defaultAbiCoder.encode(
    ['address', 'uint16'],
    [onBehalfOf, referralCode],
  );

  t.is(encodedArgs, expectedArgs, 'Encoded arguments match fixture');
});

test('Counter setCount encoding', t => {
  const newCount = 42;
  const { functionSelector, encodedArgs } =
    counterContractFns.setCount(newCount);

  t.is(functionSelector, '0x7ff36ab5', 'Function selector matches');

  const expectedArgs = ethers.utils.defaultAbiCoder.encode(
    ['uint256'],
    [newCount],
  );

  t.is(encodedArgs, expectedArgs, 'Encoded arguments match expected');
});
