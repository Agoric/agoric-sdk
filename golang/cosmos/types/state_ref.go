package types

import (
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

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

type KVStoreStateRef struct {
	storeKey sdk.StoreKey
	subkey   []byte
}

var _ StateRef = KVStoreStateRef{}

func NewKVStoreStateRef(storeKey sdk.StoreKey, subkey []byte) *KVStoreStateRef {
	return &KVStoreStateRef{storeKey, subkey}
}

func (s KVStoreStateRef) Read(ctx sdk.Context) ([]byte, error) {
	store := ctx.KVStore(s.storeKey)
	return store.Get(s.subkey), nil
}

func (s KVStoreStateRef) Write(ctx sdk.Context, value []byte) error {
	store := ctx.KVStore(s.storeKey)
	store.Set(s.subkey, value)
	return nil
}

func (s KVStoreStateRef) Exists(ctx sdk.Context) bool {
	store := ctx.KVStore(s.storeKey)
	return store.Has(s.subkey)
}

func (s KVStoreStateRef) StoreName() string {
	return s.storeKey.Name()
}

func (s KVStoreStateRef) StoreSubkey() []byte {
	return s.subkey
}

func (s KVStoreStateRef) String() string {
	return fmt.Sprintf("KVStoreStateRef{%s, %s}", s.storeKey.Name(), s.subkey)
}
