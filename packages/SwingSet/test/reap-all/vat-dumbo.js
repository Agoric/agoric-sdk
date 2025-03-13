import { Far } from '@endo/far';
import { defineKind } from '@agoric/vat-data';

export function buildRootObject() {
  const makeHolder = defineKind('holder', thing => ({ thing }), {});

  return Far('root', {
    doSomething(msg) {
      console.log(`doSomething: ${msg}`);
    },

    async makeHolder(objP) {
      const obj = await objP;
      return makeHolder(obj);
    },
  });
}
