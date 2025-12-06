import test from 'ava';
import { TypedDataUtils } from '@metamask/eth-sig-util';
import { createEIP712Message, getEIP712Config } from '../src/eip712-utils.js';
import type { TargetAllocation } from '../src/types.js';

// Default form data from the UI
const defaultFormData = {
  operation: 'openPortfolio' as const,
  userAddress: '0x1234567890123456789012345678901234567890',
  amount: '1000',
  allocations: [
    { poolKey: 'USDN', basisPoints: 5000 },
    { poolKey: 'Aave_Ethereum', basisPoints: 5000 }
  ] as TargetAllocation[]
};

test('createEIP712Message produces valid structure', t => {
  const { operation, userAddress, amount, allocations } = defaultFormData;
  const message = createEIP712Message(operation, userAddress, amount, allocations);

  // Check top-level structure
  t.is(message.method, 'executeOffer');
  t.is(message.user, userAddress);
  t.is(typeof message.nonce, 'number');
  t.is(typeof message.deadline, 'number');
  t.true(message.deadline > message.nonce);

  // Check offer structure
  t.is(typeof message.offer.id, 'string');
  t.true(message.offer.id.startsWith('openPortfolio-'));
  
  // Check invitation spec
  t.is(message.offer.invitationSpec.source, 'agoricContract');
  t.deepEqual(message.offer.invitationSpec.instancePath, ['ymax0']);
  
  // Check callPipe is valid JSON
  const callPipe = JSON.parse(message.offer.invitationSpec.callPipe);
  t.deepEqual(callPipe, [['makeOpenPortfolioInvitation', []]]);

  // Check proposal
  t.is(message.offer.proposal.give?.Deposit.brand, 'USDC');
  t.is(message.offer.proposal.give?.Deposit.value, '1000000'); // 1000 * 1e6

  // Check target allocation (LegibleCapData format)
  t.is(message.offer.offerArgs?.targetAllocation?.USDN, '+5000');
  t.is(message.offer.offerArgs?.targetAllocation?.Aave_Ethereum, '+5000');
});

test('EIP-712 message validates against types', t => {
  const { operation, userAddress, amount, allocations } = defaultFormData;
  const message = createEIP712Message(operation, userAddress, amount, allocations);
  const { domain, types } = getEIP712Config();

  // This is what MetaMask does internally to validate the message
  t.notThrows(() => {
    TypedDataUtils.encodeData(types.BridgeAction, message, types);
  });

  // Verify the domain hash can be computed
  t.notThrows(() => {
    TypedDataUtils.hashStruct('EIP712Domain', domain, {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' }
      ]
    });
  });
});

test('different allocations produce valid messages', t => {
  const customAllocations: TargetAllocation[] = [
    { poolKey: 'USDN', basisPoints: 3000 },
    { poolKey: 'Aave_Ethereum', basisPoints: 4000 },
    { poolKey: 'Compound_Arbitrum', basisPoints: 3000 }
  ];

  const message = createEIP712Message(
    'rebalance',
    '0xabcdef1234567890123456789012345678901234',
    '500.50',
    customAllocations
  );

  const { types } = getEIP712Config();

  // Should validate without throwing
  t.notThrows(() => {
    TypedDataUtils.encodeData(types.BridgeAction, message, types);
  });

  // Check LegibleCapData format
  t.is(message.offer.offerArgs?.targetAllocation?.USDN, '+3000');
  t.is(message.offer.offerArgs?.targetAllocation?.Aave_Ethereum, '+4000');
  t.is(message.offer.offerArgs?.targetAllocation?.Compound_Arbitrum, '+3000');

  // Check amount conversion
  t.is(message.offer.proposal.give?.Deposit.value, '500500000'); // 500.50 * 1e6
});

test('empty allocations produce valid message', t => {
  const message = createEIP712Message(
    'withdraw',
    defaultFormData.userAddress,
    '100',
    []
  );

  const { types } = getEIP712Config();

  t.notThrows(() => {
    TypedDataUtils.encodeData(types.BridgeAction, message, types);
  });

  // Should have empty target allocation
  t.deepEqual(message.offer.offerArgs?.targetAllocation, {});
});

test('proposal structure serializes correctly', t => {
  const message = createEIP712Message(
    defaultFormData.operation,
    defaultFormData.userAddress,
    defaultFormData.amount,
    defaultFormData.allocations
  );

  // The proposal.give field should be serializable as a string for EIP-712
  const proposalGiveString = JSON.stringify(message.offer.proposal.give);
  t.true(proposalGiveString.includes('USDC'));
  t.true(proposalGiveString.includes('1000000'));
});

test('target allocation serializes correctly', t => {
  const message = createEIP712Message(
    defaultFormData.operation,
    defaultFormData.userAddress,
    defaultFormData.amount,
    defaultFormData.allocations
  );

  // The targetAllocation should be serializable as a string for EIP-712
  const targetAllocationString = JSON.stringify(message.offer.offerArgs?.targetAllocation);
  t.true(targetAllocationString.includes('+5000'));
  t.true(targetAllocationString.includes('USDN'));
  t.true(targetAllocationString.includes('Aave_Ethereum'));
});
