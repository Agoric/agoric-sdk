# Virtual Storage

This module manages "[IAVL](https://github.com/cosmos/iavl)" chain storage data with a hierarchical keyspace in which each key is a "[path](./types/path_keys.go)" composed of zero or more dot-separated nonempty segments in a restricted alphabet. It exposes gRPC endpoints to arbitrary external clients for reading data, and internal read/write interfaces for use by SwingSet (which itself manages further subtree-scoped attenuation).

## Internal Go interface

[Keeper](./keeper/keeper.go)
* generic
  * GetChildren
  * GetEntry
  * HasEntry
  * HasStorage
  * SetStorage[AndNotify]
* StreamCell-oriented (a StreamCell captures a block height and an array of values)
  * AppendStorageValue[AndNotify]
* queue-oriented (a queue stores items at paths like "$prefix.$n", documenting
  the n for the next item to be consumed at "$prefix.head" and the n for the next
  next item to be pushed at "$prefix.tail" such that the queue is empty when both
  head and tail store the same n)
  * GetQueueLength
  * PushQueueItem

## Internal JSON interface

This is used by the SwingSet "bridge".

[Receive](./vstorage.go) with input `{ "method": "...", "args": [...] }`
* generic
  * method "entries", args path
  * method "get"/"has", args path
  * method "set"/"setWithoutNotify", args [[path, value?], ...]
  * method "children", args path
  * method "values", args path (returns values for children in the same order as method "children")
  * method "size", args path (returns the count of children)
* StreamCell-oriented
  * method "append", args [[path, value?], ...]

## External protobuf interface

gRPC via [Querier](./keeper/keeper.go)
and CometBFT method "abci_query" with params `{ "path": "/agoric.vstorage.Query/...", "data": "<hexadecimal representation of serialized protobuf>" }` via the same
* /agoric.vstorage.Query/CapData
* /agoric.vstorage.Query/Children
* /agoric.vstorage.Query/Data

## Arbitrary-response HTTP interface

This depends upon appModule `LegacyQuerierHandler` functionality that is [removed from cosmos-sdk as of v0.47](https://github.com/cosmos/cosmos-sdk/blob/fa4d87ef7e6d87aaccc94c337ffd2fe90fcb7a9d/CHANGELOG.md#api-breaking-changes-3)

[legacy querier](./keeper/querier.go)
* /custom/vstorage/children/$path
* /custom/vstorage/data/$path
