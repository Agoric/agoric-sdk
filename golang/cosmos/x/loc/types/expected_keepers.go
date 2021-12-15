package types

import (
	lienTypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/types"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

type BankKeeper interface {
	BurnCoins(ctx sdk.Context, moduleName string, amt sdk.Coins) error
	GetBalance(ctx sdk.Context, addr sdk.AccAddress, denom string) sdk.Coins
	MintCoins(ctx sdk.Context, moduleName string, amt sdk.Coins) error
	SendCoinsFromAccountToModule(ctx sdk.Context, senderAddr sdk.AccAddress, recipientModule string, amt sdk.Coins) error
	SendCoinsFromModuleToAccount(ctx sdk.Context, senderModule string, recipientAddr sdk.AccAddress, amt sdk.Coins) error
}

type LienKeeper interface {
	BondDenom(ctx sdk.Context) string
	GetAccountState(ctx sdk.Context, addr sdk.AccAddress) lienTypes.AccountState
	SetLien(ctx sdk.Context, addr sdk.AccAddress, lien lienTypes.Lien)
	UpdateLien(ctx sdk.Context, addr sdk.AccAddress, newLien lienTypes.Lien) error
}
