package types

import (
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"

	agoric "github.com/Agoric/agoric-sdk/golang/cosmos/types"
)

type PathKeeper interface {
	GetData(ctx sdk.Context, path string) string
	HasStorage(ctx sdk.Context, path string) bool
	LegacySetStorageAndNotify(ctx sdk.Context, path string, value string)
	PathToEncodedKey(path string) []byte
	GetStoreName() string
}

type StoragePathStateRef struct {
	keeper PathKeeper
	path   string
}

var _ agoric.StateRef = StoragePathStateRef{}

func NewStoragePathStateRef(pathKeeper PathKeeper, path string) *StoragePathStateRef {
	return &StoragePathStateRef{pathKeeper, path}
}

func (s StoragePathStateRef) Read(ctx sdk.Context) ([]byte, error) {
	data := s.keeper.GetData(ctx, s.path)
	return []byte(data), nil
}

func (s StoragePathStateRef) Write(ctx sdk.Context, value []byte) error {
	// Use a backwards-compatible store+notify.
	s.keeper.LegacySetStorageAndNotify(ctx, s.path, string(value))
	return nil
}

func (s StoragePathStateRef) Exists(ctx sdk.Context) bool {
	return s.keeper.HasStorage(ctx, s.path)
}

func (s StoragePathStateRef) StoreName() string {
	return s.keeper.GetStoreName()
}

func (s StoragePathStateRef) StoreSubkey() []byte {
	return s.keeper.PathToEncodedKey(s.path)
}

func (s StoragePathStateRef) String() string {
	return fmt.Sprintf("PathStateRef{%T, %s}", s.keeper, s.path)
}
