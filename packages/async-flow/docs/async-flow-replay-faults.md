# Async Flow Replay Faults

![async flow state diagram](./async-flow-states.png)

The overall picture of these flow states and transitions is explained in [Async Flow States](./async-flow-states.md). This document is only about the handling of replay faults.

 - ***Replaying***. When setting up an async-flow, in addition to the guest function, you can provide an optional replay fault hander. During replay, if the guest fails to exactly reproduce its previously logged behavior, then if there is no replay fault handler, we immediately transition to the ***Failed*** state explained below. But if a replay fault handler was provided, it might repair the fault instead, avoiding a replay failure.

 - ***Failed***. If the guest activation misbehaves during the ***Replaying*** state (by failing to exactly produce its previously logged behavior), it goes into the inactive ***Failed*** state, with a diagnostic explaining how the replay failed, so it can be repaired by another future upgrade. As of the next reincarnation, the failure status is cleared and it starts ***Replaying***, then ***Running*** again, hoping not to fail this time. If replay or running failed because the previous guest async function misbehaved, then to make progress, an upgrade needs to replace the function with one which behaves correctly. The upgrade may also need to create or replace the replay fault handler to cope with replay log entries that are otherwise hard to reproduce.

## Optional Replay Fault Handler

FIXME explain what a replay fault handler looks like, how to register it, how it gets invoked, and what it can do.
