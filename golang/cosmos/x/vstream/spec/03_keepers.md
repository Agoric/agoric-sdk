<!--
order: 3
-->

# Keeper

The vstream module provides this exported keeper interface that can be passed to
other modules that publish streams.

## StreamKeeper

The vstream Keeper implements Streamer, which is intended for broader reuse
by other keepers who want to manage their own state references:

```go
// An interface to allow updating KVStore-backed state and extracting proof
// parameters.
type StateRef interface {
	Read(ctx sdk.Context) ([]byte, error)
	Write(ctx sdk.Context, value []byte) error
	Exists(ctx sdk.Context) bool
	StoreName() string
	StoreSubkey() []byte
	String() string
}

// Streamer defines an interface that allows streaming using an arbitrary StateRef.
type Streamer interface {
	StreamUpdate(sdk sdk.Context, state StateRef, value []byte) error
	StreamFinish(sdk sdk.Context, state StateRef, value []byte) error
	StreamFailure(sdk sdk.Context, state StateRef, failure []byte) error
}
```

## StorageStreamKeeper

The vstream Keeper implements StorageStreamKeeper, which updates state in an
underlying vstorage Keeper:

```go
// StorageStreamKeeper defines an interface that allows streaming via a vstorage
// path.
type StorageStreamKeeper interface {
	StorageStreamUpdate(sdk sdk.Context, path string, value string) error
	StorageStreamFinish(sdk sdk.Context, path string, value string) error
	StorageStreamFailure(sdk sdk.Context, path string, failure string) error
}
```
