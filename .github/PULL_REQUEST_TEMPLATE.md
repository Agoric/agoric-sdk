<!-- < < < < < < < < < < < < < < < < < < < < < < < < < < < < < < < < < ☺
v                               ✰  Thanks for creating a PR! ✰
☺ > > > > > > > > > > > > > > > > > > > > > > > > > > > > > > > > >  -->

<!-- Integration testing generally doesn't run until a PR is labeled for merge, but can be opted into for every push by adding label 'force:integration', and can be customized to use non-default external targets by including lines here that **start** with leading-`#` directives:
* (https://github.com/Agoric/documentation) #documentation-branch: $BRANCH_NAME
* (https://github.com/endojs/endo) #endo-branch: $BRANCH_NAME
* (https://github.com/Agoric/dapp-offer-up) #getting-started-branch: $BRANCH_NAME
* (https://github.com/Agoric/testnet-load-generator) #loadgen-branch: $BRANCH_NAME

These directives should be removed before adding a merge label, so final integration tests run against default targets.
-->

<!-- Most PRs should close a specific issue. All PRs should at least reference one or more issues. Edit and/or delete the following lines as appropriate (note: you don't need both `refs` and `closes` for the same one): -->

closes: #XXXX
refs: #XXXX

## Description
<!-- Add a description of the changes that this PR introduces and the files that are the most critical to review. -->

### Security Considerations
<!-- Does this change introduce new assumptions or dependencies that, if violated, could introduce security vulnerabilities? How does this PR change the boundaries between mutually-suspicious components? What new authorities are introduced by this change, perhaps by new API calls? -->

### Scaling Considerations
<!-- Does this change require or encourage significant increase in consumption of CPU cycles, RAM, on-chain storage, message exchanges, or other scarce resources? If so, can that be prevented or mitigated? -->

### Documentation Considerations
<!-- Give our docs folks some hints about what needs to be described to downstream users.  Backwards compatibility: what happens to existing data or deployments when this code is shipped? Do we need to instruct users to do something to upgrade their saved data? If there is no upgrade path possible, how bad will that be for users? -->

### Testing Considerations
<!-- Every PR should of course come with tests of its own functionality. What additional tests are still needed beyond those unit tests? How does this affect CI, other test automation, or the testnet? -->

### Upgrade Considerations
<!-- What aspects of this PR are relevant to upgrading live production systems, and how should they be addressed? What steps should be followed to verify that its changes have been included in a release (ollinet/emerynet/mainnet/etc.) and work successfully there? If the process is elaborate, consider adding a script to scripts/verification/. -->
