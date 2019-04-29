import harden from '@agoric/harden';

console.log(`=> loading bootstrap.js`);

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  log(`=> setup called`);
  return helpers.makeLiveSlots(
    syscall,
    state,
    E =>
      harden({
        async bootstrap(argv, vats) {
          console.log('=> bootstrap() called');

          const BOT_MACHINE_NAME = 'bot';
          const USER_MACHINE_NAME = 'user';
          const BOT_USER_CHANNEL = 'channel';
          const BOT_CLIST_INDEX = 0;

          await E(vats.botcomms).init(BOT_MACHINE_NAME, 'botSigningKey');
          await E(vats.usercomms).init(USER_MACHINE_NAME, 'userSigningKey');

          await E(vats.botcomms).connect(
            USER_MACHINE_NAME,
            'userVerifyingKey',
            BOT_USER_CHANNEL,
          );

          await E(vats.botcomms).addExport(
            USER_MACHINE_NAME,
            BOT_CLIST_INDEX,
            vats.bot,
          );

          await E(vats.usercomms).connect(
            BOT_MACHINE_NAME,
            'botVerifyingKey',
            BOT_USER_CHANNEL,
          ); // channel - means of connection -- all three can collapse into libp2p address

          const pPBot = E(vats.usercomms).addImport(
            BOT_MACHINE_NAME,
            BOT_CLIST_INDEX,
          );
          E(vats.user)
            .talkToBot(pPBot, 'bot')
            .then(
              r =>
                log(
                  `=> the promise given by the call to user.talkToBot resolved to '${r}'`,
                ),
              err =>
                log(
                  `=> the promise given by the call to user.talkToBot was rejected '${err}''`,
                ),
            );
        },
      }),
    helpers.vatID,
  );
}
