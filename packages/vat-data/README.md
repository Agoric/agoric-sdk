# Agoric Vat Data

This package provides access to the Vat Data facility.

## Overview

A [**vat**](https://docs.agoric.com/glossary/#vat) is a unit of isolation. Objects and functions inside the same JavaScript vat can communicate synchronously with one another. Vats and their contents can communicate with other vats and their objects and functions, but can only communicate asynchronously.

This package provides functions that can persist data in different **zones**:

- heap (holds memory, lost on vat termination)
- virtual (can be paged out, lost on vat termination)
- durable (can be paged out, can persist through vat termination and restart)

The kinds defined by the [`prepare*` functions](https://github.com/endojs/endo/blob/master/packages/exo/docs/exo-taxonomy.md#makedefine-vs-prepare) (e.g. `prepareExo`) must be available before their data is accessed. Understanding this life cycle requires a couple more concepts:

<!-- TODO include these terms in the glossary -->

A **turn** is everything that happens between an empty stack and the next empty stack, for a given vat.

A **crank** is everything that happens from an empty stack and promise queue to the next empty stack and promise queue.

When a vat is restarted, all previous Kinds must be defined in the first crank. To understand why, consider an alternative scenario where restoration depends upon external deliveries prompting a second crank. The vat would need to somehow enter a suspended state where no deliveries other than the ones needed for completion of start are handled. That would expose other vats to side effects, so the restart/upgrade could never be fully unwound if it fails.

## Tips

### Synchronous makers

The durable kind maker functions are synchronous. When converting a maker that is async, you'll have to ensure that all necessary data is already available and need not be awaited in the vat's `prepare`.

The reason for this constraint is that _all prepares happen in the first crank_ of the event loop.

Once the successor vat-incarnation comes online, a message may arrive for any exo instance that a previous vat-incarnation exported to another vat. For that instance to properly react to such an incoming message, implementation code must have already been defined for its Kind. Data persists across vat-incarnations, but code does not.

The successor vat-incarnation must give all outstanding exos their behaviors during the first crank, because that is guaranteed to happen before they receive any messages.
