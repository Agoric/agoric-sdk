import { Far } from '@endo/far';

const start = zcf => {  
    return harden({
      publicFacet: Far('publicFacet', {
        helloWorld(name) {
          console.log(`Hello world from ${name}!`);
          return `Hello world from ${name}!`
        },
      }),
    });
  };
  
  harden(start);
  export { start };