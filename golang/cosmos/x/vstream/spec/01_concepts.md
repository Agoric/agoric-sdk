<!--
order: 1
-->

# Concepts

## Applications

The intent of this module is to provide a primitive for building on-chain
applications with many clients all following a state stream with immutable
history, then those clients independently submit transactions (or other i/o
occurs) to affect the future of the stream.

## Streams

A "stream" is an evolving structure with the following properties:
- Publishing: A single value can be published to a stream at a given time, and becomes part of the "stream cell" of that block.
- Batching: in order to preserve all publications to a stream, if there are more than one publication per block they are captured in order within that block's stream cell.
- History: the stream cell can be queried as of a particular block.  Each cell contains a reference to the previous blockheight with publications (or `0` for the beginning of the stream).
- Only one key per stream: each stream consists of a single KVStore key/value
  entry at a given height.  Stream history is queried via historical queries
  made for the same key at different heights.  So, the on-chain storage
  requirements are only for the latest stream cell at a given height.
- Provable queries: a given block's committed stream cell can be queried with a single provable KVStore query.
- Update events: besides history, a stream also logs an event to indicate to queriers that the stream cell has been updated.

## Consuming

The above stream properties enable several applications:

### Get single latest published value

1. query the stream cell at the current height
2. and extract the last update from that cell's publications list

### Forward iteration (skip to any published future state)

This algorithm is only useful if the published values are complete states (with no data dependencies on other states):

  1. subscribe to stream cell update events to prevent losing future updates
  2. query the current height's stream cell
  3. consume only the last update in the cell
  4. when an update event has arrived, repeat from step 2
### Forward iteration (lossless history)

This algorithm is useful for consuming the entire history of the stream, such as
when the published values are logical deltas that cannot be meaningfully
skipped.  It requires client-side persistent storage of the "last seen" cell
(starting with "none"):

  1. subscribe to stream cell update events to prevent losing future updates
  2. query the current height's stream cell
  3. use the previous blockheight information to issue backward queries for historical states until we reach the "last seen" cell
  4. consume the queried history in chronological order, updating the "last seen" cell as we go
  5. when an update event has arrived, repeat from step 2
### Reverse iteration starting at height

1. query the stream cell at the specified height
2. display the published values for that height in reverse order
3. if the stream cell contains a "last published height", query the stream cell
   and repeat from step 2
### Forward Iteration and Interchain Queries

For forward iteration via an Interchain Query without prohibitively costly
polling, there must be enforcement of two criteria specified by the Querying
chain:
   1. Query height must be later than a specified height.
   2. Query result must not match a specified value.

These compose to ensure the returned stream cell is not the same as the latest seen result, and thus that it represents a forward evolution of the stream.

At the time of this writing, the [draft Interchain Query specification](https://github.com/cosmos/ibc/pull/735)
does not enable the option to enforce those criteria.

## Publish operations

An on-chain publisher of stream values can invoke three possible operations for a given storage key:
- UpdateState; add a new value to the tail of the stream
- Finish: add a terminal value to the tail of the stream and mark it as done to prevent further publications.
- Fail: attach a terminal error to the tail of the stream and mark it as done

It is the responsibility of this module to enforce these update/finish/fail
semantics.
