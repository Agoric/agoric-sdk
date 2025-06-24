# proposal for vat-localchain to support address hooks for MsgSend

Gives localchain MsgSend.recipient is decoded if it's a hooked address, and the
baseAddress receives the deposit.  After the deposit, localchain invokes the
(newly endowed) vtransferBridgeManager to notify the baseAddress's transfer
monitor, if there is one.

Because this runs before `n:upgrade-next` its base image isn't a build of the local agoric-sdk. So it can't use `yarn link` to get `@agoric` packages from the source tree. Instead it sources the packages from NPM using `dev` to get the latest master builds.
