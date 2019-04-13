import harden from '@agoric/harden';

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  return helpers.makeLiveSlots(
    syscall,
    state,
    E =>
      harden({
        talkToBot(vat, botName) {
          log(`=> user.talkToBot is called with ${botName}`);
          E(vat)
            .affirmMe('hello')
            .then(myAffirmation =>
              log(`=> user receives the affirmation: ${myAffirmation}`),
            );
          return 'Thanks for the setup. I sure hope I get some affirmation...';
        },
      }),
    helpers.vatID,
  );
}
