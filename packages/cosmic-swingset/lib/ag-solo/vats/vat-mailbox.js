import harden from '@agoric/harden';
import { makeRegistrar } from '@agoric/registrar';
import { E } from '@agoric/eventual-send';
import { assert } from '@agoric/assert';

function build(_log) {
  const mailboxRegistry = makeRegistrar();

  const mailboxAdmin = harden({
    makeMailbox: (mailboxPrefix, purse, action = 'deposit') => {
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
      const key = mailboxRegistry.register(mailboxPrefix, mailbox);
      return key;
    },
    sendPayment: (mailboxKey, payment) => {
      const mailbox = mailboxRegistry.get(mailboxKey);
      return mailbox.receivePayment(payment);
    },
    // We deliberately do not expose the entire registry so that the
    // only way someone can send a payment using a mailbox is if they
    // have obtained the key. This is intended only to cut down on
    // spam. The key should not be assumed to be unforgeable or unguessable.
  });

  return harden({
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
