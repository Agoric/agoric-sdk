# Persistence

The ocap community has explored a variety of persistence mechanisms, each with a variety of benefits and limitations.

E (and arguably SmallTalk) provided "orthogonal persistence", in which programmers could pretend their objects lived forever. The runtime engine was responsible for finding a way to serialize those objects such that the hosting process could be shut down and resumed later from disk without the Vat code being aware of the interruption. Live references were severed upon resumption, but this looked just like a network problem (e.g. if the TCP connection got shut down for some reason), which *was* observable to Vat code (`reactToLostClient` in one direction, a broken Promise in the other), which was expected to restart from a `SturdyRef`.

In Javascript, this requires support from the JS engine, as regular code has no way to follow closed-over values, nor to serialize non-function code objects such as closures and Promises.

Without orthogonal persistence, programmers must be more aware of their data model. In fact, they must be aware of it anyway, because of upgrade: replacing the code while retaining the data. Migration of a Vat from one host to another looks a lot like upgrade. We presume that Promises (and iterators and other conveniences) cannot survive an upgrade or migration, so programmers must think far enough ahead to enable occasional mode switches. Programs can use these tools "most of the time", but there must be a way to tell the program to prepare for suspension, at which point it discards the unserializable objects and writes all state out as a well-schematized data. It could either terminate in-flight operations with an error, or wait for these operations to complete naturally before triggering the suspend.

## Checkpoint + Transcript

In the absence of an engine-supported checkpoint (or to handle non-serializable data), we can instead record a transcript of inbound messages, and rely upon the Vat's deterministic operation to get back to the same state without actually recording that state. If it weren't for the unbounded growth of this transcript, and the O(N) cost of re-executing it on restart, (and the fact that it doesn't help us with migration very much), we could use it in lieu of checkpoint support.

One compromise is to use a checkpoint if/when available, and then a partial transcript on the operations that have occurred since that checkpoint. We can treat the checkpoint as a performance optimization that allows us to truncate the transcript. If we get checkpoint support but it only works when the Vat has discarded all non-serializable objects (and has an empty Promise queue, as is the state at the end of each kernel turn), then we can use the transcript to record the state since the last suspend operation (which is defined by having no non-serializable objects at the end of a turn, and which might need to be explicitly triggered). If the suspend operation also stores data into a well-defined schema, then a migration operation can use that data as a starting point.

This leads to each Vat being defined by the following data:

* root object (i.e. the code evaluated in `setup()` at Vat initialization time) (fuzzy)
  (we do not store the root object; changing it constitutes migration)
* the most recent checkpoint (empty at init, possibly still empty)
* the transcript of delivered messages since the last checkpoint

To ensure the Vat's behavior is consistent across restores, we also track an "IO Hash"; a hash chain of deliveries (dispatches) into the Vat and messages (syscalls) made out of the Vat. Each invocation of the Vat's `dispatch` function can make zeror or more syscalls: the contents of each dispatch and syscall are folded into the IO Hash. We append all the dispatches into the transcript, but not the syscalls. When we take a checkpoint, we fold the checkpoint data into the IO hash and clear the transcript. We record the IO hash at that point next to the checkpoint. After all other deliveries, we update the IO hash and record it next to the transcript.

When we want to restore a Vat, we start by unpacking the checkpoint, instantiating the root object, and initializing the IO hash from the value recorded next to the checkpoint (possibly empty if we've never checkpointed). We then deliver the first message from the transcript (updating the hash). For every syscall this triggers, we update the hash, but do not deliver the syscalls into the kernel. We repeat this process until the transcript is empty. At this point, we compare the updated IO hash against the one recorded with the transcript and make sure they are the same. If they differ, the restored Vat did not behave the same as the stored one, and we abort.

## Kernel State

The SwingSet kernel contains some number of Vats and the tables that connect them together. The kernel state contains:

* the state of each Vat
* the runQueue: a list of `dispatch` calls to make to each Vat. The main ones are `deliver` calls (which correspond to method invocations on some target object), which include the target VatID, the facet ID, the arguments, and the answer ResponseID. Other ones include notifyFulfillToData, notifyFulfillToTarget, and notifyReject.
* the import table: a list of which Vats have access to which exports of the other Vats, or to kernel-side Promises
* the promise table: a list of which kernel-side Promises are defined, their current state (unresolved, fulfilled/rejected in various ways), the "decider" Vat for unresolved ones, and the list of Vats currently subscribed to head about state changes

To restore an entire kernel, we must:

* restore the promise, import, and run-queue tables
* for each Vat:
  * restore the Vat's checkpoint, checkpoint IO hash, transcript, and transcript IO hash
  * configure a syscall object to hash the syscalls without actually executing them
  * create the Vat (with the current version of the root object)
  * execute the Vat's setup() function with the hash-only syscall
  * drain the transcript, updating the IO hash as we go
  * compare the IO hash to make sure it matches the transcript IO hash
  * reconfigure the syscall object to hash and execute

Now the kernel should be back in the same state it had before. Every entry in the kernel's import/promise tables should match a Presence or Promise inside the corresponding Vat.

We can execute each Vat's transcript independently: the Vat's state will not depend upon what's happening in the other Vats, and the kernel's state won't depend upon what happens in this particular Vat (since we ignore syscalls during the replay, and compare hashes to make it emits the same syscalls that *were* executed last time).

Since syscalls can return values (e.g. a `send` returns a PromiseID for the answer), our Vat transcript must record these, so the same values can be returned during playback mode.

# more

The kernel's responsibility is to provide a persistence object to each vat userspace. Initially this will have a single get/set(string) pair of methods. Later, this will be more sophisticated, and will support a Merkle tree (of arbitrary arity) in which each child edge is named (or numbered) and either points to anoter node or a string (of JSON) (see IPFS for details). These nodes will provide an API with `has_child(index)`, `get_or_create_child_node(index)`, `delete_child(index)`, `set_child_data(index, data)`, `get_child_data(index)`. The vat gets access to a per-vat root node. By keeping track of which edges are followed by the vat, the kernel learns which data affects the computation, so it can construct an efficient proof for validators (i.e. the contents of every node that was visited, since the nodes contain the hashes of all their children (nodes or data). The only way to modify the tree is through the various set/delete APIs, so the kernel also learns which subset of the new tree data must be included in the proof.

Vat userspace is responsible for only depending upon state that comes from this persistence object, and for updating the persistence object with all state changes. The initial checkpoint+transcript state management approach will just JSON-serialize a list of turns (one dispatch, zero or more syscalls) and store the string into the initial get/set persistence object. We only actually need the results of the syscalls, but we store the full contents to double-check that the new code behaves the same way as the old code did.
