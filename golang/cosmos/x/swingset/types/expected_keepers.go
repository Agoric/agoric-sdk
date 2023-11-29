package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
)

type SmartWalletState uint8

const (
	SmartWalletStateUnspecified SmartWalletState = iota
	SmartWalletStateNone
	SmartWalletStatePending
	SmartWalletStateProvisioned
)

type AccountKeeper interface {
	GetAccount(ctx sdk.Context, addr sdk.AccAddress) authtypes.AccountI
	NewAccountWithAddress(ctx sdk.Context, addr sdk.AccAddress) authtypes.AccountI
	SetAccount(ctx sdk.Context, acc authtypes.AccountI)
}

type SwingSetKeeper interface {
	GetBeansPerUnit(ctx sdk.Context) map[string]sdk.Uint
	ChargeBeans(ctx sdk.Context, addr sdk.AccAddress, beans sdk.Uint) error
	IsHighPriorityAddress(ctx sdk.Context, addr sdk.AccAddress) (bool, error)
	GetSmartWalletState(ctx sdk.Context, addr sdk.AccAddress) (SmartWalletState, error)
	ChargeForSmartWallet(ctx sdk.Context, addr sdk.AccAddress) error
}
