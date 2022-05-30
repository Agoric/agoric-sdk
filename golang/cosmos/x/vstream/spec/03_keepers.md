<!--
order: 3
-->

# Keeper

The vstream module provides this exported keeper interface that can be passed to
other modules that publish streams.

## StreamKeeper

The vstream Keeper implements StreamKeeper, which is intended for broader reuse
by other keepers:

```go
// StreamKeeper defines an interface that allows streaming to an arbitrary State
// object.  It does not rely on any implicit keeper state.
type StreamKeeper interface {
	StreamUpdate(sdk sdk.Context, state types.State, value []byte) error
	StreamFinish(sdk sdk.Context, state types.State, value []byte) error
	StreamFailure(sdk sdk.Context, state types.State, failure error) error
}
```

## StorageStreamKeeper

The vstream Keeper implements StorageStreamKeeper, which is for compatibility
with the vstorage keeper:

```go
// StorageStreamKeeper defines an interface that allows streaming via a vstorage
// path.
type StorageStreamKeeper interface {
	StorageStreamUpdate(sdk sdk.Context, path string, value string) error
	StorageStreamFinish(sdk sdk.Context, path string, value string) error
	StorageStreamFailure(sdk sdk.Context, path string, err error) error
}
```
