import { Far } from '@endo/marshal';

export function buildRootObject(_vatPowers, _vatParameters, baggage) {
  console.log(`busy vat initializing`);
  baggage.init('someKey', 'hello');
  return Far('root', {
    doStuff(howMuch) {
      let n = 2.0;
      for (let i = 0; i <= howMuch; i += 1) {
        n = Math.sqrt(n) * Math.sqrt(n); // introduce some computational drag
        if (i % 10_000_000 === 0) {
          let bv = 'no baggage';
          if (baggage) {
            bv = baggage.get('someKey');
          }
          console.log(`busy vat doing step ${i} of ${howMuch}, bv=${bv}`);
        }
      }
      console.log(`busy vat finished ${howMuch} steps`);
    },
  });
}
