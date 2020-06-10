import harden from '@agoric/harden';

import { makeMailboxAdmin } from './lib-mailbox';

function build(_log) {
  let mailboxAdmin;

  const startup = board => {
    mailboxAdmin = makeMailboxAdmin(board);
    return mailboxAdmin;
  };

  return harden({
    startup,
    getMailboxAdmin: () => mailboxAdmin,
  });
}

export default function setup(syscall, state, helpers) {
  return helpers.makeLiveSlots(
    syscall,
    state,
    _E => build(helpers.log),
    helpers.vatID,
  );
}
