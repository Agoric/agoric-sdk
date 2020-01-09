import { test } from 'tape-promise/tape';

import { makeMint } from '../../../core/mint';

import { makeCoreMintKeeper } from '../../../core/config/coreMintKeeper';

test('makeMint with no config', t => {
  t.plan(1);
  
  const mint = makeMint('test');
  const purse = mint.mint(mint.getAssay().makeUnits(1000));
  
  t.equal(purse.getBalance().extent, 1000);
});


// This tests calling makeMint with a partial config
// Right now, partial configs throw
// In the future (https://github.com/Agoric/agoric-sdk/issues/324), partial configs 
// will be completed by makeMint
test('makeMint with partial config', t => {
  t.plan(1);

  function makeMintTrait(_coreMint) {
    return {
      get37: () => 37,
    };
  }
  
  t.throws( () => {
    const mint = makeMint('test', {makeMintTrait});
  })
})

function completeConfig(partialConfig){
  return {
    makeAssayTrait: makeMintContext => self => { return {} },
    makePaymentTrait: makeMintContext => self => { return {} },
    makePurseTrait: makeMintContext => self => { return {} },
    makeMintTrait: makeMintContext => self => { return {} },
    makeMintKeeper: makeCoreMintKeeper,
    extentOpsName: 'natExtentOps',
    extentOpsArgs: [],
    ...partialConfig
  }
}


test('makeMint with specific makePaymentTrait config', t => {
  t.plan(2);

  function makePaymentTrait(makeMintContext){
    return corePayment => ({
      get37: () => 37,
    });
  }
  
  const mint = makeMint('test', completeConfig({makePaymentTrait}));
  const purse = mint.mint(12);
  const payment = purse.withdrawAll()

  t.equals(payment.getBalance().extent, 12)
  t.equals(payment.get37(), 37)
})


test('makeMint with specific makePurseTrait config', t => {
  t.plan(2);

  function makePurseTrait(makeMintContext){
    return corePurse => ({
      get37: () => 37,
    });
  }
  
  const mint = makeMint('test', completeConfig({makePurseTrait}));
  const purse = mint.mint(13);

  t.equals(purse.getBalance().extent, 13)
  t.equals(purse.get37(), 37)
})


test('makeMint with specific makeMintTrait config', t => {
  t.plan(2);

  function makeMintTrait(makeMintContext){
    return coreMint => ({
      get37: () => 37,
    });
  }
  
  const mint = makeMint('test bloublou', completeConfig({makeMintTrait}));

  t.equals(mint.getAssay().getLabel().allegedName, 'test bloublou')
  t.equals(mint.get37(), 37)
})


test('makeMint with specific makeAssayTrait config', t => {
  t.plan(2);

  function makeAssayTrait(makeMintContext){
    return coreAssay => ({
      get37: () => 37,
    });
  }
  
  const mint = makeMint('test bloublou', completeConfig({makeAssayTrait}));
  const assay = mint.getAssay()

  t.equals(assay.getLabel().allegedName, 'test bloublou')
  t.equals(assay.get37(), 37)
})


// no clue how to write a test about makeMintKeeper

