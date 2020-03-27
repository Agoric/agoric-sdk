import harden from '@agoric/harden';

function build(E, log) {
  return harden({
    sendPromiseTo(other) {
      log('=> Alice: sendPromiseTo() begins');
      let resolver;
      const param = new Promise((theResolver, _theRejector) => {
        resolver = theResolver;
      });
      const response = E(other).thisIsYourPromise(param);
      resolver('Alice says hi!');
      response.then(
        r => log(`=> Alice: response to thisIsYourPromise resolved to '${r}'`),
        e => log(`=> Alice: response to thisIsYourPromise rejected as '${e}'`),
      );
      log('=> Alice: sendPromiseTo() done');
      return 'Alice started';
    },
  });
}

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, log),
    helpers.vatID,
  );
}
