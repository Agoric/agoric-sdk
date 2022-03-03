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
      [ 'checkBLDLiened', 8000n ]
    ]
  ]
]
