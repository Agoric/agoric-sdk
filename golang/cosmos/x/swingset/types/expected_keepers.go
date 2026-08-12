//go:generate mockgen -source=expected_keepers.go -destination=../testutil/mocks.go -package=testutil

package types

import (
	"context"

	sdkmath "cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"

	agoric "github.com/Agoric/agoric-sdk/golang/cosmos/types"
)

type SmartWalletState uint8

const (
	SmartWalletStateUnspecified SmartWalletState = iota
	SmartWalletStateNone
	SmartWalletStatePending
	SmartWalletStateProvisioned
)

// AccountKeeper defines the expected interface for the auth module keeper
type AccountKeeper interface {
	GetAccount(ctx context.Context, addr sdk.AccAddress) sdk.AccountI
	NewAccountWithAddress(ctx context.Context, addr sdk.AccAddress) sdk.AccountI
	SetAccount(ctx context.Context, acc sdk.AccountI)
}

// BankKeeper defines the expected interface for the bank module keeper
type BankKeeper interface {
	GetAllBalances(ctx context.Context, addr sdk.AccAddress) sdk.Coins
	GetBalance(ctx context.Context, addr sdk.AccAddress, denom string) sdk.Coin
}

// VstorageKeeper defines the expected interface for the vstorage module keeper
type VstorageKeeper interface {
	PushQueueItem(ctx sdk.Context, path string, value string) error
	HasEntry(ctx sdk.Context, path string) bool
	GetQueueLength(ctx sdk.Context, path string) (sdkmath.Int, error)
	GetEntry(ctx sdk.Context, path string) agoric.KVEntry
	SetStorage(ctx sdk.Context, entry agoric.KVEntry)
	LegacySetStorageAndNotify(ctx sdk.Context, entry agoric.KVEntry)
	PathToEncodedKey(path string) []byte
	GetStoreName() string
	GetChildren(ctx sdk.Context, path string) []string
}

type SwingSetKeeper interface {
	IsHighPriorityAddress(ctx sdk.Context, addr sdk.AccAddress) (bool, error)
	GetSmartWalletState(ctx sdk.Context, addr sdk.AccAddress) SmartWalletState
}
