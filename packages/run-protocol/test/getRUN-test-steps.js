export const CASES = 
[
  [
    '1',
    'Starting LoC',
    [
      [ 'buyBLD', 9000n ],
      [ 'stakeBLD', 9000n ],
      [ 'checkBLDLiened', 0n ],
      [ 'checkRUNBalance', 0n ],
      [ 'lienBLD', 6000n ],
      [ 'borrowRUN', 100n ],
      [ 'checkRUNDebt', 100n ],
      [ 'checkBLDLiened', 6000n ],
      [ 'checkRUNBalance', 100n ],
      [ 'borrowMoreRUN', 100n ],
      [ 'checkRUNBalance', 200n ],
      [ 'checkRUNDebt', 200n ],
      [ 'checkBLDLiened', 6000n ],
      [ 'stakeBLD', 5000n ],
      [ 'lienBLD', 8000n ],
      [ 'checkBLDLiened', 8000n ],
      [ 'borrowMoreRUN', 1400n ],
      [ 'checkRUNDebt', 1600n ]
    ]
  ],
  [
    '4',
    'Extending LoC - CR increases (FAIL)',
    [
      [ 'buyBLD', 80000n ],
      [ 'stakeBLD', 80000n ],
      [ 'lienBLD', 8000n ],
      [ 'borrowRUN', 1000n ],
      [ 'setCollateralizationRatio', [ 750n, 100n ] ],
      [ 'borrowMoreRUN', 500n, false ],
      [ 'checkRUNBalance', 1000n ],
      [ 'checkBLDLiened', 8000n ],
      [ 'checkBLDLiened', 8000n ],
      [ 'checkRUNBalance', 1000n ],
      [ 'payoffRUN', 1000n ],
      [ 'checkRUNDebt', 0n ],
      [ 'checkBLDLiened', 0n ],
      [ 'checkRUNBalance', 0n ]
    ]
  ],
  [
    '6',
    'Partial repayment - CR remains the same',
    [
      [ 'buyBLD', 10000n ],
      [ 'stakeBLD', 10000n ],
      [ 'lienBLD', 10000n ],
      [ 'borrowRUN', 1000n ],
      [ 'payDownRUN', 50n ],
      [ 'checkRUNBalance', 950n ],
      [ 'checkRUNDebt', 950n ]
    ]
  ],
  [
    '7',
    'Partial repayment - CR increases*',
    [
      [ 'buyBLD', 10000n ],
      [ 'stakeBLD', 10000n ],
      [ 'lienBLD', 400n ],
      [ 'borrowRUN', 100n ],
      [ 'setCollateralizationRatio', [ 750n, 100n ] ],
      [ 'payDownRUN', 5n ],
      [ 'checkRUNBalance', 95n ],
      [ 'checkBLDLiened', 400n ]
    ]
  ],
  [
    '9',
    'Extending LoC - unbonded (FAIL)',
    [
      [ 'buyBLD', 1000n ],
      [ 'stakeBLD', 800n ],
      [ 'lienBLD', 800n ],
      [ 'borrowRUN', 100n ],
      [ 'slash', 300n ],
      [ 'checkBLDStaked', 500n ],
      [ 'borrowMoreRUN', 50n, false ],
      [ 'checkRUNBalance', 100n ],
      [ 'checkBLDLiened', 800n ]
    ]
  ],
  [
    '11',
    'Partial repay - unbonded ok',
    [
      [ 'buyBLD', 1000n ],
      [ 'stakeBLD', 800n ],
      [ 'lienBLD', 800n ],
      [ 'borrowRUN', 100n ],
      [ 'slash', 700n ],
      [ 'checkBLDLiened', 800n ],
      [ 'checkRUNBalance', 100n ],
      [ 'payDownRUN', 50n ],
      [ 'checkRUNBalance', 50n ],
      [ 'checkBLDLiened', 800n ],
      [ 'checkBLDStaked', 100n ]
    ]
  ],
  [
    '14',
    'Add collateral - more BLD required (FAIL)',
    [
      [ 'buyBLD', 1000n ],
      [ 'stakeBLD', 1000n ],
      [ 'lienBLD', 800n ],
      [ 'borrowRUN', 100n ],
      [ 'borrowMoreRUN', 200n, false ],
      [ 'checkRUNBalance', 100n ],
      [ 'checkBLDLiened', 800n ]
    ]
  ],
  [
    '15',
    'Lower collateral',
    [
      [ 'buyBLD', 1000n ],
      [ 'stakeBLD', 1000n ],
      [ 'lienBLD', 800n ],
      [ 'borrowRUN', 100n ],
      [ 'unlienBLD', 400n ],
      [ 'checkRUNBalance', 100n ],
      [ 'checkBLDLiened', 400n ]
    ]
  ]
]
