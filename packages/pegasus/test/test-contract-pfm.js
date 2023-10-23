import { Far } from '@endo/far';

const start = zcf => {  
    return harden({
      publicFacet: Far('publicFacet', {
        helloWorld() {
          console.log('Hello world from the PFM!');
          return 'Hello world from the PFM!'
        },
      }),
    });
  };
  
  harden(start);
  export { start };