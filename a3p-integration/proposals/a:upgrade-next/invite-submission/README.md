These files enable a test of the walletFactory changes, by
verifying that upgraded wallets that aren't backed by vbanks can still add
assets, in this case an invitation.

sendInvite is a secondary submission, which is transmitted in ../wallet-repair.test.js.
Some template values in the `.tjs` file are replaced before submitting the
core-eval. The test then verifies that the invitation details were written to
the wallet in vstorage.
