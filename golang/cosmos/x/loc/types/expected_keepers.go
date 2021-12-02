package types

import (
	lienTypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/types"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

type BankKeeper interface {
	GetBalance(ctx sdk.Context, addr sdk.AccAddress, denom string) sdk.Coins
}

type LienKeeper interface {
	BondDenom(ctx sdk.Context) string
	SetLien(ctx sdk.Context, addr sdk.AccAddress, lien lienTypes.Lien)
}
