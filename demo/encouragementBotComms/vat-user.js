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
        talkToBot(pbot, botName) {
          log(`=> user.talkToBot is called with ${botName}`);
          E(pbot)
            .encourageMe('user')
            .then(myEncouragement =>
              log(`=> user receives the encouragement: ${myEncouragement}`),
            );
          return 'Thanks for the setup. I sure hope I get some encouragement...';
        },
      }),
    helpers.vatID,
  );
}
