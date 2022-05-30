package types

import (
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

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

type VstorageStateRef struct {
	keeper vstorage.Keeper
	path   string
}

var _ StateRef = VstorageStateRef{}

func NewVstorageStateRef(vstorageKeeper vstorage.Keeper, path string) *VstorageStateRef {
	return &VstorageStateRef{vstorageKeeper, path}
}

func (s VstorageStateRef) Read(ctx sdk.Context) ([]byte, error) {
	data := s.keeper.GetData(ctx, s.path)
	return []byte(data), nil
}

func (s VstorageStateRef) Write(ctx sdk.Context, value []byte) error {
	// Use a backwards-compatible store+notify.
	s.keeper.LegacySetStorageAndNotify(ctx, s.path, string(value))
	return nil
}

func (s VstorageStateRef) Exists(ctx sdk.Context) bool {
	return s.keeper.HasStorage(ctx, s.path)
}

func (s VstorageStateRef) StoreName() string {
	return s.keeper.GetStoreName()
}

func (s VstorageStateRef) StoreSubkey() []byte {
	return s.keeper.PathToEncodedKey(s.path)
}

func (s VstorageStateRef) String() string {
	return fmt.Sprintf("VstorageStateRef{%T, %s}", s.keeper, s.path)
}
