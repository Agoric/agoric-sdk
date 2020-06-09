import harden from '@agoric/harden';
import { E } from '@agoric/eventual-send';
import { assert } from '@agoric/assert';

function build(_log) {
  let mailboxAdmin;

  const startup = board => {
    mailboxAdmin = harden({
      makeMailbox: (purse, action = 'deposit') => {
        assert.typeof(action, 'string');
        const mailbox = harden({
          receivePayment: payment => {
            switch (action) {
              case 'deposit': {
                return E(purse).deposit(payment);
              }
              default: {
                throw new Error(`action ${action} is not implemented`);
              }
            }
          },
        });
        return E(board).getId(mailbox);
      },
      sendPayment: async (mailboxId, payment) => {
        return E(board)
          .getValue(mailboxId)
          .then(mailbox => mailbox.receivePayment(payment));
      },
    });
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
