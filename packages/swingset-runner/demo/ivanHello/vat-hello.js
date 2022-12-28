import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

export function buildRootObject() {
  return Far('root', {
    sayHello(name) {
      	console.log(`=> hello.sayHello got the name: ${name}`);
      	return `Hello, ${name}. I returned immediately!`;
    },
    async getResponseAsPromise(response) {
    	const msg = await response
      	console.log(`=> hello.getResponseAsPromise got the reply: ${msg}`);
      	return;    	
    },
    async sayHelloAfterWait(name, timerService, waitLength) {
        const now = await E(timerService).getCurrentTimestamp();
        console.log(`=> sayHelloAfterWait it is now: ${now}`)

        // simple one-shot Promise-based relative delay
        E(timerService)
          .delay(waitLength)
          .then(
            r => console.log(`=> sayHelloAfterWait ${r}`),
            err => console.log(`=> sayHelloAfterWait ${err}`),
          );

        console.log(`=> hello.sayHello got the name: ${name}`);
        return `Hello, ${name}. I waited ${waitLength} seconds!`;
    },
  });
}
