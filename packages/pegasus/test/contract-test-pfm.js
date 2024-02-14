import { Far } from '@endo/far';

const start = zcf => {
    return harden({
        publicFacet: Far('publicFacet', {
            helloWorld(args) {
                return `Hello world from ${args.name} with funds ${args.funds}!`
            },
        }),
    });
};

harden(start);
export { start };