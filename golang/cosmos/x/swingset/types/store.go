package types

import (
	"bytes"
	"io"

	prefixstore "github.com/cosmos/cosmos-sdk/store/prefix"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
)

var (
	// SwingStoreValueSuffix is the null byte appended to all SwingStore values
	// before writing them in the underlying KVStore. This allows accepting nil
	// values, which are expected of the JS swing-store but disallowed by a
	// normal KVStore.
	SwingStoreValueSuffix = []byte{0}
)

var _ storetypes.KVStore = SwingStore{}

// SwingStore wraps a KVStore, possibly prefixed, allowing nil values.
// It does so by appending a null byte to all values before writing them in the
// parent store, and stripping a trailing byte when reading values from the
// parent store.
type SwingStore struct {
	parent storetypes.KVStore
}

// NewSwingStore creates a SwingStore from a given KVStore and an optional prefix
func NewSwingStore(parent storetypes.KVStore, prefix []byte) SwingStore {
	if prefix != nil {
		parent = prefixstore.NewStore(parent, prefix)
	}
	return SwingStore{parent}
}

// GetStoreType implements the Store interface
func (s SwingStore) GetStoreType() storetypes.StoreType {
	return s.parent.GetStoreType()
}

// CacheWrap satisfies the CacheWrap interface
// This is not implemented as SwingStore allows nil values
func (s SwingStore) CacheWrap() storetypes.CacheWrap {
	panic("not implemented")
}

// CacheWrapWithTrace satisfies the KVStore interface.
// This is not implemented as SwingStore allows nil values
func (s SwingStore) CacheWrapWithTrace(w io.Writer, tc storetypes.TraceContext) storetypes.CacheWrap {
	panic("not implemented")
}

// CacheWrapWithListeners satisfies the CacheWrapper interface.
// This is not implemented as SwingStore allows nil values
func (s SwingStore) CacheWrapWithListeners(storeKey storetypes.StoreKey, listeners []storetypes.WriteListener) storetypes.CacheWrap {
	panic("not implemented")
}

// Get implements the KVStore interface
// the return value may be nil
func (s SwingStore) Get(key []byte) []byte {
	res := s.parent.Get(key)
	if !bytes.HasSuffix(res, SwingStoreValueSuffix) {
		panic("invalid value found by swingset store")
	}
	return res[:len(res)-1]
}

// Has implements the KVStore interface
func (s SwingStore) Has(key []byte) bool {
	return s.parent.Has(key)
}

// Set implements the KVStore interface
// the value may be nil
func (s SwingStore) Set(key, value []byte) {
	storetypes.AssertValidKey(key)

	bz := bytes.Join([][]byte{value, SwingStoreValueSuffix}, []byte{})
	s.parent.Set(key, bz)
}

// Delete implements the KVStore interface
func (s SwingStore) Delete(key []byte) {
	s.parent.Delete(key)
}

// Iterator implements the KVStore interface
func (s SwingStore) Iterator(start, end []byte) storetypes.Iterator {
	iter := s.parent.Iterator(start, end)

	return newStoreIterator(iter)
}

// ReverseIterator implements the KVStore interface
func (s SwingStore) ReverseIterator(start, end []byte) storetypes.Iterator {
	iter := s.parent.ReverseIterator(start, end)

	return newStoreIterator(iter)
}

var _ storetypes.Iterator = (*storeIterator)(nil)

type storeIterator struct {
	iter storetypes.Iterator
}

func newStoreIterator(parent storetypes.Iterator) *storeIterator {
	return &storeIterator{
		iter: parent,
	}
}

// Domain implements the Iterator interface
func (si *storeIterator) Domain() ([]byte, []byte) {
	return si.iter.Domain()
}

// Valid implements the Iterator interface
func (si *storeIterator) Valid() bool {
	return si.iter.Valid()
}

// Next implements the Iterator interface
func (si *storeIterator) Next() {
	si.iter.Next()
}

// Key implements the Iterator interface
func (si *storeIterator) Key() []byte {
	return si.iter.Key()
}

// Value implements the Iterator interface
// the return value may be nil
func (si *storeIterator) Value() []byte {
	val := si.iter.Value()

	if !bytes.HasSuffix(val, SwingStoreValueSuffix) {
		panic("invalid value found by swingset storeIterator")
	}

	return val[:len(val)-1]
}

// Close implements the Iterator interface
func (si *storeIterator) Close() error {
	return si.iter.Close()
}

// Error implements the Iterator interface
func (si *storeIterator) Error() error {
	return si.iter.Error()
}
