# proposal for vat-localchain to support address hooks for MsgSend

In localchain, if MsgSend.recipient is a hooked address, it is decoded and the baseAddress receives the deposit. After any `MsgSend` deposit, localchain invokes the (newly endowed) vtransferBridgeManager to notify the recipient's transfer monitor, if there is one.

Because this runs before `n:upgrade-next` its base image isn't a build of the local agoric-sdk. So it can't use `yarn link` to get `@agoric` packages from the source tree. Instead it sources the packages from NPM using `dev` to get the latest master builds.
