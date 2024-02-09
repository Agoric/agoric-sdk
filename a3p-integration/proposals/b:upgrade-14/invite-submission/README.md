These files enable a test of the walletFactory changes in upgrade-14, by
verifying that upgraded wallets that aren't backed by vbanks can still add
assets, in this case an invitation.

sendInvite is a secondary submission, which is included in ./invite-submission.
The wallet in which we want to deposit the invitation is gov1, whose address
isn't known until run-time. When submitting a proposal using agd.tx(), the
proposal is required to be in a file, so we have to edit a template file
(sendInvite.template.js) to produce the .js file that will be submitted.

The core-eval is invoked from the test, which then verifies that the details
<<<<<<< HEAD:a3p-integration/proposals/b:upgrade-14/invite-submission/README.md
were written to vstorage.
=======
were written to vstorage.
>>>>>>> d46546de4 (chore: helpful suggestions from review):a3p-integration/proposals/a:upgrade-14/invite-submission/README.md
