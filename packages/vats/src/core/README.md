# Core vats and supports

This directory contains modules that build vats that boot other vats. If that's all it did, it could terminate but it also has persistent responsibilities:
- hold the `CORE_EVAL` bridge handler (see `bridgeCoreEval` in [chain-behaviors.js](./chain-behaviors.js)
- hold a PrioritySenderManager handed out to some contracts

Bootstrap vats must not hold precious state (see https://github.com/Agoric/agoric-sdk/issues/4548). These state aren't _precious_ because they can be reconstructed.

## Upgrade

The bootstrap vats are not designed to be upgraded in the normal vat upgrade mechanism. In the event that we need to replace a bootstrap vat:

1. spawn a new vat providing a reference to all capabilities of the original bootstrap vat
2. new vat creates a new PrioritySenderManager (maybe made durable), and
   restarts the vats which depended on the previous manager. It does the same if
   there are any other Far objects exported by the original bootstrap vat
3. the old bootstrap is told to unregister it's CORE_EVAL bridge handler
3. the new vat registers a CORE_EVAL bridge handler
4. the new vat shutdowns the old bootstrap vat
