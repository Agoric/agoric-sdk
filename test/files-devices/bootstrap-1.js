const harden = require('@agoric/harden');

export default function setup(syscall, state, helpers, _devices) {
  const { log } = helpers;
  let deviceRef;
  const dispatch = harden({
    deliver(facetid, method, argsbytes, caps, _resolverID) {
      if (method === 'bootstrap') {
        const { args } = JSON.parse(argsbytes);
        const deviceIndex = args[2].d1.index;
        deviceRef = caps[deviceIndex];
        if (deviceRef !== 'd-70') {
          throw new Error(`bad deviceRef ${deviceRef}`);
        }
      } else if (method === 'step1') {
        console.log('in step1');
        log(`callNow`);
        const ret = syscall.callNow(deviceRef, 'set', '{}', []);
        log(JSON.stringify(ret));
      }
    },
  });
  return dispatch;
}
