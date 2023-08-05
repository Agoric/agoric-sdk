# Base Zone Library

Each Zone provides an API that allows the allocation of [Exo objects](https://github.com/endojs/endo/tree/master/packages/exo#readme) and [Stores
(object collections)](../store/README.md) which use the same underlying persistence mechanism.  This
allows library code to be agnostic to whether its objects are backed purely by
the JS heap (ephemeral), pageable out to disk (virtual) or can be revived after
a vat upgrade (durable).

This library is used internally by [`@agoric/zone`](../zone/README.md); refer to it for more details.  Unless you are an author of a new Zone backing store type, or want to use `makeHeapZone` without introducing build dependencies on `@agoric/vat-data`, you should instead use `@agoric/zone`.
