import test from 'ava';

import {
  getYmaxStandaloneOperationData,
  getYmaxWitness,
  validateYmaxDomain,
  validateYmaxOperationTypeName,
  splitWitnessFieldType,
  type OperationTypeNames,
  type TargetAllocation,
  type YmaxOperationType,
} from '../src/evm-wallet/eip712-messages.ts';

const MOCK_CONTRACT_ADDRESS =
  '0x1234567890123456789012345678901234567890' as const;

test('getYmaxStandaloneOperationData for OpenPortfolio', t => {
  const allocations: TargetAllocation[] = [
    { instrument: 'Aave_Arbitrum', portion: 6000n },
    { instrument: 'Compound_Base', portion: 4000n },
  ];
  const data = {
    allocations,
    nonce: 1n,
    deadline: 1700000000n,
  };

  const result = getYmaxStandaloneOperationData(
    data,
    'OpenPortfolio',
    42161n,
    MOCK_CONTRACT_ADDRESS,
  );

  t.is(result.primaryType, 'OpenPortfolio');
  t.deepEqual(result.domain, {
    name: 'Ymax',
    version: '1',
    chainId: 42161n,
    verifyingContract: MOCK_CONTRACT_ADDRESS,
  });
  t.deepEqual(result.message, {
    allocations,
    nonce: 1n,
    deadline: 1700000000n,
  });
  t.deepEqual(result.types.OpenPortfolio, [
    { name: 'allocations', type: 'Allocation[]' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ]);
  t.deepEqual(result.types.Allocation, [
    { name: 'instrument', type: 'string' },
    { name: 'portion', type: 'uint256' },
  ]);
});

test('getYmaxStandaloneOperationData for Deposit', t => {
  const data = {
    portfolio: 123n,
    nonce: 10n,
    deadline: 1700000000n,
  };

  const result = getYmaxStandaloneOperationData(
    data,
    'Deposit',
    42161n,
    MOCK_CONTRACT_ADDRESS,
  );

  t.is(result.primaryType, 'Deposit');
  t.deepEqual(result.message, data);
  t.deepEqual(result.types.Deposit, [
    { name: 'portfolio', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ]);
});

test('getYmaxStandaloneOperationData for Rebalance', t => {
  const allocations: TargetAllocation[] = [
    { instrument: 'Aave_Arbitrum', portion: 10000n },
  ];
  const data = {
    allocations,
    portfolio: 0n,
    nonce: 1n,
    deadline: 1700000000n,
  };

  const result = getYmaxStandaloneOperationData(
    data,
    'Rebalance',
    42161n,
    MOCK_CONTRACT_ADDRESS,
  );

  t.is(result.primaryType, 'Rebalance');
  t.deepEqual(result.message, data);
  t.deepEqual(result.types.Rebalance, [
    { name: 'allocations', type: 'Allocation[]' },
    { name: 'portfolio', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ]);
  t.deepEqual(result.types.Allocation, [
    { name: 'instrument', type: 'string' },
    { name: 'portion', type: 'uint256' },
  ]);
});

test('getYmaxWitness for OpenPortfolio', t => {
  const allocations: TargetAllocation[] = [
    { instrument: 'Aave_Arbitrum', portion: 10000n },
  ];

  const witness = getYmaxWitness('OpenPortfolio', { allocations });

  t.truthy(witness.witnessTypes.YmaxV1OpenPortfolio);
  t.truthy(witness.witnessTypes.Allocation);
  t.deepEqual(witness.witnessField, {
    name: 'ymaxOpenPortfolio',
    type: 'YmaxV1OpenPortfolio',
  });
  t.deepEqual(witness.witness, { allocations });
});

test('getYmaxWitness for Deposit', t => {
  const witness = getYmaxWitness('Deposit', { portfolio: 5n });

  t.truthy(witness.witnessTypes.YmaxV1Deposit);
  t.deepEqual(witness.witnessField, {
    name: 'ymaxDeposit',
    type: 'YmaxV1Deposit',
  });
  t.deepEqual(witness.witness, { portfolio: 5n });
});

test('validateYmaxDomain passes for valid domain', t => {
  const domain = {
    name: 'Ymax',
    version: '1',
    chainId: 42161n,
    verifyingContract: MOCK_CONTRACT_ADDRESS,
  };

  t.notThrows(() => validateYmaxDomain(domain));
});

test('validateYmaxDomain throws for invalid name', t => {
  const domain = {
    name: 'WrongName',
    version: '1',
    chainId: 42161n,
    verifyingContract: MOCK_CONTRACT_ADDRESS,
  };

  t.throws(() => validateYmaxDomain(domain), {
    message: /Invalid Ymax domain name/,
  });
});

test('validateYmaxDomain throws for invalid version', t => {
  const domain = {
    name: 'Ymax',
    version: '2',
    chainId: 42161n,
    verifyingContract: MOCK_CONTRACT_ADDRESS,
  };

  t.throws(() => validateYmaxDomain(domain), {
    message: /Invalid Ymax domain version/,
  });
});

test('validateYmaxDomain passes without verifyingContract when no validContractAddresses provided', t => {
  const domain = {
    name: 'Ymax',
    version: '1',
    chainId: 42161n,
  };

  t.notThrows(() => validateYmaxDomain(domain));
});

test('validateYmaxDomain passes without chainId when no validContractAddresses provided', t => {
  const domain = {
    name: 'Ymax',
    version: '1',
  };

  t.notThrows(() => validateYmaxDomain(domain));
});

test('validateYmaxDomain validates contract addresses', t => {
  const validAddresses = {
    '42161': MOCK_CONTRACT_ADDRESS,
  };
  const domain = {
    name: 'Ymax',
    version: '1',
    chainId: 42161n,
    verifyingContract: MOCK_CONTRACT_ADDRESS,
  };

  t.notThrows(() => validateYmaxDomain(domain, validAddresses));
});

test('validateYmaxDomain throws for unknown chain ID', t => {
  const validAddresses = {
    '42161': MOCK_CONTRACT_ADDRESS,
  };
  const domain = {
    name: 'Ymax',
    version: '1',
    chainId: 1n, // mainnet, not in validAddresses
    verifyingContract: MOCK_CONTRACT_ADDRESS,
  };

  t.throws(() => validateYmaxDomain(domain, validAddresses), {
    message: /Unknown chain ID/,
  });
});

test('validateYmaxDomain throws for wrong contract address', t => {
  const validAddresses = {
    '42161': MOCK_CONTRACT_ADDRESS,
  };
  const domain = {
    name: 'Ymax',
    version: '1',
    chainId: 42161n,
    verifyingContract: '0x0000000000000000000000000000000000000000' as const,
  };

  t.throws(() => validateYmaxDomain(domain, validAddresses), {
    message: /Invalid verifying contract/,
  });
});

test('validateYmaxOperationTypeName passes for valid types', t => {
  const validTypes: OperationTypeNames[] = [
    'OpenPortfolio',
    'Rebalance',
    'Deposit',
  ];

  for (const typeName of validTypes) {
    t.notThrows(() => validateYmaxOperationTypeName(typeName));
  }
});

test('validateYmaxOperationTypeName throws for invalid type', t => {
  t.throws(() => validateYmaxOperationTypeName('InvalidOperation'), {
    message: /Unknown Ymax operation type/,
  });
});

test('splitWitnessFieldType parses OpenPortfolio witness type', t => {
  t.deepEqual(splitWitnessFieldType('YmaxV1OpenPortfolio'), {
    domain: { name: 'Ymax', version: '1' },
    primaryType: 'OpenPortfolio',
  });
});

test('splitWitnessFieldType parses Deposit witness type', t => {
  t.deepEqual(splitWitnessFieldType('YmaxV1Deposit'), {
    domain: { name: 'Ymax', version: '1' },
    primaryType: 'Deposit',
  });
});

test('splitWitnessFieldType parses Rebalance witness type', t => {
  t.deepEqual(splitWitnessFieldType('YmaxV1Rebalance'), {
    domain: { name: 'Ymax', version: '1' },
    primaryType: 'Rebalance',
  });
});

test('splitWitnessFieldType throws for invalid format', t => {
  t.throws(() => splitWitnessFieldType('InvalidFormat' as any), {
    message: /Invalid witness field type name/,
  });
});

// XXX: Move to `types.test-d.ts`
// Type-level tests (these just need to compile)
test('YmaxOperationType types are correctly inferred', t => {
  // OpenPortfolio type
  const openPortfolio: YmaxOperationType<'OpenPortfolio'> = {
    allocations: [{ instrument: 'test', portion: 100n }],
  };
  t.deepEqual(openPortfolio, {
    allocations: [{ instrument: 'test', portion: 100n }],
  });

  // Deposit type
  const deposit: YmaxOperationType<'Deposit'> = {
    portfolio: 1n,
  };
  t.deepEqual(deposit, { portfolio: 1n });

  // Rebalance type
  const rebalance: YmaxOperationType<'Rebalance'> = {
    allocations: [{ instrument: 'test', portion: 100n }],
    portfolio: 0n,
  };
  t.deepEqual(rebalance, {
    allocations: [{ instrument: 'test', portion: 100n }],
    portfolio: 0n,
  });
});
