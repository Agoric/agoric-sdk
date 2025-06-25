test('OfferArgsShapes', t => {
  const cases = harden({
    pass: {
      empty: {},
      eth: { destinationEVMChain: 'Ethereum' },
      avalanche: { destinationEVMChain: 'Avalanche' },
      base: { destinationEVMChain: 'Base' },
      aaveFull: { Aave: { gmpRatio: [1n, 2n], acctRatio: [3n, 4n] } },
      compoundGmp: { Compound: { gmpRatio: [5n, 6n] } },
      usdnOut: { usdnOut: 123n },
      all: {
        destinationEVMChain: 'Ethereum',
        Aave: { gmpRatio: [1n, 2n] },
        Compound: { acctRatio: [3n, 4n] },
        usdnOut: 0n,
      },
      aaveOnlyAcct: { Aave: { acctRatio: [1n, 2n] } },
      compoundBoth: { Compound: { gmpRatio: [1n, 2n], acctRatio: [3n, 4n] } },
    },
    fail: {
      badChain: { destinationEVMChain: 'NotAChain' },
      chainNum: { destinationEVMChain: 123 },
      aaveNotObj: { Aave: 'not an object' },
      aaveNeg: { Aave: { gmpRatio: [1, -2] } },
      compoundStr: { Compound: { acctRatio: ['a', 'b'] } },
      usdnOutNeg: { usdnOut: -1 },
      extraProp: { extra: 1 },
      nullChain: { destinationEVMChain: null },
      aaveShort: { Aave: { gmpRatio: [1n] } },
      compoundZero: { Compound: { gmpRatio: [1n, 0n] } },
      aaveNonTuple: { Aave: { gmpRatio: 1 } },
      compoundNonObj: { Compound: 123 },
    },
  });

  for (const [name, offerArgs] of Object.entries(cases.pass)) {
    t.log(`${name}: ${JSON.stringify(offerArgs)}`);
    t.notThrows(
      () => mustMatch(offerArgs, OfferArgsShapeFor.openPortfolio),
      name,
    );
  }
  for (const [name, offerArgs] of Object.entries(cases.fail)) {
    t.log(`!${name}: ${JSON.stringify(offerArgs)}`);
    t.false(matches(offerArgs, OfferArgsShapeFor.openPortfolio), name);
  }
}); 